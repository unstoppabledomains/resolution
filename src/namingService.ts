import {
  NamingServiceSource,
  ResolutionMethod,
  NamingServiceName,
  SourceDefinition,
  NetworkIdMap,
  BlockhanNetworkUrlMap,
  ResolutionResponse,
  isNullAddress,
} from './types';
import { default as hash } from './ens/namehash';
import ResolutionError, { ResolutionErrorCode } from './resolutionError';
import BaseConnection from './baseConnection';
import { invert } from './utils';
import Contract from './utils/contract';

/**
 * Abstract class for different Naming Service supports like
 * - ENS
 * - ZNS
 *
 */
export default abstract class NamingService extends BaseConnection {
  readonly name: ResolutionMethod;
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  abstract namehash(domain: string): string;
  abstract address(domain: string, currencyTicker: string): Promise<string>;
  abstract owner(domain: string): Promise<string>;
  abstract record(domain: string, key: string): Promise<string>;
  abstract resolve(domain: string): Promise<ResolutionResponse>;
  abstract ipfsHash(domain: string): Promise<string>;
  abstract email(domain: string): Promise<string>;
  abstract httpUrl(domain: string): Promise<string>;

  serviceName(domain: string): NamingServiceName {
    return this.name as NamingServiceName;
  }

  protected abstract normalizeSource(
    source: NamingServiceSource,
  ): SourceDefinition;

  protected ensureSupportedDomain(domain: string): void {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
  }

  /* @internal */
  protected async ignoreResolutionError<T>(code: ResolutionErrorCode | undefined, promise: Promise<T>): Promise<T | undefined> {
    try {
      return await promise;
    } catch(error) {
      if (this.isResolutionError(error, code)) {
        return undefined;
      } else {
        throw error;
      }
    }
  }

  /* @internal */
  protected isResolutionError(error: any, code?: ResolutionErrorCode): boolean {
    return error instanceof ResolutionError && (!code || error.code === code);
  }
};

export abstract class EthereumNamingService extends NamingService {
  readonly name: NamingServiceName;
  abstract registryAddress?: string;
  abstract url: string;
  protected registryContract: Contract;
  /** @internal */
  readonly NetworkIdMap: NetworkIdMap = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'kovan',
    42: 'rinkeby',
    5: 'goerli',
  };

  readonly UrlMap: BlockhanNetworkUrlMap = {
    mainnet: 'https://mainnet.infura.io',
    ropsten: 'https://ropsten.infura.io',
    kovan: 'https://kovan.infura.io',
    rinkeby: 'https://rinkeby.infura.io',
    goerli: 'https://goerli.infura.io',
  };

  readonly NetworkNameMap = invert(this.NetworkIdMap);

  /**
   * Look up for network from url provided
   * @param url - main api url for blockchain
   * @returns Network such as:
   *  - mainnet
   *  - testnet
   */
  private networkFromUrl(url: string): string {
    for (const key in this.NetworkNameMap) {
      if (!this.NetworkNameMap.hasOwnProperty(key)) continue;
      if (url.indexOf(key) >= 0) return key;
    }
  }

  /**
   * Normalizes the source object based on type
   * @internal
   * @param source
   * @returns
   */
  protected normalizeSource(source: NamingServiceSource): SourceDefinition {
    switch (typeof source) {
      case 'boolean': {
        return {
          url: this.UrlMap['mainnet'],
          network: this.networkFromUrl(this.UrlMap['mainnet']),
        };
      }
      case 'string': {
        return {
          url: source as string,
          network: this.networkFromUrl(source as string),
        };
      }
      case 'object': {
        source = { ...source };
        if (typeof source.network == 'number') {
          source.network = this.NetworkIdMap[source.network];
        }
        if (source.registry) {
          source.network = source.network ? source.network : 'mainnet';
          source.url = source.url
            ? source.url
            : `https://${source.network}.infura.io`;
        }
        if (
          source.network &&
          !source.url &&
          this.NetworkNameMap.hasOwnProperty(source.network)
        ) {
          source.url = `https://${source.network}.infura.io`;
        }
        if (source.url && !source.network) {
          source.network = this.networkFromUrl(source.url);
        }
        return source;
      }
    }
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
    params: any,
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
    return new Contract(this.name, this.url, abi, address);
  }

  protected async throwOwnershipError(domain, ownerPromise?: Promise<string>) {
    const owner = ownerPromise ? await ownerPromise : await this.owner(domain);
    if (!owner || isNullAddress(owner))
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
      domain,
    });
  }
}
