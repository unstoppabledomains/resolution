import { EthereumNamingService } from './EthereumNamingService';
import { ProxyReaderMap } from './types';
import { default as proxyReaderAbi } from './cns/contract/proxyReader';
import { default as resolverInterface } from './cns/contract/resolver';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import Contract from './utils/contract';
import standardKeys from './utils/standardKeys';
import { getStartingBlock, isLegacyResolver, isNullAddress } from './utils';
import {
  SourceDefinition,
  NamingServiceName,
  ResolutionResponse,
  CryptoRecords,
  DomainData,
} from './publicTypes';
import { isValidTwitterSignature } from './utils/TwitterSignatureValidator';
import NetworkConfig from './config/network-config.json';

export default class Cns extends EthereumNamingService {
  static TwitterVerificationAddress = '0x12cfb13522F13a78b650a8bCbFCf50b7CB899d82';
  static ProxyReaderMap: ProxyReaderMap = getProxyReaderMap();

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.CNS);
  }

  protected readerAbi(): any {
    return proxyReaderAbi;
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
    return (await this.getVerifiedData(domain)).resolver;
  }

  async owner(domain: string): Promise<string> {
    return (await this.getVerifiedData(domain)).owner;
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
    const keys = [
      standardKeys.validation_twitter_username,
      standardKeys.twitter_username,
    ];
    const data = await this.getVerifiedData(domain, keys);
    const {records} = data;
    const validationSignature = records[standardKeys.validation_twitter_username];
    const twitterHandle = records[standardKeys.twitter_username];
    if (isNullAddress(validationSignature)) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {domain, recordName: standardKeys.validation_twitter_username})
    }

    if (!twitterHandle) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {domain, recordName: standardKeys.twitter_username})
    }

    const owner = data.owner;
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
    return (await this.getVerifiedData(domain, keys)).records;
  }

  async resolve(_: string): Promise<ResolutionResponse> {
    throw new Error('This method is unsupported for CNS');
  }

  private async getVerifiedData(domain: string, keys?: string[]): Promise<DomainData> {
    const tokenId = this.namehash(domain);
    const data = await this.get(tokenId, keys);
    if (isNullAddress(data.resolver)) {
      if (isNullAddress(data.owner)) {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {domain});
      }
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {domain});
    }
    return data;
  }

  private async getStandardRecords(tokenId: string): Promise<CryptoRecords> {
    const keys = Object.values(standardKeys);
    return await this.getMany(tokenId, keys);
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
    return await this.getManyByHash(tokenId, keyTopics);
  }

  private async getMany(tokenId: string, keys: string[]): Promise<CryptoRecords> {
    return (await this.get(tokenId, keys)).records;
  }

  private async getManyByHash(tokenId: string, hashes: string[]): Promise<CryptoRecords> {
    const [keys, values] = await this.readerContract.call('getManyByHash', [hashes, tokenId]) as [string[], string[]];
    return this.constructRecords(keys, values);
  }

  private async get(tokenId: string, keys: string[] = []): Promise<DomainData> {
    const [resolver, owner, values] = await this.readerContract.call('getData', [
      keys,
      tokenId,
    ]);
    return {owner, resolver, records: this.constructRecords(keys, values)}
  }
}

function getProxyReaderMap(): ProxyReaderMap {
  const map: ProxyReaderMap = {};
  for (const id of Object.keys(NetworkConfig.networks)) {
    map[id] = NetworkConfig.networks[id].contracts.ProxyReader.address.toLowerCase();
  }
  return map;
}
