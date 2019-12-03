import {
  NamingServiceSource,
  SourceDefinition,
  NetworkIdMap,
  BlockhanNetworkUrlMap,
  NamicornResolution,
  Bip44Constants,
} from './types';
import { formatsByCoinType } from '@ensdomains/address-encoder';
import ResolutionError, { ResolutionErrorCode } from './resolutionError';
import BaseConnection from './baseConnection';
import { invert } from './utils';

/**
 * Abstract class for different Naming Service supports like
 * - ENS
 * - ZNS
 *
 */
export default abstract class NamingService extends BaseConnection {
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  abstract namehash(domain: string): string;
  abstract address(domain: string, currencyTicker: string): Promise<string>;
  abstract owner(domain: string): Promise<string>;
  abstract record(domain: string, key: string): Promise<string>;
  abstract resolve(domain: string): Promise<NamicornResolution>;
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
}
export abstract class EtheriumNamingService extends NamingService {
  abstract registryAddress?: string;
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
   * @ignore
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
          source.network = this.networkFromUrl(
            source.url
          );
        }
        return source;
      }
    }
  }

    /** @ignore */
    protected getCoinType(currencyTicker: string): number {
      const constants: Bip44Constants[] = require('bip44-constants');
      const coin = constants.findIndex(
        item =>
          item[1] === currencyTicker.toUpperCase() ||
          item[2] === currencyTicker.toUpperCase(),
      );
      if (coin < 0 || !formatsByCoinType[coin])
        throw new ResolutionError(ResolutionErrorCode.UnsupportedCurrency, { currencyTicker });
      return coin;
    }

   /**
   * Checks if the current network is supported
   * @returns
   */
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }
}
