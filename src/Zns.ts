import { Zilliqa } from '@zilliqa-js/zilliqa';
import { Contract } from '@zilliqa-js/contract';
import { toChecksumAddress, toBech32Address } from '@zilliqa-js/crypto';
import namehash from './zns/namehash';
import _ from 'lodash';
import { ResolutionResult, SourceDefinition } from './types';
import NamingService from './NamingService';

const DefaultSource = 'https://api.zilliqa.com';
const NullAddress = '0x0000000000000000000000000000000000000000';

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

const UrlNetworkMap = (url: string) => {
  const invert = _(UrlMap)
    .invert()
    .value();
  return invert[url];
};

export default class Zns extends NamingService {
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  private registry?: Contract;
  private zilliqa: Zilliqa;

  constructor(source: string | boolean | SourceDefinition = true) {
    super();
    source = this.normalizeSource(source);
    this.network = <string>source.network;
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

  async resolve(domain: string): Promise<ResolutionResult | null> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork())
      return null;
    const recordAddresses = await this._getRecordsAddresses(domain);
    if (!recordAddresses) return null;
    const [ownerAddress, resolverAddress] = recordAddresses;
    const resolution = await this._getResolverRecordsStructure(resolverAddress);
    const addresses = _.mapValues(resolution.crypto, 'address');
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
   * Resolves a domain
   * @param domain - domain name to be resolved
   * @returns - Everything what is stored on specified domain
   */
  async resolution(domain: string): Promise<Object | {}> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork())
      return {};
    const recordAddresses = await this._getRecordsAddresses(domain);
    if (!recordAddresses) return {};
    const [_, resolverAddress] = recordAddresses;
    return await this._getResolverRecordsStructure(resolverAddress);
  }

  isSupportedDomain(domain: string): boolean {
    return domain.indexOf('.') > 0 && /^.{1,}\.(zil)$/.test(domain);
  }

  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  /**
   * @ignore
   * @param domain - domain name
   */
  async _getRecordsAddresses(domain: string): Promise<[string, string] | null> {
    const registryRecord = await this.getContractMapValue(
      this.registry,
      'records',
      namehash(domain),
    );
    if (!registryRecord) return null;
    let [ownerAddress, resolverAddress] = registryRecord.arguments as [
      string,
      string
    ];
    if (ownerAddress.startsWith('0x')) {
      ownerAddress = toBech32Address(ownerAddress);
    }
    return [ownerAddress, resolverAddress];
  }

  async _getResolverRecordsStructure(
    resolverAddress: string,
  ): Promise<ResolutionResult> {
    if (resolverAddress == NullAddress) {
      return {};
    }
    const resolver = this.zilliqa.contracts.at(
      toChecksumAddress(resolverAddress),
    );
    const resolverRecords = (await this.getContractField(
      resolver,
      'records',
    )) as { [key: string]: string };
    return _.transform(
      resolverRecords,
      (result, value, key) => _.set(result, key, value),
      {},
    );
  }

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

  private async getContractField(
    contract: Contract,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    let result = (await contract.getSubState(field, keys)) || {};
    return result[field];
  }

  private async getContractMapValue(
    contract: Contract,
    field: string,
    key: string,
  ): Promise<any> {
    const record = await this.getContractField(contract, field, [key]);
    return (record && record[key]) || null;
  }
}
