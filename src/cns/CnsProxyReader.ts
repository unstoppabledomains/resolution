import ICnsReader, { Data } from './ICnsReader';
import Contract from '../utils/contract';


export default class CnsProxyReader implements ICnsReader {
  readonly proxyContract: Contract;

  constructor(contract: Contract) {
    this.proxyContract = contract;
  }

  record(tokenId: string, key: string): Promise<Data> {
    return this.get(tokenId, [key]);
  }

  records(tokenId: string, keys: string[]): Promise<Data> {
    return this.get(tokenId, keys);
  }

  resolver(tokenId: string): Promise<Data> {
    return this.get(tokenId);
  }

  protected async get(tokenId: string, keys: string[] = []): Promise<Data> {
    const [resolver, owner, values] = await this.proxyContract.call('getData', [
      keys,
      tokenId,
    ]);
    return { resolver, owner, values };
  }
}
