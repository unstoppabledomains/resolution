import { Provider } from '..';
import {  ResolutionMethod } from '../types/publicTypes';

export default interface NamingService {
  readonly name: ResolutionMethod;
  readonly network: number;
  readonly url: string | undefined;
  readonly registryAddress?: string;
  readonly provider: Provider;

  owner(domain: string): Promise<string>;
  resolver(domain: string): Promise<string>;
  namehash(domain: string): string;
  isSupportedDomain(domain: string): boolean;
  record(domain: string, key: string): Promise<string>;
  records(domain: string, keys: string[]): Promise<Record<string, string>>;
  serviceName(domain: string): ResolutionMethod;
  twitter(domain: string): Promise<string>;
  reverse(address: string, currencyTicker: string): Promise<string | null>;
  allRecords(domain: string): Promise<Record<string, string>>;
}

