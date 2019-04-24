import '@babel/polyfill'
import Ens from './ens'
import Zns from './zns'
import Rns from './rns'

const fetch = require('isomorphic-fetch');
const DEFAULT_URL = 'https://unstoppable-domains-api.appspot.com/v1';
const UNCLAIMED_DOMAIN_RESPONSE = {
  addresses: {},
  meta: {
    owner: null, //available domain
    ttl: 0,
    previous_owner: null,
  }
};

type Src = string | URL;

type Blockchain = boolean | {
  ens?: Src,
  zns?: Src,
}

class Namicorn {
  api: string;
  ens: Ens;
  rns: Rns; // ENS not a mistake
  zns: Zns;
  blockchain: boolean;

  constructor({blockchain = false, api = DEFAULT_URL}: { api?: Src, blockchain?: Blockchain } = {}) {
    this.api = api.toString();
    this.blockchain = !!blockchain;
    if (blockchain) {
      this.buildCore(blockchain)
    }
  }

  async resolve(domain) {
    if (this.blockchain) {
      return await this.resolveUsingBlockchain(domain)
    } else {
      const response = await fetch(`${this.api}/${domain}`);
      return response.json();
    }
  }

  async resolveUsingBlockchain(domain) {
    if (!this.isValidDomain(domain)) return null;
    var method = null;
    if (domain.match(/\.zil$/)) {
      method = this.zns;
    } else if (domain.match(/\.eth$/)) {
      method = this.ens;
    } else if (domain.match(/\.rsk$/)) {
      method = this.rns
    }
    var result = await method.resolve(domain) || UNCLAIMED_DOMAIN_RESPONSE
    return result;
  }

  async address(domain, currencyTicker) {
    const data = await this.resolve(domain);
    return data.addresses[currencyTicker.toUpperCase()];
  }

  isValidDomain(domain: string) {
    // Require dot in domain helps router to next() the request
    return domain.indexOf(".") > 0 &&
      /^((?![0-9]+$)(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}\.)*(?![0-9]+$)(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$/.test(domain);
  }

  buildCore(blockchain) {
    if (blockchain == true) {
      blockchain = {}
    }
    this.ens = new Ens(blockchain.ens)
    this.zns = new Zns(blockchain.zns)
    this.rns = new Rns(blockchain.rns)
  }
}

export { Namicorn, Namicorn as default }
