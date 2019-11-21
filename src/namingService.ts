import { SourceDefinition, NamicornResolution } from './types';
import ResolutionError, { ResolutionErrorCode } from './resolutionError';
import BaseConnection from './baseConnection';

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
    source: boolean | string | SourceDefinition,
  ): SourceDefinition;

  protected ensureSupportedDomain(domain: string): void {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
  }
}
