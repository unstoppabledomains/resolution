import { SourceDefinition } from './types';

export default abstract class NamingService {
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  abstract resolution(domain: string): Promise<Object | null>;
  protected abstract normalizeSource(
    source: boolean | string | SourceDefinition,
  );
}
