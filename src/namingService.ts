import { SourceDefinition, NamicornResolution } from './types';
import ResolutionError from './resolutionError'

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
  abstract resolve(domain: string): Promise<NamicornResolution>
  protected abstract normalizeSource(
    source: boolean | string | SourceDefinition,
  );

  protected ensureSupportedDomain(domain: string): void {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError('UnsupportedDomain', { domain });
    }
  }
}
