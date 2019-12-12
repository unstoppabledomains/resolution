import {
  fromBech32Address,
  toBech32Address,
  toChecksumAddress,
} from './zns/utils';
import namehash from './zns/namehash';
import { invert, set } from './utils';
import {
  Dictionary,
  ResolutionResponse,
  NullAddress,
  SourceDefinition,
  UnclaimedDomainResponse,
  ZnsResolution,
  NamingServiceSource,
} from './types';
import { ResolutionError, ResolutionErrorCode } from './index';
import NamingService from './namingService';

const DefaultSource = 'https://api.zilliqa.com';

const NetworkIdMap = {
  1: 'mainnet',
  333: 'testnet',
  111: 'localnet',
};

const RegistryMap = {
  mainnet: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
};

const UrlMap = {
  mainnet: 'https://api.zilliqa.com',
  testnet: 'https://dev-api.zilliqa.com',
  localnet: 'http://localhost:4201',
};

const UrlNetworkMap = (url: string) => invert(UrlMap)[url];

/**
 * Class to support connection with Zilliqa naming service
 * @param network - network string such as
 * - mainnet
 * - ropsten
 * @param url - main api url such as
 * - https://mainnet.infura.io
 * @param registryAddress - address for a registry contract
 */
export default class Zns extends NamingService {
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  readonly name: string;
  /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omitted then defaults are used
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: string | boolean | SourceDefinition = true) {
    super();
    source = this.normalizeSource(source);
    this.name = "ZNS";
    this.network = source.network as string;
    this.url = source.url;
    if (!this.network) {
      throw new Error('Unspecified network in Resolution ZNS configuration');
    }
    if (!this.url) {
      throw new Error('Unspecified url in Resolution ZNS configuration');
    }
    this.registryAddress = source.registry
      ? source.registry
      : RegistryMap[this.network];
    if (this.registryAddress) {
      this.registryAddress = this.registryAddress.startsWith('0x')
        ? toBech32Address(this.registryAddress)
        : this.registryAddress;
    }
  }

  /**
   * Resolves the domain name
   * @param domain - domain name to be resolved
   * @returns A promise that resolves in a detailed crypto Resolution
   */
  async resolve(domain: string): Promise<ResolutionResponse | null> {
    const recordAddresses = await this.getRecordsAddresses(domain);
    if (!recordAddresses) return UnclaimedDomainResponse;
    const [ownerAddress, resolverAddress] = recordAddresses;
    const Resolution = this.structureResolverRecords(
      await this.getResolverRecords(resolverAddress),
    );
    const addresses = {};
    Object.entries(Resolution.crypto).map(
      ([key, v]) => (addresses[key] = v.address),
    );
    return {
      addresses,
      meta: {
        owner: ownerAddress || null,
        type: this.name,
        ttl: parseInt(Resolution.ttl as string) || 0,
      },
    };
  }

  /**
   * Resolves domain name to a particular crypto address associated with it
   * @param domain - domain name to be resolved
   * @param currencyTicker - specific currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @returns A promise that resolves in a string
   * @throws ResolutionError
   */
  async address(domain: string, currencyTicker: string): Promise<string> {
    const data = await this.resolve(domain);
    if (!data.meta.owner || data.meta.owner === NullAddress)
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    const address = data.addresses[currencyTicker.toUpperCase()];
    if (!address)
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    return address;
  }

  /**
   * Owner of the domain
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    return (await this.resolve(domain)).meta.owner;
  }

  /**
   * Resolves a domain
   * @param domain - domain name to be resolved
   * @returns Everything what is stored on specified domain
   */
  async Resolution(domain: string): Promise<ZnsResolution> {
    return this.structureResolverRecords(await this.records(domain));
  }

  /**
   * Resolves a specific field from domain's record
   * @param domain - domain name
   * @param field - resolver record name to be queried
   * @returns Record field associated with the domain
   */
  async record(domain: string, field: string) {
    return this.getRecordFieldOrThrow(
      domain,
      await this.records(domain),
      field,
    );
  }

  /**
   * Resolver Records
   * @param domain - domain name to be resolved
   * @returns ZNS resolver records in an plain key-value format
   */
  async records(domain: string): Promise<Dictionary<string>> {
    return await this.getResolverRecords(await this.resolverAddress(domain));
  }

  /**
   * Checks if domain is supported by zns
   */
  isSupportedDomain(domain: string): boolean {
    return (
      (domain.indexOf('.') > 0 && /^.{1,}\.(zil)$/.test(domain)) ||
      domain === 'zil'
    );
  }

  /**
   * Checks if zns is supported by current Resolution instance
   */
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  /**
   * Produces ZNS namehash of a domain
   * @param domain - domain name to be hashed
   * @returns ZNS namehash
   */
  namehash(domain: string): string {
    this.ensureSupportedDomain(domain);
    return namehash(domain);
  }

  /** @internal */
  protected normalizeSource(source: NamingServiceSource): SourceDefinition {
    switch (typeof source) {
      case 'boolean': {
        return { url: DefaultSource, network: 'mainnet' };
      }
      case 'string': {
        return {
          url: source as string,
          network: UrlNetworkMap(source),
        };
      }
      case 'object': {
        source = { ...source };
        if (typeof source.network == 'number') {
          source.network = NetworkIdMap[source.network];
        }
        if (source.registry) {
          source.network = source.network ? source.network : 'mainnet';
          source.url = source.url ? source.url : DefaultSource;
        }
        if (source.network && !source.url) {
          source.url = UrlMap[source.network];
        }
        if (source.url && !source.network) {
          source.network = UrlNetworkMap(source.url);
        }
        return source;
      }
    }
  }

  private getRecordFieldOrThrow(
    domain: string,
    records: Dictionary<string>,
    field: string,
  ): string {
    if (!records || !records[field])
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        recordName: field,
      });
    return records[field];
  }

  private async getRecordsAddresses(
    domain: string,
  ): Promise<[string, string] | undefined> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork())
      return undefined;
    const registryRecord = await this.getContractMapValue(
      this.registryAddress,
      'records',
      namehash(domain),
    );
    if (!registryRecord) return undefined;
    let [ownerAddress, resolverAddress] = registryRecord.arguments as [
      string,
      string,
    ];
    if (ownerAddress.startsWith('0x')) {
      ownerAddress = toBech32Address(ownerAddress);
    }
    return [ownerAddress, resolverAddress];
  }

  private async getResolverRecords(
    resolverAddress: string,
  ): Promise<ZnsResolution> {
    if (!resolverAddress || resolverAddress == NullAddress) {
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

  private async resolverAddress(domain: string): Promise<string | undefined> {
    return ((await this.getRecordsAddresses(domain)) || [])[1];
  }

  private async fetchSubState(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const response = await this.fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        id: '1',
        jsonrpc: '2.0',
        method: 'GetSmartContractSubState',
        params: [contractAddress.replace('0x', ''), field, keys],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => res.json());
    return response.result;
  }

  private async getContractField(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    try {
      const contractAddr = contractAddress.startsWith('zil1')
        ? fromBech32Address(contractAddress)
        : contractAddress;
      let result = (await this.fetchSubState(contractAddr, field, keys)) || {};
      return result[field];
    } catch (err) {
      if (err.name == 'FetchError')
        throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
          method: 'ZNS',
        });
      else throw err;
    }
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
