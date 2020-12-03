import ICnsReader, { Data } from './ICnsReader';
import Contract from '../utils/contract';


export default class CnsProxyReader implements ICnsReader {
  readonly proxyContract: Contract;

  constructor(contract: Contract) {
    this.proxyContract = contract;
  }

  records(tokenId: string, keys: string[]): Promise<Data> {
    return this.get(tokenId, keys);
  }

  resolver(tokenId: string): Promise<Data> {
    return this.get(tokenId);
  }

  async getMany(tokenId: string, keys: string[]): Promise<string[]> {
    const values =  await this.proxyContract.call('getMany', [keys, tokenId]);
    return values[0] as string[];
  }

  async getManyByHash(tokenId: string, hashes: string[]): Promise<[string[], string[]]> {
    return await this.proxyContract.call('getManyByHash', [hashes, tokenId]) as [string[], string[]];
  }

  protected async get(tokenId: string, keys: string[] = []): Promise<Data> {
    const [resolver, owner, values] = await this.proxyContract.call('getData', [
      keys,
      tokenId,
    ]);
    return { resolver, owner, values };
  }  
}
