import { Zilliqa } from '@zilliqa-js/zilliqa';
import { Contract } from '@zilliqa-js/contract';
import { toChecksumAddress, toBech32Address } from '@zilliqa-js/crypto';
import namehash from './zns/namehash';
import _ from 'lodash';
import { NamicornResolution, SourceDefinition } from './types';
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

/**
 * Class to support connection with Zilliqa naming service
*/
export default class Zns extends NamingService {
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  private registry?: Contract;
  private zilliqa: Zilliqa;


/**
 * Source object describing the network naming service operates on
 * @param {string | boolean | SourceDefinition} source 
 * @throws Unspecified network
 * @throws Unspecified url
*/
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

/**
 * Gets a contract field
 * @param {Contract} contract - contract
 * @param {string} field - field name
 * @param {string[]} keys - used to get deeper levels of a field
*/
  async getContractField(
    contract: Contract,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    let result =
      (await contract.getSubState(field, keys)) ||
      {};
    return result[field];
  }
/**
 * Wrapper around getContractField
 * @param {Contract} contract - contract
 * @param {string} field - field name
 * @param {string} key - used to get deeper level of a field
 */
  async getContractMapValue(
    contract: Contract,
    field: string,
    key: string,
  ): Promise<any> {
    const record = await this.getContractField(contract, field, [key]);
    return (record && record[key]) || null;
  }

  async getResolverRecordsStructure(
    resolverAddress: string,
  ): Promise<any>  {
    if (resolverAddress == NullAddress) {
      return {} as NamicornResolution;
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
    ) as NamicornResolution;
  }

/**
 * Resolves the given domain
 * @async
 * @param {string} domain - domain name to be resolved 
 * @returns {Promise<NamicornResolution | null>} - Returns a promise that resolves in an object 
*/
  async resolve(domain: string): Promise<NamicornResolution | null> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork())
      return null;

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
    const resolution = await this.getResolverRecordsStructure(resolverAddress);
    const addresses = _.mapValues(resolution.crypto, 'address');
    if (ownerAddress.startsWith('0x')) {
      ownerAddress = toBech32Address(ownerAddress);
    }
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
 * Checks if the domain is in valid format
 * @param {string} domain - domain name to be checked
 * @returns {boolean} 
*/
  isSupportedDomain(domain: string): boolean {
    return domain.indexOf('.') > 0 && /^.{1,}\.(zil)$/.test(domain);
  }

/**
 * Checks if the current network is supported
 * @return {boolean}
*/ 
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

/**
 * Normalizes the source object based on type
 * @param { string | boolean | SourceDefinition } source 
 * @returns {SourceDefinition}
*/
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
}
