import { Zilliqa } from '@zilliqa-js/zilliqa';
import { Contract } from '@zilliqa-js/contract';
import { toChecksumAddress, toBech32Address } from '@zilliqa-js/crypto';
import namehash from './zns/namehash';
import _ from 'lodash';
import {
  SourceDefinition,
  NamicornResolution,
  Dictionary,
  ZnsResolution,
  NullAddress,
} from './types';
import Namicorn, { ResolutionError } from './index';
import NamingService from './namingService';

/** @ignore */
const DefaultSource = 'https://api.zilliqa.com';

/** @ignore */
const NetworkIdMap = {
  1: 'mainnet',
  333: 'testnet',
  111: 'localnet',
};

/** @ignore */
const RegistryMap = {
  mainnet: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
};

/** @ignore */
const UrlMap = {
  mainnet: 'https://api.zilliqa.com',
  testnet: 'https://dev-api.zilliqa.com',
  localnet: 'http://localhost:4201',
};

/** @ignore */
const UrlNetworkMap = (url: string) => {
  const invert = _(UrlMap)
    .invert()
    .value();
  return invert[url];
};

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
  /** @ignore */
  private registry?: Contract;
  /** @ignore */
  private zilliqa: Zilliqa;

  /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omited then defaults are used
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: string | boolean | SourceDefinition = true) {
    super();
    source = this.normalizeSource(source);
    this.network = source.network as string;
    this.url = source.url;
    this.zilliqa = new Zilliqa(this.url);
    if (!this.network) {
      throw new Error('Unspecified network in Namicorn ZNS configuration');
    }
    if (!this.url) {
      throw new Error('Unspecified url in Namicorn ZNS configuration');
    }
    this.registryAddress = source.registry
      ? source.registry
      : RegistryMap[this.network];
    if (this.registryAddress) {
      this.registryAddress = this.registryAddress.startsWith('0x')
        ? toBech32Address(this.registryAddress)
        : this.registryAddress;
      this.registry = this.zilliqa.contracts.at(this.registryAddress);
    }
  }

  /**
   * Resolves the domain name
   * @param domain - domain name to be resolved
   * @returns - a promise that resolves in a detailed crypto resolution
   */
  async resolve(domain: string): Promise<NamicornResolution | null> {
    const recordAddresses = await this.getRecordsAddresses(domain);
    if (!recordAddresses) return Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
    const [ownerAddress, resolverAddress] = recordAddresses;
    const resolution = this.structureResolverRecords(
      await this.getResolverRecords(resolverAddress),
    );

    const addresses = _.mapValues(resolution.crypto || {}, 'address');
    return {
      addresses,
      meta: {
        owner: ownerAddress || null,
        type: 'zns',
        ttl: parseInt(resolution.ttl as string) || 0,
      },
    };
  }

  /**
   * Resolves domain name to a particular crypto address associated with it
   * @param domain - domain name to be resolved
   * @param currencyTicker specific currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @throws ResolutionError
   */
  async address(domain: string, currencyTicker: string): Promise<string> {
    const data = await this.resolve(domain);
    if (!data.meta.owner || data.meta.owner === NullAddress)
      throw new ResolutionError('UnregisteredDomain', { domain });
    const address = data.addresses[currencyTicker.toUpperCase()];
    if (!address)
      throw new ResolutionError('UnspecifiedCurrency', {
        domain,
        currencyTicker,
      });
    return address;
  }

  /**
   * Resolves a domain
   * @param domain - domain name to be resolved
   * @returns - Everything what is stored on specified domain
   */
  async resolution(domain: string): Promise<ZnsResolution> {
    return this.structureResolverRecords(await this.records(domain));
  }

  /**
   * Resolver Records
   * @param domain - domain name to be resolved
   * @returns - ZNS resolver records in an plain key-value format
   */
  async records(domain: string): Promise<Dictionary<string>> {
    return await this.getResolverRecords(await this.resolverAddress(domain));
  }

  /**
   * Checks if domain is supported by zns
   * @param domain
   */
  isSupportedDomain(domain: string): boolean {
    return domain.indexOf('.') > 0 && /^.{1,}\.(zil)$/.test(domain);
  }

  /**
   * Checks if zns is supported by current namicorn instance
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

  /** @ignore */
  private async getRecordsAddresses(
    domain: string,
  ): Promise<[string, string] | undefined> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork())
      return undefined;
    const registryRecord = await this.getContractMapValue(
      this.registry,
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

  /** @ignore */
  private async getResolverRecords(
    resolverAddress: string,
  ): Promise<ZnsResolution> {
    if (!resolverAddress || resolverAddress == NullAddress) {
      return {};
    }
    const resolver = this.zilliqa.contracts.at(
      toChecksumAddress(resolverAddress),
    );
    return ((await this.getContractField(resolver, 'records')) ||
      {}) as Dictionary<string>;
  }

  /** @ignore */
  protected normalizeSource(
    source: string | boolean | SourceDefinition,
  ): SourceDefinition {
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
        source = _.clone(source) as SourceDefinition;
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

  /** @ignore */
  private structureResolverRecords(records: Dictionary<string>): ZnsResolution {
    return _.transform(
      records,
      (result, value, key) => _.set(result, key, value),
      {},
    );
  }

  /** @ignore */
  private async resolverAddress(domain: string): Promise<string | undefined> {
    return ((await this.getRecordsAddresses(domain)) || [])[1];
  }

  /** @ignore */
  private async getContractField(
    contract: Contract,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    try {
      let result = (await contract.getSubState(field, keys)) || {};
      return result[field];
    } catch (err) {
      if (err.name == 'FetchError')
        throw new ResolutionError('NamingServiceDown', { method: 'ZNS' });
      else throw err;
    }
  }

  /** @ignore */
  private async getContractMapValue(
    contract: Contract,
    field: string,
    key: string,
  ): Promise<any> {
    const record = await this.getContractField(contract, field, [key]);
    return (record && record[key]) || null;
  }
}
