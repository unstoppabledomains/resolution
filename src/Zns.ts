import { sha256 } from 'js-sha256';
import {
  fromBech32Address,
  toBech32Address,
  toChecksumAddress,
} from './utils/znsUtils';
import { set, isNullAddress, constructRecords, ensureConfigured } from './utils';
import { Dictionary, ZnsResolution } from './types';
import {
  NamingServiceName,
  ResolutionError,
  ResolutionErrorCode,
  ResolutionResponse,
  UnclaimedDomainResponse,
} from './index';
import NamingService from './interfaces/NamingService';
import { CryptoRecords, Provider, ZnsConfig, ZnsSupportedNetworks } from './publicTypes';
import FetchProvider from './FetchProvider';

export default class Zns implements NamingService {

  static readonly UrlMap = {
    1: 'https://api.zilliqa.com',
    333: 'https://dev-api.zilliqa.com',
    111: 'http://localhost:4201',
  }

  static readonly NetworkNameMap = {
    mainnet: 1,
    testnet: 333,
    localnet: 111,
  };
  
  static readonly RegistryMap = {
    1: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
  };
  
  readonly name: NamingServiceName = NamingServiceName.ZNS;
  readonly network: number;
  readonly url: string | undefined;
  readonly registryAddress: string;
  readonly provider: Provider;
  
  constructor(source?: ZnsConfig) {
    if (!source) {
      source = this.getDefaultSource();
    }
    this.network = Zns.NetworkNameMap[source.network];
    this.url = source?.url || Zns.UrlMap[this.network];
    this.provider = source?.provider || new FetchProvider(this.name, this.url!);
    ensureConfigured({
      network: source.network,
      url: this.url,
      provider: this.provider
    }, this.name);
    this.registryAddress = source.registryAddress || Zns.RegistryMap[this.network];
    if (this.registryAddress.startsWith("0x")) {
      this.registryAddress = toBech32Address(this.registryAddress);
    }
  }
  

  private getDefaultSource() {
    return {
      url: Zns.UrlMap[1]!,
      network: "mainnet" as ZnsSupportedNetworks,
    }
  }

  serviceName(): NamingServiceName {
    return this.name;
  }

  async owner(domain: string): Promise<string> {
    const data = await this.resolve(domain);
    if (!data || !data.meta.owner) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, { domain });
    }
    return data.meta.owner;
  }

  async resolver(domain: string): Promise<string> {
    const recordsAddresses = await this.getRecordsAddresses(domain);
    if (!recordsAddresses || !recordsAddresses[0]) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: domain,
      });
    }

    const [, resolverAddress] = recordsAddresses;
    if (isNullAddress(resolverAddress)) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain: domain,
      });
    }

    return resolverAddress;
  }

  namehash(domain: string): string {
    const hashArray = this.hash(domain);
    return this.arrayToHex(hashArray);
  }

  private hash(name: string): number[] {
    if (!name) {
      return Array.from(new Uint8Array(32));
    }
    const [label, ...remainder] = name.split('.');
    const labelHash = sha256.array(label);
    const remainderHash = this.hash(remainder.join('.'));
    return sha256.array(new Uint8Array([...remainderHash, ...labelHash]));
  }

  private arrayToHex(arr: number[]): string {
    return '0x' + Array.prototype.map.call(arr, x => ('00' + x.toString(16)).slice(-2)).join('');
  }

  isSupportedDomain(domain: string): boolean {
    const tokens = domain.split('.');
    return (
      !!tokens.length &&
      tokens[tokens.length - 1] === 'zil' &&
      tokens.every(v => !!v.length)
    );
  }

  async record(domain: string, key: string): Promise<string> {
    const returnee = (await this.records(domain, [key]))[key];
    if (!returnee) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {domain, recordName: key});
    }
    return returnee;
  }

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    const records = await this.allRecords(domain)
    return constructRecords(keys, records)
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    const resolverAddress = await this.resolver(domain);
    return await this.getResolverRecords(resolverAddress);
  }


  async twitter(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'twitter',
    });
  }

  async reverse(address: string, currencyTicker: string): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverse',
    });
  }

  private async resolve(domain: string): Promise<ResolutionResponse | null> {
    const recordAddresses = await this.getRecordsAddresses(domain);
    if (!recordAddresses) {
      return UnclaimedDomainResponse;
    }
    const [ownerAddress, resolverAddress] = recordAddresses;
    const resolution = this.structureResolverRecords(
      await this.getResolverRecords(resolverAddress),
    );
    const addresses: Record<string, string> = {};
    if (resolution.crypto) {
      Object.entries(resolution.crypto).forEach(
        ([key, v]) => v.address && (addresses[key] = v.address),
      );
    }

    return {
      addresses,
      meta: {
        namehash: this.namehash(domain),
        resolver: resolverAddress,
        owner: ownerAddress || null,
        type: this.name,
        ttl: parseInt(resolution.ttl as string) || 0,
      },
      records: resolution.records,
    };
  }

  private async getRecordsAddresses(
    domain: string,
  ): Promise<[string, string] | undefined> {
    if (!this.isSupportedDomain(domain)) {
      return undefined;
    }

    const registryRecord = await this.getContractMapValue(
      this.registryAddress,
      'records',
      this.namehash(domain),
    );
    if (!registryRecord) {
      return undefined;
    }
    const [ownerAddress, resolverAddress] = registryRecord.arguments as [
      string,
      string,
    ];
    return [
      ownerAddress.startsWith('0x') ? toBech32Address(ownerAddress) : ownerAddress,
      resolverAddress,
    ];
  }

  private async getResolverRecords(
    resolverAddress: string,
  ): Promise<ZnsResolution> {
    if (isNullAddress(resolverAddress)) {
      return {};
    }

    const resolver = toChecksumAddress(resolverAddress);
    return ((await this.getContractField(resolver, 'records')) ||
      {}) as Dictionary<string>;
  }

  private structureResolverRecords(records: Dictionary<string>): ZnsResolution {
    const result = {};
    for (const [key, value] of Object.entries(records)) {
      set(result, key, value);
    }

    return result;
  }

  private async fetchSubState(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const params = [contractAddress.replace('0x', ''), field, keys];
    const method = 'GetSmartContractSubState';
    return await this.provider.request({ method, params });
  }

  private async getContractField(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const contractAddr = contractAddress.startsWith('zil1')
      ? fromBech32Address(contractAddress)
      : contractAddress;
    const result = (await this.fetchSubState(contractAddr, field, keys)) || {};
    return result[field];
  }

  private async getContractMapValue(
    contractAddress: string,
    field: string,
    key: string,
  ): Promise<any> {
    const record = await this.getContractField(contractAddress, field, [key]);
    return (record && record[key]) || null;
  }
}
