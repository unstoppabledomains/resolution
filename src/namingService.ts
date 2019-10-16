import { SourceDefinition } from './types';

export default abstract class NamingService {
  protected abstract normalizeSource(
    source: boolean | string | SourceDefinition,
  );
}
