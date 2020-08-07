import BaseConnection from './baseConnection';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import {
  NamingServiceName,
  nodeHash,
  Provider,
  ResolutionMethod,
  ResolutionResponse,
  SourceDefinition,
} from './types';

/** @internal */
export default abstract class NamingService extends BaseConnection {
  readonly name: ResolutionMethod;
  readonly network: string;
  readonly url: string | undefined;
  protected provider?: Provider;
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  abstract namehash(domain: string): string;
  abstract address(domain: string, currencyTicker: string): Promise<string>;
  abstract owner(domain: string): Promise<string | null>;
  abstract record(domain: string, key: string): Promise<string>;
  abstract resolve(domain: string): Promise<ResolutionResponse | null>;
  abstract ipfsHash(domain: string): Promise<string>;
  abstract email(domain: string): Promise<string>;
  abstract httpUrl(domain: string): Promise<string>;
  abstract resolver(domain: string): Promise<string>;
  abstract chatId(domain: string): Promise<string>;
  abstract chatpk(domain: string): Promise<string>;
  abstract childhash(parent: nodeHash, label: string): nodeHash;
  abstract getAllKeys(domain: string): Promise<any>;

  constructor(source: SourceDefinition, name: ResolutionMethod) {
    super();
    source = this.normalizeSource(source);
    this.name = name;
    this.provider = source.provider;
    this.url = source.url as string;
    this.network = source.network as string;
    this.ensureConfigured();
  }

  serviceName(domain: string): NamingServiceName {
    return this.name as NamingServiceName;
  }

  protected abstract normalizeSource(
    source: SourceDefinition | undefined,
  ): SourceDefinition;

  protected ensureSupportedDomain(domain: string): void {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
  }

  /* @internal */
  protected async ignoreResolutionError<T>(
    code: ResolutionErrorCode | undefined,
    promise: Promise<T>,
  ): Promise<T | undefined> {
    try {
      return await promise;
    } catch (error) {
      if (this.isResolutionError(error, code)) {
        return undefined;
      } else {
        throw error;
      }
    }
  }

  /* @internal */
  protected isResolutionError(error: any, code?: ResolutionErrorCode): boolean {
    return error instanceof ResolutionError && (!code || error.code === code);
  }

  protected ensureRecordPresence(
    domain: string,
    key: string,
    value: string | undefined | null,
  ): string {
    if (value) {
      return value;
    }
    throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
      recordName: key,
      domain: domain,
    });
  }

  protected ensureConfigured(): void {
    if (!this.network) {
      throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedNetwork, {
        method: this.name,
      });
    }
    if (!this.url && !this.provider) {
      throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
        method: this.name,
      });
    }
  }
}
