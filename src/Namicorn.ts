import fetch from 'node-fetch';
import Ens from './Ens';
import Zns from './Zns';
import { Blockchain } from './types';

const DefaultUrl = 'https://unstoppabledomains.com/api/v1';

// Node env has special properties stored in process which are not inside the browser env.
// Multiple checks is to avoid hitting the undefined while going deeper.
const isNode = () => {
  if (typeof process === 'object') {
    if (typeof process.versions === 'object') {
      if (typeof process.versions.node !== 'undefined') {
        return true;
      }
    }
  }
  return false;
};

/**
 * Blockchain domain resolution library Namicorn.
 *
 * @example 
 * let namicorn = new Namicorn({blockchain: {ens: {url: 'https://mainnet.infura.io', network: 'mainnet'}}});
 * let domain = brad.zil
 * let resolution = namicorn.address(domain);
 */

/**
 * Generate documentation.
 * @param {SourceDefinition} source - blockchain source configuration
 */
class Namicorn {
  static readonly UNCLAIMED_DOMAIN_RESPONSE = {
    addresses: {},
    meta: {
      owner: null, //available domain
      ttl: 0,
    },
  };

  readonly api: string;
  readonly ens?: Ens;
  readonly zns?: Zns;
  readonly blockchain: boolean;


  constructor({
    blockchain = true,
    api = DefaultUrl,
  }: { api?: string; blockchain?: Blockchain } = {}) {
    this.api = api.toString();
    this.blockchain = !!blockchain;
    if (blockchain) {
      if (blockchain == true) {
        blockchain = {};
      }
      if (blockchain.ens === undefined) {
        blockchain.ens = true;
      }
      if (blockchain.zns === undefined) {
        blockchain.zns = true;
      }
      if (blockchain.ens) {
        this.ens = new Ens(blockchain.ens);
      }
      if (blockchain.zns) {
        this.zns = new Zns(blockchain.zns);
      }
    }
  }

/**
 * @param {string} domain - domain name to be resolved 
 * @return {Object} NamicornResolution
 *  @property {Object} addresses - resolution addresses for various currency addresses attached to the domain
 * @property {Object} meta - meta information about the owner of the domain 
 */
  async resolve(domain: string) {
    if (this.blockchain) {
      return await this.resolveUsingBlockchain(domain);
    } else {
      const response = isNode()
        ? await fetch(`${this.api}/${domain}`)
        : await window.fetch(`${this.api}/${domain}`);
      return response.json();
    }
  }

/**
 * @async
 * @param {string} domain - domain name to be resolved
 * @param {string} currencyTicker - currency ticker like BTC, ETH, ZIL
 * @return {string} address for specified currencyTicker or null
 */
  async address(domain: string, currencyTicker: string) {
    const data = await this.resolve(domain);
    return (data && data.addresses[currencyTicker.toUpperCase()]) || null;
  }

/**
 * This method is only for ens at the moment
 * @async
 * @param {string} address - address you wish to reverse
 * @param currencyTicker 
 * @return {string} - domain name attached to this address
 */
  async reverse(address: string, currencyTicker: string) {
    return await this.ens.reverse(address, currencyTicker);
  }

/**
 * Checks if the domain is in valid format
 * @param {string} domain - domain name to be checked
 * @return {boolean} 
 */
  isSupportedDomain(domain: string): boolean {
    return (
      (this.zns && this.zns.isSupportedDomain(domain)) ||
      (this.ens && this.ens.isSupportedDomain(domain))
    );
  }

/**
 * Checks if the domain is supported by the specified network as well as if it is in valid format
 * @param {string} domain - domain name to be checked
 * @return {boolean} 
 */
  isSupportedDomainInNetwork(domain: string): boolean {
    const methods = [this.ens, this.zns];
    const method = methods.find(
      method => method && method.isSupportedDomain(domain),
    );
    return method && method.isSupportedNetwork();
  }

/**
 * resolves the domain using blockchain call
 * @private
 * @async
 * @param {string} domain - domain name to be resolved
 * @return {Promise<NamicornResolution>}
 */
  private async resolveUsingBlockchain(domain: string) {
    const methods = [this.ens, this.zns];
    const method = methods.find(
      method => method && method.isSupportedDomain(domain),
    );
    if (!method) return null;
    var result = method && (await method.resolve(domain));
    return result || Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
  }
}

export { Namicorn, Namicorn as default };
