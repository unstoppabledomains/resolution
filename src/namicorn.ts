import fetch from 'node-fetch';
import Ens from './ens';
import Zns from './zns';
import Rns from './rns';

const DefaultUrl = 'https://unstoppabledomains.com/api/v1';
type Src = string | undefined;

type Blockchain =
  | boolean
  | {
      ens?: Src;
      zns?: Src;
    };

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

  api: string;
  ens: Ens;
  zns: Zns;
  blockchain: boolean;
  isBrowser: boolean;

  constructor({
    blockchain = false,
    api = DefaultUrl,
  }: { api?: Src; blockchain?: Blockchain } = {}) {
    this.api = api.toString();
    this.blockchain = !!blockchain;
    if (blockchain) {
      if (blockchain == true) {
        blockchain = {};
      }
      this.ens = new Ens(blockchain.ens);
      this.zns = new Zns(blockchain.zns);
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
    return data && data.addresses[currencyTicker.toUpperCase()] || null;
  }

  async reverse(address: string, currencyTicker: string) {
    return await this.ens.reverse(address, currencyTicker);
  }

  isSupportedDomain(domain: string): Ens | Zns | false {
    if (this.ens.isSupportedDomain(domain))
      return this.ens;
    if (this.zns.isSupportedDomain(domain))
      return this.zns;
    return false;
  }

  private async resolveUsingBlockchain(domain: string) {
    const method = this.isSupportedDomain(domain);
    if (!method) return null;
    var result = method && (await method.resolve(domain));
    return result || Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
  }
}

export { Namicorn, Namicorn as default };
