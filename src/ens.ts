import _ from 'lodash';
import { default as ensInterface } from './ens/contract/ens';
import { default as registrarInterface } from './ens/contract/registrar';
import { default as resolverInterface } from './ens/contract/resolver';
import { hash } from 'eth-ens-namehash';
import { formatsByCoinType } from '@ensdomains/address-encoder';
import {
  NamicornResolution,
  NullAddress,
  NamingServiceSource,
  RegistryMap,
  Bip44Constants,
  EthCoinIndex
} from './types';
import { EtheriumNamingService } from './namingService';
import { ResolutionError } from './index';
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
    const resolverAddress = await this._getResolver(nodeHash);
    if (resolverAddress == NullAddress) {
      return null;
    }
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface(resolverAddress, EthCoinIndex),
      resolverAddress,
    );

    return await this.resolverCallToName(resolverContract, nodeHash);
  }

  /**
   * Resolves domain to a specific cryptoAddress
   * @param domain - domain name to be resolved
   * @param currencyTicker currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @returns - A promise that resolves in a string
   */
  async address(domain: string, currencyTicker: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const ownerPromise = this._getOwner(nodeHash)
    const resolver = await this._getResolver(nodeHash);
    if (!resolver || resolver === NullAddress) {
      const owner = await ownerPromise;
      if (!owner || owner === NullAddress)
        throw new ResolutionError('UnregisteredDomain', { domain });
      throw new ResolutionError('UnspecifiedResolver', { domain });
    }
    const coinType = this.getCoinType(currencyTicker);
    var addr = await this.fetchAddress(resolver, nodeHash, coinType);
    if (!addr)
      throw new ResolutionError('UnspecifiedCurrency', {
        domain,
        currencyTicker,
      });
    return addr;
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
    const nodeHash = this.namehash(domain);
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
    this.ensureSupportedDomain(domain);
    return hash(domain);
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param resolverContract
   * @param nodeHash
   */
  private resolverCallToName(resolverContract, nodeHash) {
    return this._callMethod(resolverContract.methods.name(nodeHash));
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param nodeHash
   */
  async _getResolver(nodeHash) {
    return await this._callMethod(this.ensContract.methods.resolver(nodeHash));
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param nodeHash
   */

  async _getOwner(nodeHash) {
    return await this._callMethod(this.ensContract.methods.owner(nodeHash));
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param nodeHash
   */
  private async getResolutionInfo(nodeHash) {
    return await Promise.all([
      this._callMethod(this.ensContract.methods.owner(nodeHash)),
      this._callMethod(this.ensContract.methods.ttl(nodeHash)),
      this._callMethod(this.ensContract.methods.resolver(nodeHash)),
    ]);
  }

  /** @ignore */
  private getCoinType(currencyTicker: string): number {
    const constants: Bip44Constants[] = require('bip44-constants');
    const coin = constants.findIndex(
      item =>
        item[1] === currencyTicker.toUpperCase() ||
        item[2] === currencyTicker.toUpperCase(),
    );
    if (coin < 0 || !formatsByCoinType[coin])
      throw new ResolutionError('UnsupportedCurrency', { currencyTicker });
    return coin;
  }

  /**
   * @ignore
   * @param resolver - Resolver address
   * @param nodeHash - namehash of a domain name
   */
  protected async fetchAddress(resolver, nodeHash, coinType?: number) {
    if (!resolver || resolver == NullAddress) {
      return null;
    }
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface(resolver, coinType),
      resolver,
    );
    const addr: string =
      coinType != EthCoinIndex
        ? await this._callMethod(
            resolverContract.methods.addr(nodeHash, coinType),
          )
        : await this._callMethod(resolverContract.methods.addr(nodeHash));
    if (!addr) return null;
    const data = Buffer.from(addr.replace('0x', ''), 'hex');
    return formatsByCoinType[coinType].encoder(data);
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param nodeHash
   */
  private getResolver(nodeHash) {
    return this.callEthMethod(this.ensContract.methods.resolver(nodeHash));
  }

  async _callMethod(method: { call: () => Promise<any> }): Promise<any> {
    try {
      return await method.call();
    } catch (error) {
      const { message }: { message: string } = error;
      if (message.match(/Invalid JSON RPC response/) || message.match(/legacy access request rate exceeded/)) {
        throw new ResolutionError('NamingServiceDown', { method: 'ENS' });
      }
      throw error;
    }
  }
}
