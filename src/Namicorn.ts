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

  async address(domain: string, currencyTicker: string) {
    const data = await this.resolve(domain);
    return (data && data.addresses[currencyTicker.toUpperCase()]) || null;
  }

  async reverse(address: string, currencyTicker: string) {
    return await this.ens.reverse(address, currencyTicker);
  }

  isSupportedDomain(domain: string): boolean {
    return (
      (this.zns && this.zns.isSupportedDomain(domain)) ||
      (this.ens && this.ens.isSupportedDomain(domain))
    );
  }

  isSupportedDomainInNetwork(domain: string): boolean {
    const methods = [this.ens, this.zns];
    const method = methods.find(
      method => method && method.isSupportedDomain(domain),
    );
    return method && method.isSupportedNetwork();
  }

  namehash(domain: string): string {
    const method = this.getNamingMethod(domain);
    if (!method) return null;
    const result = method.namehash(domain);
    return result;
  }
  
  private getNamingMethod(domain: string) {
    const methods = [this.ens, this.zns];
    const method = methods.find(
      method => method && method.isSupportedDomain(domain),
    );
    return method || null;
  }

  private async resolveUsingBlockchain(domain: string) {
    const method = this.getNamingMethod(domain);
    if (!method) return null;
    const result = await method.resolve(domain);
    return result || Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
  }
}

export { Namicorn, Namicorn as default };
