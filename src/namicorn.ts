import fetch from 'node-fetch';
import Ens from './ens';
import Zns from './zns';
import Rns from './rns';

const DEFAULT_URL = 'https://unstoppabledomains.com/api/v1';
type Src = string | undefined;

type Blockchain =
  | boolean
  | {
      ens?: Src;
      zns?: Src;
      rns?: Src;
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
  rns: Rns;
  zns: Zns;
  blockchain: boolean;
  isBrowser: boolean;

  constructor({
    blockchain = false,
    api = DEFAULT_URL,
  }: { api?: Src; blockchain?: Blockchain } = {}) {
    this.api = api.toString();
    this.blockchain = !!blockchain;
    if (blockchain) {
      if (blockchain == true) {
        blockchain = {};
      }
      this.ens = new Ens(blockchain.ens);
      this.zns = new Zns(blockchain.zns);
      this.rns = new Rns(blockchain.rns);
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

  async resolveUsingBlockchain(domain: string) {
    if (!this.isValidDomain(domain)) return null;
    var method = null;
    if (domain.match(/\.zil$/)) {
      method = this.zns;
    } else if (
      domain.match(/\.eth$/) ||
      domain.match(/\.xyz/) ||
      domain.match(/\.luxe/)
    ) {
      method = this.ens;
    } else if (domain.match(/\.rsk$/)) {
      method = this.rns;
    }

    var result = method && (await method.resolve(domain));
    return result || Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
  }

  async address(domain: string, currencyTicker: string) {
    const data = await this.resolve(domain);
    return data.addresses[currencyTicker.toUpperCase()] || null;
  }

  isValidDomain(domain: string) {
    return (
      domain.indexOf('.') > 0 &&
      /^((?![0-9]+$)(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}\.)*(?![0-9]+$)(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$/.test(
        domain,
      )
    );
  }
  buildCore(blockchain) {}
}

export { Namicorn, Namicorn as default };
