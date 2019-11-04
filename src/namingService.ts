import _ from 'lodash';
import {
  NamingServiceSource,
  SourceDefinition,
  EnsNetworkIdMap,
  NetworkIdMap,
  BlockhanNetworkUrlMap,
  NamicornResolution,
} from './types';
import ResolutionError from './resolutionError';

/**
 * Abstract class for different Naming Service supports like
 * - ENS
 * - ZNS
 */
export default abstract class NamingService {
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  abstract async resolve(domain: string): Promise<NamicornResolution | null> 
  abstract namehash(domain: string): string;
  protected abstract normalizeSource(
    source: NamingServiceSource,
  ): SourceDefinition;


}


export abstract class EtheriumNamingService extends NamingService {
  abstract registryAddress?: string;
  protected abstract async fetchAddress(resolver, nodeHash);

  readonly NetworkIdMap: NetworkIdMap = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'kovan',
    42: 'rinkeby',
    5: 'goerli',
  };

  readonly UrlMap:BlockhanNetworkUrlMap = {
    mainnet: 'https://mainnet.infura.io',
    ropsten: 'https://ropsten.infura.io',
    kovan: 'https://kovan.infura.io',
    rinkeby: 'https://rinkeby.infura.io',
    goerli: 'https://goerli.infura.io',
  };

  /** @ignore */
  readonly NetworkNameMap = _(this.NetworkIdMap)
    .invert()
    .mapValues((v, k) => parseInt(v))
    .value();

  /**
   *  @ignore
   * Internal wrapper for ens method. Used to throw an error when ens is down
   *  @param method - Method to be called
   *  @throws ResolutionError -> When blockchain is down
   */
  protected async callEthMethod(method: {
    call: () => Promise<any>;
  }): Promise<any> {
    try {
      return await method.call();
    } catch (error) {
      const { message }: { message: string } = error;
      if (message.match(/Invalid JSON RPC response/)) {
        throw new ResolutionError('NamingServiceDown', { method: 'ENS' });
      }
      throw error;
    }
  }

  /**
   * Look up for network from url provided
   * @ignore
   * @param url - main api url for blockchain
   * @returns - network such as:
   *  - mainnet
   *  - testnet
   */
  protected _etheriumNetworkFromUrl(
    url: string,
    NetworkIdMap: EnsNetworkIdMap,
  ): string {
    return _.find(NetworkIdMap, name => url.indexOf(name) >= 0);
  }

   /**
   * Normalizes the source object based on type
   * @ignore
   * @param source
   * @returns
   */
  protected normalizeSource(source: NamingServiceSource): SourceDefinition {
    switch (typeof source) {
      case 'boolean': {
        return {
          url: this.UrlMap['mainnet'],
          network: this._etheriumNetworkFromUrl(this.UrlMap['mainnet'], this.NetworkIdMap),
        };
      }
      case 'string': {
        return {
          url: source as string,
          network: this._etheriumNetworkFromUrl(source as string, this.NetworkIdMap),
        };
      }
      case 'object': {
        source = _.clone(source) as SourceDefinition;
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
          source.network = this._etheriumNetworkFromUrl(
            source.url,
            this.NetworkIdMap,
          );
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
}
