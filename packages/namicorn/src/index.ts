import '@babel/polyfill'
import Core from '@namicorn/core'
import ENS from '@namicorn/ens'
import Ens from './ens'
import RNS from '@namicorn/rns'
import ZNS from '@namicorn/zns'

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
  core: Core;
  ens: Ens;

  constructor({blockchain = false, api = DEFAULT_URL}: { api?: Src, blockchain?: Blockchain } = {}) {
    this.api = api.toString();
    if (blockchain) {
      this.core = this.buildCore(blockchain)
    }
  }

  async resolve(domain) {
    if (this.core) {
      return await this.resolveUsingBlockchain(domain)
    } else {
      const response = await fetch(`${this.api}/${domain}`);
      return response.json();
    }
  }

  async resolveUsingBlockchain(domain) {
    if (!this.isValidDomain(domain)) return null;
    var method = null;
    //if (domain.match(/\.zil$/)) {
      //method = new Zns();
    //} 
    if (domain.match(/\.eth$/)) {
      method = this.ens;
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
    const core = new Core();
    if (blockchain.ens != false) {
      const ens = new ENS({ src: blockchain.ens });
      core.use(ens.middlewareFn);
    }
    if (blockchain.rns != false) {
      const rns = new RNS({
        src: blockchain.rns || 'https://public-node.rsk.co',
      });
      core.use(rns.middlewareFn);
    }
    if (blockchain.zns != false) {
      const zns = new ZNS({
        src: blockchain.zns || 'https://dev-api.zilliqa.com',
      });
      core.use(zns.middlewareFn);
    }
    return core;
  }
}

export { Namicorn, Namicorn as default }
