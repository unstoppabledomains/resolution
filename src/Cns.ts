import { EthereumNamingService } from './EthereumNamingService';
import { ProxyReaderMap, isNullAddress } from './types';
import { default as proxyReaderAbi } from './cns/contract/proxyReader';
import { default as resolverInterface } from './cns/contract/resolver';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import ICnsReader, { Data } from './cns/ICnsReader';
import CnsProxyReader from './cns/CnsProxyReader';
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

  getReader(): ICnsReader {
    if (!this.reader) {
      this.reader = new CnsProxyReader(this.contract)
    }

    return this.reader;
  }

  protected defaultRegistry(network: number): string | undefined {
    return Cns.ProxyReaderMap[network];
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
    const reader = this.getReader();

    const data = await reader.resolver(tokenId);
    await this.verify(domain, data);

    return data.resolver!;
  }

  async resolve(_: string): Promise<ResolutionResponse> {
    throw new Error('This method is unsupported for CNS');
  }

  async owner(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const reader = this.getReader();

    const data = await reader.records(tokenId, []);
    if (!data.owner) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {domain})
    }

    return data.owner;
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    const tokenId = this.namehash(domain);
    const resolver = await this.resolver(domain);

    const resolverContract = this.buildContract(resolverInterface, resolver);
    if (isLegacyResolver(resolver)) {
      return await this.getStandardRecords(tokenId);
    }

    return await this.getAllRecords(resolverContract, tokenId);
  }

  async twitter(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const reader = this.getReader();
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

    const reader = this.getReader();
    const data = await reader.records(tokenId, keys);
    await this.verify(domain, data);

    return this.constructRecords(keys, data.values);
  }

  protected async getResolver(tokenId: string): Promise<string> {
    const reader = this.getReader();
    const data =  await reader.resolver(tokenId);
    return data.resolver!;
  }

  protected async verify(domain: string, data: Data): Promise<void> {
    const { resolver } = data;
    if (!isNullAddress(resolver)) {
      return;
    }
    const owner = data.owner;
    if (isNullAddress(owner)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }
    throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
      domain,
    });
  }

  private async getStandardRecords(tokenId: string): Promise<CryptoRecords> {
    const keys = Object.values(standardKeys);
    const reader = this.getReader();
    const values = await reader.getMany(tokenId, keys);
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
      return await this.getStandardRecords(tokenId);
    }
    const reader = this.getReader();
    const [keys, values] = await reader.getManyByHash(tokenId, keyTopics);
    return this.constructRecords(keys, values);
  }
}

function getProxyReaderMap(): ProxyReaderMap {
  const map: ProxyReaderMap = {};
  for (const id of Object.keys(NetworkConfig.networks)) {
    map[id] = NetworkConfig.networks[id].contracts.ProxyReader.address.toLowerCase();
  }
  return map;
}
