import ICnsReader, { Data } from './ICnsReader';
import Contract from '../utils/contract';
import { SourceDefinition, isNullAddress } from '../types';
import { NamingServiceName } from '..';
import FetchProvider from '../FetchProvider';
import { default as registryAbi } from './contract/registry';
import { default as resolverAbi } from './contract/resolver';

export default class CnsRegistryReader implements ICnsReader {
  readonly registryAddress?: string;
  readonly registryContract: Contract;
  readonly source: SourceDefinition;

  constructor(source: SourceDefinition = {}) {
    this.source = source;
    this.registryAddress = source.registry;
    if (this.registryAddress) {
      this.registryContract = new Contract(
        registryAbi,
        this.registryAddress,
        source.provider || new FetchProvider(NamingServiceName.CNS, source.url!));
    }
  }

  async record(tokenId: string, key: string): Promise<Data> {
    const { resolver } = await this.resolver(tokenId);
    if (isNullAddress(resolver)) {
      return {};
    }

    return await this.get(resolver, tokenId, key);
  }

  async resolver(tokenId: string): Promise<Data> {
    const [resolver] = await this.registryContract.call('resolverOf', [tokenId]) || [];
    return { resolver };
  }

  protected async get(resolver: string, tokenId: string, key: string): Promise<Data> {
    const resolverContract = new Contract(
      resolverAbi,
      resolver,
      this.source.provider || new FetchProvider(NamingServiceName.CNS, this.source.url!));

    const [value] = await resolverContract.call('get', [key, tokenId]) || [];
    return { resolver, values: [value] };
  }
}
