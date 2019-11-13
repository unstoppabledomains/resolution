import { SourceDefinition, NamicornResolution, WhoIsStructure } from './types';
import ResolutionError from './resolutionError';

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
  abstract owner(domain: string): Promise<string | null>;
  abstract ipfsHash(domain: string): Promise<string>;
  abstract ipfsEmail(domain: string): Promise<string>;
  abstract ipfsRedirect(domain: string): Promise<string>
  abstract resolve(domain: string): Promise<NamicornResolution>;
  abstract supportsRecords(): boolean;
  protected abstract normalizeSource(
    source: boolean | string | SourceDefinition,
  );

  protected ensureSupportedDomain(domain: string): void {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError('UnsupportedDomain', { domain });
    }
  }
}
