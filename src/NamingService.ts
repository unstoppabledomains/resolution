import {
  ResolutionMethod,
  Provider,
  ResolutionResponse,
  SourceDefinition,
  NamingServiceName,
} from '.';
import BaseConnection from './BaseConnection';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import FetchProvider from './FetchProvider';
import { nodeHash } from './types';
import { CryptoRecords } from './publicTypes';

export default abstract class NamingService extends BaseConnection {
  readonly name: ResolutionMethod;
  readonly network: number;
  readonly url: string | undefined;
  readonly registryAddress?: string;
  protected provider: Provider;
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  abstract owner(domain: string): Promise<string | null>;
  abstract records(domain: string, keys: string[]): Promise<CryptoRecords>;
  abstract resolve(domain: string): Promise<ResolutionResponse | null>;
  abstract resolver(domain: string): Promise<string>;
  abstract twitter(domain: string): Promise<string>;
  abstract childhash(
    parent: nodeHash,
    label: string,
  ): nodeHash;
  abstract allRecords(domain: string): Promise<CryptoRecords>;

  constructor(source: SourceDefinition, name: ResolutionMethod) {
    super();
    this.name = name;
    source = this.normalizeSource(source);
    this.ensureConfigured(source);
    this.url = source.url;
    this.provider = source.provider || new FetchProvider(this.name, this.url || '');
    this.network = source.network as number;
    this.registryAddress = source.registry;
  }

  serviceName(domain: string): NamingServiceName {
    return this.name as NamingServiceName;
  }

  namehash(domain: string): string {
    this.ensureSupportedDomain(domain);
    const parent =
      '0000000000000000000000000000000000000000000000000000000000000000';
    return '0x' + [parent]
      .concat(
        domain
          .split('.')
          .reverse()
          .filter(label => label),
      )
      .reduce((parent, label) =>
        this.childhash(parent, label),
      );
  }

  async record(domain: string, key: string): Promise<string> {
    const records = await this.records(domain, [key]);
    return NamingService.ensureRecordPresence(domain, key, records[key]);
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

  protected async ignoreResolutionErrors<T>(
    codes: ResolutionErrorCode[],
    promise: Promise<T>,
  ): Promise<T | undefined> {
    try {
      return await promise;
    } catch (error) {
      if (codes.some(code => this.isResolutionError(error, code))) {
        return undefined;
      } else {
        throw error;
      }

    }
  }

  protected isResolutionError(error: any, code?: ResolutionErrorCode): boolean {
    return error instanceof ResolutionError && (!code || error.code === code);
  }

  public static ensureRecordPresence(
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

  protected ensureConfigured(source: SourceDefinition): void {
    if (!source.network) {
      throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedNetwork, {
        method: this.name,
      });
    }

    if (!source.url && !source.provider) {
      throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
        method: this.name,
      });
    }
  }

  protected constructRecords(
    keys: string[],
    values: undefined | (string | undefined)[] | CryptoRecords,
  ): CryptoRecords {
    const records: CryptoRecords = {};
    keys.forEach((key, index) => {
      const value = (values instanceof Array ? values[index] : values?.[key]) || '';
      records[key] = value;
    });
    return records;
  }

}
