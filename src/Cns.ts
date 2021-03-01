import { BlockhanNetworkUrlMap, NormalizedSource, ProxyReaderMap } from './types';
import { keccak_256 as sha3 } from 'js-sha3';
import { default as proxyReaderAbi } from './contracts/cns/proxyReader';
import { default as resolverInterface } from './contracts/cns/resolver';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import Contract from './utils/contract';
import standardKeys from './utils/standardKeys';
import { 
  buildContract,
  constructRecords,
  ensureConfigured,
  getStartingBlock,
  isLegacyResolver,
  isNullAddress
} from './utils';
import {
  NamingServiceName,
  CryptoRecords,
  DomainData,
  Provider,
  CnsSupportedNetworks,
} from './publicTypes';
import { isValidTwitterSignature } from './utils/TwitterSignatureValidator';
import NetworkConfig from './config/network-config.json';
import NamingService from './interfaces/NamingService';
import FetchProvider from './FetchProvider';
import { CnsConfig } from './publicTypes';


function getProxyReaderMap(): ProxyReaderMap {
  const map: ProxyReaderMap = {};
  for (const id of Object.keys(NetworkConfig.networks)) {
    map[id] = NetworkConfig.networks[id].contracts.ProxyReader.address.toLowerCase();
  }
  return map;
}

export default class Cns implements NamingService {
  static readonly ProxyReaderMap: ProxyReaderMap = getProxyReaderMap();

  static readonly UrlMap: BlockhanNetworkUrlMap = {
    1: 'https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    4: 'https://rinkeby.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
  };
  static readonly NetworkNameMap = {
    mainnet: 1,
    rinkeby: 4
  };

  readonly name: NamingServiceName = NamingServiceName.CNS;
  readonly network: number;
  readonly url: string | undefined;
  readonly provider: Provider;
  readonly readerContract: Contract;

  constructor(source?: CnsConfig) {
    if (!source) {
      source = this.getDefaultSource();
    }
    ensureConfigured(source, this.name);
    this.network = Cns.NetworkNameMap[source.network];
    this.url = source?.url || Cns.UrlMap[this.network];
    this.provider = source?.provider || new FetchProvider(this.name, this.url!);
    
    this.readerContract = buildContract(
      proxyReaderAbi,
      source.proxyReaderAddress || Cns.ProxyReaderMap[this.network],
      this.provider
    );
  }

  private getDefaultSource() {
    return {
      url: Cns.UrlMap[1]!,
      network: "mainnet" as CnsSupportedNetworks,
    }
  }

  namehash(domain: string): string {
    const hashArray = this.hash(domain);
    return this.arrayToHex(hashArray);
  }

  serviceName(): NamingServiceName {
    return this.name;
  }

  isSupportedDomain(domain: string): boolean {
    return (
          domain === 'crypto' ||
          (domain.indexOf('.') > 0 &&
            /^.{1,}\.(crypto)$/.test(domain) &&
            domain.split('.').every(v => !!v.length))
        );
  }
  
  async owner(domain: string): Promise<string> {
    return (await this.getVerifiedData(domain)).owner;
  }

  async resolver(domain: string): Promise<string> {
    return (await this.getVerifiedData(domain)).resolver;
  }

  async record(domain: string, key: string): Promise<string> {
    const returnee = (await this.records(domain, [key]))[key];
    if (!returnee) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {recordName: key, domain});
    }
    return returnee
  }

  async records(domain: string, keys: string[]): Promise<Record<string, string>> {
    return (await this.getVerifiedData(domain, keys)).records;
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    const tokenId = this.namehash(domain);
    const resolver = await this.resolver(domain);

    const resolverContract = buildContract(resolverInterface, resolver, this.provider);
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

  async reverse(address: string, currencyTicker: string): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverse',
    });
  }

  private hash(domain: string): number[] {
    if (!domain) {
        return Array.from(new Uint8Array(32));
    }
    const [label, ...remainder] = domain.split('.');
    const labelHash = sha3.array(label);
    const remainderHash = this.hash(remainder.join('.'));
    return sha3.array(new Uint8Array([...remainderHash, ...labelHash]));
  }

  private arrayToHex(arr) {
    return '0x' + Array.prototype.map.call(arr, x => ('00' + x.toString(16)).slice(-2)).join('');
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
    return constructRecords(keys, values);
  }

  private async get(tokenId: string, keys: string[] = []): Promise<DomainData> {
    const [resolver, owner, values] = await this.readerContract.call('getData', [
      keys,
      tokenId,
    ]);
    return {owner, resolver, records: constructRecords(keys, values)}
  }
}