import '@babel/polyfill'
import Core from '@namicorn/core'
import ENS from '@namicorn/ens'
import RNS from '@namicorn/rns'
import ZNS from '@namicorn/zns'

const fetch = require('isomorphic-fetch');
const DEFAULT_URL = 'https://unstoppable-domains-api.appspot.com/v1';

type Src = string | URL;

type Blockchain = boolean | {
  [srcKey: string] : Src
}

class Namicorn {
  api: string;
  core: Core;

  constructor({blockchain = false, api = DEFAULT_URL}: { api?: Src, blockchain?: Blockchain } = {}) {
    this.api = api.toString();
    if (blockchain) {
      this.core = this.buildCore(blockchain)
    }
  }

  async resolve(domain) {
    if (this.core) {
      return this.core.resolve(domain)
    } else {
      const response = await fetch(`${this.api}/${domain}`);
      return response.json();
    }
  }

  async address(domain, currencyTicker) {
    const data = await this.resolve(domain);
    return data.addresses[currencyTicker.toUpperCase()];
  }

  buildCore(blockchain) {
    const core = new Core();
    if (blockchain.ens != false) {
      const ens = new ENS({
        src: blockchain.ens || 'https://mainnet.infura.io',
      });
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
