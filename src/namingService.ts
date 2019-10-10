import { SourceDefinition } from './types';

export default abstract class NamingService {
  protected abstract normalizeSourceDefinition(
    source: boolean | string | SourceDefinition,
  );

  normalizeSource(
    source: boolean | string | SourceDefinition,
  ): SourceDefinition {
    return this.normalizeSourceDefinition(source);
  }
}
