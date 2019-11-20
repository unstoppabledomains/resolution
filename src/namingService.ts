import { NamicornResolution, SourceDefinition } from './types';
import ResolutionError, { ResolutionErrorCode } from './resolutionError';
import nodeFetch from 'node-fetch';

/**
 * Abstract class for different Naming Service supports like
 * - ENS
 * - ZNS
 */
export default abstract class NamingService {
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  abstract namehash(domain: string): string;
  abstract address(domain: string, currencyTicker: string): Promise<string>;
  abstract owner(domain: string): Promise<string>;
  abstract record(domain: string, key: string): Promise<string>;
  abstract resolve(domain: string): Promise<NamicornResolution>;
  protected abstract normalizeSource(
    source: boolean | string | SourceDefinition,
  ): SourceDefinition;

  protected ensureSupportedDomain(domain: string): void {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
  }

  /** @internal */
  protected isNode = () => {
    if (typeof process === 'object') {
      if (typeof process.versions === 'object') {
        if (typeof process.versions.node !== 'undefined') {
          return true;
        }
      }
    }
    return false;
  };

  /** @internal */
  protected async fetch(url, options) {
    return this.isNode() ? nodeFetch(url, options) : window.fetch(url, options);
  }
}
