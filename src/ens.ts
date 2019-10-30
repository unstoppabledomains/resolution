import _ from 'lodash';
import { default as ensInterface } from './ens/contract/ens';
import { default as registrarInterface } from './ens/contract/registrar';
import { default as resolverInterface } from './ens/contract/resolver';
import { hash } from 'eth-ens-namehash';
import { SourceDefinition, NamicornResolution } from './types';
import NamingService from './namingService';
/**
 * @ignore
 */
const Web3 = require('web3');
/**
 * @ignore
 */
const NullAddress = '0x0000000000000000000000000000000000000000';
/**
 * @ignore
 */
const DefaultUrl = 'https://mainnet.infura.io';
/**
 * @ignore
 */
const NetworkIdMap = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'kovan',
  42: 'rinkeby',
  5: 'goerli',
};
/**
 * @ignore
 */
const NetworkNameMap = _(NetworkIdMap)
  .invert()
  .mapValues((v, k) => parseInt(v))
  .value();

/**
 * @ignore
 */
const RegistryMap = {
  mainnet: '0x314159265dd8dbb310642f98f50c066173c1259b',
  ropsten: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
};

/**
 * Class to support connection with Etherium naming service
 * @param {string} network - network string such as
 * - mainnet
 * - ropsten
 * @param {string} url - main api url such as
 * - https://mainnet.infura.io
 * @param {string} registryAddress - address for a registry contract
 */
export default class Ens extends NamingService {
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  /**
   * @ignore
   */
  private registrarContract: any;
  /**
   * @ignore
   */
  private ensContract: any;
  /**
   * @ignore
   */
  private web3: any;

  /**
   * Source object describing the network naming service operates on
   * @param {string | boolean | SourceDefinition} source
   * @throws Unspecified network
   * @throws Unspecified url
   */
  constructor(source: string | boolean | SourceDefinition = true) {
    super();
    source = this.normalizeSource(source);
    this.web3 = new Web3(source.url);
    this.network = <string>source.network;
    this.url = source.url;
    if (!this.network) {
      throw new Error('Unspecified network in Namicorn ENS configuration');
    }
    if (!this.url) {
      throw new Error('Unspecified url in Namicorn ENS configuration');
    }
    this.registryAddress = source.registry
      ? source.registry
      : RegistryMap[this.network];
    if (this.registryAddress) {
      this.ensContract = new this.web3.eth.Contract(
        ensInterface,
        this.registryAddress,
      );
      this.registrarContract = new this.web3.eth.Contract(
        registrarInterface,
        //TODO: make an address dependent on network id
        '0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef',
      );
    }
  }

  /**
   * Checks if the domain is in valid format
   * @param {string} domain - domain name to be checked
   * @returns {boolean}
   */
  isSupportedDomain(domain: string): boolean {
    return (
      domain.indexOf('.') > 0 && /^.{1,}\.(eth|luxe|xyz|test)$/.test(domain)
    );
  }

  /**
   * Checks if the current network is supported
   * @return {boolean}
   */
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  /**
   * Reverse the ens address to a ens registered domain name
   * @async
   * @param {string} address - address you wish to reverse
   * @param {string} currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns {Promise<string>} - domain name attached to this address
   */
  async reverse(address: string, currencyTicker: string): Promise<string> {
    if (currencyTicker != 'ETH') {
      throw new Error(`Ens doesn't support any currency other than ETH`);
    }
    if (address.startsWith('0x')) {
      address = address.substr(2);
    }
    const reverseAddress = address + '.addr.reverse';
    const nodeHash = hash(reverseAddress);
    const resolverAddress = await this._getResolver(nodeHash);
    if (resolverAddress == NullAddress) {
      return null;
    }
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface,
      resolverAddress,
    );

    return await this._resolverCallToName(resolverContract, nodeHash);
  }

  /**
   * Resolves the given domain
   * @async
   * @param {string} domain - domain name to be resolved
   * @returns {Promise<NamicornResolution>} - Returns a promise that resolves in an object
   */
  async resolve(domain: string): Promise<NamicornResolution | null> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork()) {
      return null;
    }
    const nodeHash = hash(domain);
    var [owner, ttl, resolver] = await this._getResolutionInfo(nodeHash);
    if (owner == NullAddress) owner = null;
    const address = await this._fetchAddress(resolver, nodeHash);
    return {
      addresses: {
        ETH: address,
      },
      meta: {
        owner,
        type: 'ens',
        ttl: Number(ttl),
      },
    };
  }

  namehash(domain: string): string {
    return hash(domain);
  }
  /* Test functions bellow */

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param resolverContract
   * @param nodeHash
   */
  _resolverCallToName(resolverContract, nodeHash) {
    return resolverContract.methods.name(nodeHash).call();
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param nodeHash
   */
  _getResolver(nodeHash) {
    return this.ensContract.methods.resolver(nodeHash).call();
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param nodeHash
   */
  async _getResolutionInfo(nodeHash) {
    return await Promise.all([
      this.ensContract.methods.owner(nodeHash).call(),
      this.ensContract.methods.ttl(nodeHash).call(),
      this.ensContract.methods.resolver(nodeHash).call(),
    ]);
  }

  /*===========================*/

  /**
   * @ignore
   * @param resolver - Resolver address
   * @param nodeHash - namehash of a domain name
   */
  async _fetchAddress(resolver, nodeHash) {
    if (!resolver || resolver == NullAddress) {
      return null;
    }
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface,
      resolver,
    );
    //put it as a separate method to stub.
    const address = await resolverContract.methods.addr(nodeHash).call();
    return address;
  }

  /*===========================*/

  /**
   * Normalizes the source object based on type
   * @ignore
   * @param { string | boolean | SourceDefinition } source
   * @returns {SourceDefinition}
   */
  protected normalizeSource(
    source: string | boolean | SourceDefinition,
  ): SourceDefinition {
    switch (typeof source) {
      case 'boolean': {
        return { url: DefaultUrl, network: this.networkFromUrl(DefaultUrl) };
      }
      case 'string': {
        return {
          url: source as string,
          network: this.networkFromUrl(source as string),
        };
      }
      case 'object': {
        source = _.clone(source) as SourceDefinition;
        if (typeof source.network == 'number') {
          source.network = NetworkIdMap[source.network];
        }
        if (source.registry) {
          source.network = source.network ? source.network : 'mainnet';
          source.url = source.url
            ? source.url
            : `https://${source.network}.infura.io`;
        }
        if (source.network && !source.url) {
          if (NetworkNameMap.hasOwnProperty(source.network))
            source.url = `https://${source.network}.infura.io`;
          else throw new Error('Invalid network or unspecified url');
        }
        if (source.url && !source.network) {
          source.network = this.networkFromUrl(source.url);
        }
        return source;
      }
    }
  }

  /**
   * Look up for network from url provided
   * @ignore
   * @param url - main api url for blockchain
   * @returns {string} - network such as:
   *  - mainnet
   *  - testnet
   */
  private networkFromUrl(url: string): string {
    return _.find(NetworkIdMap, name => url.indexOf(name) >= 0);
  }
}
