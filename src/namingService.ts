import BaseConnection from './baseConnection';
import ResolutionError, { ResolutionErrorCode } from './resolutionError';
import {
  NamingServiceName,
  NamingServiceSource,
  nodeHash,
  ResolutionMethod,
  ResolutionResponse,
  SourceDefinition,
  Web3Provider,
} from './types';

/** @internal */
export default abstract class NamingService extends BaseConnection {
  readonly name: ResolutionMethod;
  protected web3Provider?: Web3Provider;
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

  constructor(web3Provider?: Web3Provider) {
    super();
    this.web3Provider = web3Provider;
  }

  serviceName(domain: string): NamingServiceName {
    return this.name as NamingServiceName;
  }

  protected abstract normalizeSource(
    source: NamingServiceSource,
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
}
