import { SourceDefinition } from './types';

export default abstract class NamingService {
  abstract isSupportedDomain(domain: string): boolean
  abstract isSupportedNetwork(): boolean;
  protected abstract normalizeSource(
    source: boolean | string | SourceDefinition,
  );
}
