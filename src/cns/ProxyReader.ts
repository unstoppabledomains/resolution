import ICnsReader, { Data } from './ICnsReader';
import Contract from '../utils/contract';
import FetchProvider from '../FetchProvider';
import { default as proxyReaderAbi } from './contract/proxyReader';
import { SourceDefinition, NamingServiceName } from '../types';

export default class ProxyReader implements ICnsReader {
  readonly proxyAddress?: string;
  readonly proxyContract: Contract;

  constructor(source: SourceDefinition = {}) {
    this.proxyAddress = source.registry;
    if (this.proxyAddress) {
      this.proxyContract = new Contract(
        proxyReaderAbi,
        this.proxyAddress,
        source.provider || new FetchProvider(NamingServiceName.CNS, source.url!));
    }
  }

  record(tokenId: string, key: string): Promise<Data> {
    return this.get(tokenId, [key]);
  }

  resolver(tokenId: string): Promise<Data> {
    return this.get(tokenId);
  }

  protected async get(tokenId: string, keys: string[] = []): Promise<Data> {
    try {
      const [resolver, owner, values] =
        await this.proxyContract.call('getData', [keys, tokenId]) || [];
      return { resolver, owner, values };
    } catch (error) {
      return {};
    }
  }
}
