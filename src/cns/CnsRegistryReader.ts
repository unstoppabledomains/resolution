import ICnsReader, { Data } from './ICnsReader';
import Contract from '../utils/contract';
import { isNullAddress } from '../types';
import { default as resolverAbi } from './contract/resolver';


export default class CnsRegistryReader implements ICnsReader {
  readonly registryContract: Contract;

  constructor(contract: Contract) {
    this.registryContract = contract;
  }

  async records(tokenId: string, keys: string[]): Promise<Data> {
    const { resolver } = await this.resolver(tokenId);
    if (isNullAddress(resolver)) {
      return {};
    }

    return await this.getMany(resolver, tokenId, keys);
  }

  async resolver(tokenId: string): Promise<Data> {
    const [resolver] = await this.registryContract.call('resolverOf', [
      tokenId,
    ]);
    return { resolver };
  }

  protected async getMany(
    resolver: string,
    tokenId: string,
    keys: string[],
  ): Promise<Data> {
    const resolverContract = new Contract(
      resolverAbi,
      resolver,
      this.registryContract.provider,
    );

    const [value] = await resolverContract.call('getMany', [keys, tokenId]);
    return { resolver, values: value };
  }
}
