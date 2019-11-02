import { SourceDefinition } from './types';

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
  protected abstract normalizeSource(
    source: boolean | string | SourceDefinition,
  );
}
