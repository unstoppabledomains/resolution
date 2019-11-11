import _ from 'lodash';
import {EtheriumNamingService} from './namingService';
import { NamingServiceSource, RegistryMap, NullAddress, NamicornResolution, address, ethnodehash } from './types';
import { hash } from 'eth-ens-namehash';
import { default as resolverInterface} from './cns/contract/resolver';
import { default as cnsInterface} from './cns/contract/registry';
import Web3 from 'web3';
import { ResolutionError } from '.';

/**
 * Class to support connection with Crypto naming service
 * @param network - network string such as
 * - mainnet
 * - ropsten
 * @param url - main api url such as
 * - https://mainnet.infura.io
 * @param registryAddress - address for a registry contract
 */
export default class Cns extends EtheriumNamingService {
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  /** @ignore */
  private cnsContract: any;
  /** @ignore */
  private web3: any;
  /** @ignore */
  readonly RegistryMap: RegistryMap = {
    mainnet: '0x4158485d4754D0F6D8D9b740bd37eD89b6891f35',
  };

 /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omited then defaults are used
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: NamingServiceSource = true) {
    super();
    source = this.normalizeSource(source);
    this.network = source.network as string;
    this.url = source.url;
    if (!this.network) {
      throw new Error('Unspecified network in Namicorn CNS configuration');
    }
    if (!this.url) {
      throw new Error('Unspecified url in Namicorn CNS configuration');
    }
    this.web3 = new Web3(source.url)
    this.registryAddress = source.registry
      ? source.registry
      : this.RegistryMap[this.network];
    if (this.registryAddress) {
      this.cnsContract = new this.web3.eth.Contract(
        cnsInterface,
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
    return domain.indexOf('.') > 0 && /^.{1,}\.(crypto)$/.test(domain);
  }

  /**
   * Resolves the given domain. [DEPRICATED]
   * @async
   * @param domain - domain name to be resolved
   * @returns- Returns a promise that resolves in an object
   */
  async resolve(domain: string): Promise<NamicornResolution> {
    try {    
      this.ensureSupportedDomain(domain);
      var [nodeHash, owner, ttl, resolver] = await this.getResolutionMeta(domain);
    } catch(err) {
      if (err instanceof ResolutionError)
        return null;
      throw err;
    }
    const address = await this.fetchAddress(resolver, nodeHash, 'ETH');
    return {
      addresses: {
        'ETH': address,
      },
      meta: {
          owner,
          type: 'cns',
          ttl
      }};
  }

  /**
   * Produces ENS namehash
   * @param domain - domain to be hashed
   * @return ENS namehash of a domain
   */
  namehash(domain: string): string {
    this.ensureSupportedDomain(domain)
    return hash(domain);
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
  async address(domain: string, currencyTicker: string): Promise<address> {
    const [nodeHash, _, __, resolver] = await this.getResolutionMeta(domain);
    var addr = await this.fetchAddress(resolver, nodeHash, currencyTicker);
    if (!addr)
      throw new ResolutionError('UnspecifiedCurrency', {
        domain,
        currencyTicker,
      });
    return addr;
  }

   /**
   * @ignore
   * @param resolver - Resolver address
   * @param nodeHash - namehash of a domain name
   */
  private async fetchAddress(resolver: address, nodeHash: ethnodehash, coinName?: string): Promise<address> {
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface,
      resolver
    );
    const addrKey = `crypto.${coinName.toUpperCase()}.address`;
    const addr: string = await this.callMethod(resolverContract.methods.get(addrKey, nodeHash))    
    return addr;
  }

  /** @ignore */
  private async getResolver(nodeHash): Promise<address> {
    return await this.callMethod(this.cnsContract.methods.resolverOf(nodeHash));
  }

  /** @ignore */
  async owner(nodeHash): Promise<address> {
    return await this.callMethod(this.cnsContract.methods.ownerOf(nodeHash))
  }

  /**
   * @ignore
   * This was done to make automated tests more configurable
   * @param domain
   * @retuns Promise that resolves to [nodehash, owner, ttl, resolver]
   */
  private async getResolutionMeta(domain: string): Promise<[ethnodehash, address, number, address]> {
    const nodeHash = this.namehash(domain);
    const ownerPromise = this.owner(nodeHash);
    const resolver:string = await this.getResolver(nodeHash);
    if (!resolver || resolver === NullAddress) {
      var owner = await ownerPromise;
      if (!owner || owner === NullAddress)
        throw new ResolutionError('UnregisteredDomain', { domain });
      throw new ResolutionError('UnspecifiedResolver', { domain });
    }
    const resolverContract = new this.web3.eth.Contract(resolverInterface, resolver);
    const ttl = await this.callMethod(resolverContract.methods.get('ttl', nodeHash));
    return [nodeHash, owner, parseInt(ttl) || 0, resolver];
  }

  /** @ignore */
  private async callMethod(method: { call: () => Promise<any> }): Promise<any> {
    try {
      return await method.call();
    } catch (error) {
      const { message }: { message: string } = error;
      if (message.match(/Invalid JSON RPC response/) || message.match(/legacy access request rate exceeded/)) {
        throw new ResolutionError('NamingServiceDown', { method: 'CNS' });
      }
      throw error;
    }
  }
}
