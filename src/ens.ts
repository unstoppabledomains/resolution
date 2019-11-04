import _ from 'lodash';
import { default as ensInterface } from './ens/contract/ens';
import { default as registrarInterface } from './ens/contract/registrar';
import { default as resolverInterface } from './ens/contract/resolver';
import { hash } from 'eth-ens-namehash';
import {
  SourceDefinition,
  NamicornResolution,
  NullAddress,
  NamingServiceSource,
  NetworkIdMap,
  RegistryMap
} from './types';
import { EtheriumNamingService } from './namingService';
import Web3 from 'web3';

/**
 * Class to support connection with Etherium naming service
 * @param network - network string such as
 * - mainnet
 * - ropsten
 * @param url - main api url such as
 * - https://mainnet.infura.io
 * @param registryAddress - address for a registry contract
 */
export default class Ens extends EtheriumNamingService {
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  /** @ignore */
  private ensContract: any;
  /**  @ignore */
  private web3: any;
  /** @ignore */
  readonly RegistryMap: RegistryMap = {
    mainnet: '0x314159265dd8dbb310642f98f50c066173c1259b',
    ropsten: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
  };
  
  /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omited then defaults are used
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: NamingServiceSource = true) {
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
      : this.RegistryMap[this.network];
    if (this.registryAddress) {
      this.ensContract = new this.web3.eth.Contract(
        ensInterface,
        this.registryAddress,
      );
    }
  }

  /**
   * Checks if the domain is in valid format
   * @param domain - domain name to be checked
   * @returns
   */
  isSupportedDomain(domain: string): boolean {
    return (
      domain.indexOf('.') > 0 && /^.{1,}\.(eth|luxe|xyz|test)$/.test(domain)
    );
  }

  /**
   * Reverse the ens address to a ens registered domain name
   * @async
   * @param address - address you wish to reverse
   * @param currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns - domain name attached to this address
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
    const resolverAddress = await this.getResolver(nodeHash);
    if (resolverAddress == NullAddress) {
      return null;
    }
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface,
      resolverAddress,
    );

    return await this.resolverCallToName(resolverContract, nodeHash);
  }

  /**
   * Resolves the given domain
   * @async
   * @param domain - domain name to be resolved
   * @returns- Returns a promise that resolves in an object
   */
  async resolve(domain: string): Promise<NamicornResolution | null> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork()) {
      return null;
    }
    const nodeHash = hash(domain);
    var [owner, ttl, resolver] = await this.getResolutionInfo(nodeHash);
    if (owner == NullAddress) owner = null;
    const address = await this.fetchAddress(resolver, nodeHash);
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

  /**
   * Produces ENS namehash
   * @param domain - domain to be hashed
   * @return ENS namehash of a domain
   */
  namehash(domain: string): string {
    return hash(domain);
  }

  /**
   * @ignore
   * @param resolver - Resolver address
   * @param nodeHash - namehash of a domain name
   */
  protected async fetchAddress(resolver, nodeHash) {
    if (!resolver || resolver == NullAddress) {
      return null;
    }
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface,
      resolver,
    );
    //put it as a separate method to stub.
    return await this.callEthMethod(resolverContract.methods.addr(nodeHash));
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param resolverContract
   * @param nodeHash
   */
  private resolverCallToName(resolverContract, nodeHash) {
    return this.callEthMethod(resolverContract.methods.name(nodeHash));
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param nodeHash
   */
  private getResolver(nodeHash) {
    return this.callEthMethod(this.ensContract.methods.resolver(nodeHash));
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param nodeHash
   */
  private async getResolutionInfo(nodeHash) {
    return await Promise.all([
      this.callEthMethod(this.ensContract.methods.owner(nodeHash)),
      this.callEthMethod(this.ensContract.methods.ttl(nodeHash)),
      this.callEthMethod(this.ensContract.methods.resolver(nodeHash)),
    ]);
  } 
}
