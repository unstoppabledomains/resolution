import { EthereumNamingService } from './EthereumNamingService';
import { ReaderMap, isNullAddress, NullAddress } from './types';
import { default as proxyReaderAbi } from './cns/contract/proxyReader';
import { default as resolverInterface } from './cns/contract/resolver';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import ICnsReader, { Data } from './cns/ICnsReader';
import CnsProxyReader from './cns/CnsProxyReader';
import CnsRegistryReader from './cns/CnsRegistryReader';
import Contract from './utils/contract';
import standardKeys from './utils/standardKeys';
import { getStartingBlock, isLegacyResolver, ensureRecordPresence } from './utils';
import {
  SourceDefinition,
  NamingServiceName,
  ResolutionResponse,
} from './publicTypes';
import { isValidTwitterSignature } from './utils/TwitterSignatureValidator';

const ReaderMap: ReaderMap = {
  1: '0x7ea9ee21077f84339eda9c80048ec6db678642b1',
  42: '0xcf4318918fd18aca9bdc11445c01fbada4b448e3', // for internal testing
};

export default class Cns extends EthereumNamingService {
  readonly contract: Contract;
  reader: ICnsReader;
  static TwitterVerificationAddress =
    '0x12cfb13522F13a78b650a8bCbFCf50b7CB899d82';

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.CNS);
    this.contract = this.buildContract(proxyReaderAbi, this.registryAddress);
  }

  async getReader(): Promise<ICnsReader> {
    if (!this.reader) {
      this.reader = (await this.isDataReaderSupported())
        ? new CnsProxyReader(this.contract)
        : new CnsRegistryReader(this.contract);
    }
    
    return this.reader;
  }

  protected defaultRegistry(network: number): string | undefined {
    return ReaderMap[network];
  }

  protected async isDataReaderSupported(): Promise<boolean> {
    if (ReaderMap[this.network] === this.contract.address) {
      return true;
    }
    

    try {
      const [
        isDataReaderSupported,
      ] = await this.contract.call('supportsInterface', ['0x6eabca0d']);
      if (!isDataReaderSupported) {
        throw new Error('Not supported DataReader');
      }
      

      return true;
    } catch {}

    return false;
  }

  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'crypto' ||
      (domain.indexOf('.') > 0 &&
        /^.{1,}\.(crypto)$/.test(domain) &&
        domain.split('.').every(v => !!v.length))
    );
  }

  async resolver(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);

    const reader = await this.getReader();
    const data = await reader.resolver(tokenId);
    await this.verify(domain, data);

    return data.resolver || '';
  }

  async resolve(_: string): Promise<ResolutionResponse> {
    throw new Error('This method is unsupported for CNS');
  }

  async owner(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    try {
      const [owner] = await this.contract.call('ownerOf', [tokenId]);
      return owner || '';
    } catch (error) {
      if (error.reason === 'ERC721: owner query for nonexistent token') {
        return NullAddress;
      }
      
      throw error;
    }
  }

  async allRecords(domain: string): Promise<Record<string, string>> {
    const tokenId = this.namehash(domain);
    const resolver = await this.resolver(domain);

    const resolverContract = this.buildContract(resolverInterface, resolver);
    if (isLegacyResolver(resolver)) {
      return await this.getStandardRecords(resolverContract, tokenId);
    }
    
    return await this.getAllRecords(resolverContract, tokenId);
  }

  async twitter(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const reader = await this.getReader();
    const records = [
      standardKeys.validation_twitter_username,
      standardKeys.twitter_username,
    ];
    const { values } = await reader.records(tokenId, records);
    const owner = await this.owner(domain);
    records.forEach((recordName, i) => {
      return ensureRecordPresence(domain, recordName, values && values[i]);
    });
    const [validationSignature, twitterHandle] = values!;
    if (
      !(await isValidTwitterSignature({
        tokenId,
        owner,
        twitterHandle,
        validationSignature,
      }))
    ) {
      throw new ResolutionError(
        ResolutionErrorCode.InvalidTwitterVerification,
        {
          domain,
        },
      );
    }
    
    return twitterHandle;
  }

  async records(domain: string, keys: string[]): Promise<Record<string, string>> {
    const tokenId = this.namehash(domain);

    const reader = await this.getReader();
    const data = await reader.records(tokenId, keys);
    await this.verify(domain, data);

    if (!data.values) {
      return {};
    }
    const records: Record<string, string> = {};
    keys.forEach((key, index) => records[key] = data.values![index])
    return records;
  }

  protected async getResolver(tokenId: string): Promise<string> {
    return await this.callMethod(this.registryContract, 'resolverOf', [
      tokenId,
    ]);
  }

  protected async verify(domain: string, data: Data) {
    const { resolver } = data;
    if (!isNullAddress(resolver)) {
      return;
    }
    

    const owner = data.owner || (await this.owner(domain));
    if (isNullAddress(owner)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }
    

    throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
      domain,
    });
  }

  private constructRecords(
    keys: string[],
    values: string[],
  ): Record<string, string> {
    const records: Record<string, string> = {};
    keys.forEach((key, index) => {
      if (!!values[index]) {
        records[key] = values[index];
      }
    });
    return records;
  }

  private async getStandardRecords(
    resolverContract: Contract,
    tokenId: string,
  ): Promise<Record<string, string>> {
    const keys = Object.values(standardKeys);
    const values = await this.callMethod(resolverContract, 'getMany', [
      keys,
      tokenId,
    ]);
    return this.constructRecords(keys, values);
  }

  private async getAllRecords(
    resolverContract: Contract,
    tokenId: string,
  ): Promise<Record<string, string>> {
    const startingBlock = await getStartingBlock(resolverContract, tokenId);
    const logs = await resolverContract.fetchLogs(
      'NewKey',
      tokenId,
      startingBlock,
    );
    const keyTopics = logs.map(event => event.topics[2]);
    // If there are no NewKey events we want to check the standardRecords
    if (keyTopics.length === 0) {
      return await this.getStandardRecords(resolverContract, tokenId);
    }
    const keys = await this.callMethod(resolverContract, 'getManyByHash', [
      keyTopics,
      tokenId,
    ]);
    const keyValues = await this.callMethod(resolverContract, 'getMany', [
      keys,
      tokenId,
    ]);
    return this.constructRecords(keys, keyValues);
  }
}
