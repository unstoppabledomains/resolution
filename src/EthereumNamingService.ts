import NamingService from './namingService';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import {
  BlockhanNetworkUrlMap,
  isNullAddress,
  NamingServiceName,
  NetworkIdMap,
  SourceDefinition,
} from './types';
import { invert } from './utils';
import Contract from './utils/contract';
import FetchProvider from './FetchProvider';

/** @internal */
export abstract class EthereumNamingService extends NamingService {
  readonly name: NamingServiceName;
  abstract registryAddress?: string;
  protected abstract getResolver(id: string): Promise<string>;
  protected registryContract: Contract;
  /** @internal */
  static readonly NetworkIdMap: NetworkIdMap = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
  };

  static readonly UrlMap: BlockhanNetworkUrlMap = {
    mainnet: 'https://mainnet.infura.io',
    ropsten: 'https://ropsten.infura.io',
    kovan: 'https://kovan.infura.io',
    rinkeby: 'https://rinkeby.infura.io',
    goerli: 'https://goerli.infura.io',
  };

  static readonly NetworkNameMap = invert(EthereumNamingService.NetworkIdMap);

  /**
   * Returns the resolver address of a domain if exists
   * @param domain - domain name
   * @throws ResolutionError with codes UnregisteredDomain or UnspecifiedResolver
   */
  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const ownerPromise = this.owner(domain);
    const resolverAddress = await this.getResolver(nodeHash);
    if (isNullAddress(resolverAddress)) {
      await this.throwOwnershipError(domain, ownerPromise);
    } else {
      // We don't care about this promise anymore
      // Ensure it doesn't generate a warning if it rejects
      ownerPromise.catch(() => {})
    }
    return resolverAddress;
  }

  /**
   * Look up for network from url provided
   * @param url - main api url for blockchain
   * @returns Network such as:
   *  - mainnet
   *  - testnet
   */
  private networkFromUrl(url: string | undefined): string | undefined {
    if (!url) {
      return undefined;
    }
    for (const key in EthereumNamingService.NetworkNameMap) {
      if (!EthereumNamingService.NetworkNameMap.hasOwnProperty(key)) continue;
      if (url.indexOf(key) >= 0) return key;
    }
  }

  protected normalizeSource(source: SourceDefinition): SourceDefinition {
    source = {...source };
    if (typeof source.network == 'number') {
      source.network = EthereumNamingService.NetworkIdMap[source.network] || source.network;
    }
    source.network = source.network || this.networkFromUrl(source.url) || 'mainnet';
    if (!source.provider) {
      source.url = source.url || EthereumNamingService.UrlMap[source.network];
    }
    return source;
  }

  /**
   * Checks if the current network is supported
   * @returns
   */
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  /**
   * Internal wrapper for ens method. Used to throw an error when ens is down
   *  @param method - method to be called
   *  @throws ResolutionError -> When blockchain is down
   */
  protected async callMethod(
    contract: Contract,
    methodname: string,
    params: string[],
  ): Promise<any> {
    try {
      return await contract.fetchMethod(methodname, params);
    } catch (error) {
      const { message }: { message: string } = error;
      if (
        message.match(/Invalid JSON RPC response/) ||
        message.match(/legacy access request rate exceeded/)
      ) {
        throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
          method: this.name,
        });
      }
      throw error;
    }
  }

  protected buildContract(abi, address) {
    return new Contract(abi, address, this.provider || new FetchProvider(this.name, this.url!));
  }

  protected async throwOwnershipError(
    domain,
    ownerPromise?: Promise<string | null>,
  ) {
    const owner = ownerPromise ? await ownerPromise : await this.owner(domain);
    if (isNullAddress(owner))
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
      domain,
    });
  }
}
