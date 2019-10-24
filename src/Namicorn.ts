import Ens from './Ens';
import Zns from './Zns';
import { Blockchain } from './types';

const DefaultUrl = 'https://unstoppabledomains.com/api/v1';

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
  }: {blockchain?: Blockchain } = {}) {
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
      return await this.resolveUsingBlockchain(domain);
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
