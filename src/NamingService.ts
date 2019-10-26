import { SourceDefinition } from './types';

/**
 * Abstract class for different Naming Service supports like 
 * - ENS
 * - ZNS
 */
export default abstract class NamingService {
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  protected abstract normalizeSource(
    source: boolean | string | SourceDefinition,
  );
}
