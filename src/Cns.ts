import { EthereumNamingService } from './EthereumNamingService';
import { ProxyReaderMap, isNullAddress, NullAddress } from './types';
import { default as proxyReaderAbi } from './cns/contract/proxyReader';
import { default as resolverInterface } from './cns/contract/resolver';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import ICnsReader, { Data } from './cns/ICnsReader';
import CnsProxyReader from './cns/CnsProxyReader';
import CnsRegistryReader from './cns/CnsRegistryReader';
import Contract from './utils/contract';
import standardKeys from './utils/standardKeys';
import { getStartingBlock, isLegacyResolver } from './utils';
import {
  SourceDefinition,
  NamingServiceName,
  ResolutionResponse,
  CryptoRecords,
} from './publicTypes';
import { isValidTwitterSignature } from './utils/TwitterSignatureValidator';
import NamingService from './NamingService';
import NetworkConfig from './config/network-config.json';

export default class Cns extends EthereumNamingService {
  readonly contract: Contract;
  reader: ICnsReader;
  static TwitterVerificationAddress = '0x12cfb13522F13a78b650a8bCbFCf50b7CB899d82';
  static ProxyReaderMap: ProxyReaderMap = getProxyReaderMap();

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.CNS);
    this.contract = this.buildContract(proxyReaderAbi, this.registryAddress!);
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
    return Cns.ProxyReaderMap[network];
  }

  protected async isDataReaderSupported(): Promise<boolean> {
    if (Cns.ProxyReaderMap[this.network]?.toLowerCase() === this.contract.address.toLowerCase()) {
      return true;
    }


    try {
      const [ result ] = await this.contract.call('supportsInterface', ['0x6eabca0d']);
      return result;
    } catch {
      return false;
    }
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

  async allRecords(domain: string): Promise<CryptoRecords> {
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
    const data = await reader.records(tokenId, records);
    let { owner } = data;
    if (!owner) {
      owner = await this.owner(domain);
    }
    const { values } = data;
    records.forEach((recordName, i) => {
      return NamingService.ensureRecordPresence(domain, recordName, values && values[i]);
    });
    const [validationSignature, twitterHandle] = values!;
    if (
      !isValidTwitterSignature({
        tokenId,
        owner,
        twitterHandle,
        validationSignature,
      })
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

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    const tokenId = this.namehash(domain);

    const reader = await this.getReader();
    const data = await reader.records(tokenId, keys);
    await this.verify(domain, data);

    return this.constructRecords(keys, data.values);
  }

  protected async getResolver(tokenId: string): Promise<string> {
    return await this.callMethod(this.registryContract, 'resolverOf', [
      tokenId,
    ]);
  }

  protected async verify(domain: string, data: Data): Promise<void> {
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

  private async getStandardRecords(
    resolverContract: Contract,
    tokenId: string,
  ): Promise<CryptoRecords> {
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
  ): Promise<CryptoRecords> {
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

function getProxyReaderMap(): ProxyReaderMap {
  const map: ProxyReaderMap = {};
  for (const id of Object.keys(NetworkConfig.networks)) {
    map[id] = NetworkConfig.networks[id].contracts.ProxyReader.address.toLowerCase();
  }
  return map;
}
