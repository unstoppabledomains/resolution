import { Provider } from '..';
import {  NamingServiceName } from '../publicTypes';

export default interface NamingService {
  readonly name: NamingServiceName;
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
  serviceName(domain: string):NamingServiceName;
  twitter(domain: string): Promise<string>;
  reverse(address: string, currencyTicker: string): Promise<string | null>;
  allRecords(domain: string): Promise<Record<string, string>>;
}

// isSupportedDomain(domain: string): boolean;
// isSupportedNetwork(): boolean;
// owner(domain: string): Promise<string | null>;
// records(domain: string, keys: string[]): Promise<CryptoRecords>;
// resolve(domain: string): Promise<ResolutionResponse | null>;
// resolver(domain: string): Promise<string>;
// twitter(domain: string): Promise<string>;
// childhash(
//   parent: nodeHash,
//   label: string,
// ): nodeHash;
// allRecords(domain: string): Promise<CryptoRecords>;

// constructor(name: ResolutionMethod, source?: NamingServiceConfig) {
//   this.name = name;
//   if (!source) {
//     source = this.getDefaultNormalizedSource(name);
//   }
//   const normalized = this.normalizeSource(source);
//   this.ensureConfigured(normalized);
//   this.url = normalized.url;
//   this.provider = normalized.provider || new FetchProvider(this.name, this.url!);
//   this.network = normalized.network as number;
//   this.registryAddress = normalized.registry;
// }

// private getDefaultNormalizedSource(name: ResolutionMethod): NamingServiceConfig {
//   switch (name) {
//   case NamingServiceName.ENS:
//     return {
//       url: "https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee",
//       network: "mainnet",
//     }
//   case NamingServiceName.ZNS: 
//     return {
//       url: "https://api.zilliqa.com",
//       network: "mainnet"
//     }
//   case NamingServiceName.CNS: 
//     return {
//       url: "https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39",
//       network: "mainnet"
//     }
//   case "UDAPI":
//     return {
//       url: "https://unstoppabledomains.com/api/v1/"
//     }
//   }
// }

// serviceName(domain: string): NamingServiceName {
//   return this.name as NamingServiceName;
// }

// namehash(domain: string): string {
//   this.ensureSupportedDomain(domain);
//   const parent =
//     '0000000000000000000000000000000000000000000000000000000000000000';
//   return '0x' + [parent]
//     .concat(
//       domain
//         .split('.')
//         .reverse()
//         .filter(label => label),
//     )
//     .reduce((parent, label) =>
//       this.childhash(parent, label),
//     );
// }

// async record(domain: string, key: string): Promise<string> {
//   const records = await this.records(domain, [key]);
//   return NamingService.ensureRecordPresence(domain, key, records[key]);
// }

// protected abstract normalizeSource(
//   source: NamingServiceConfig,
// ): NormalizedSource;


// }

// protected async ignoreResolutionErrors<T>(
//   codes: ResolutionErrorCode[],
//   promise: Promise<T>,
// ): Promise<T | undefined> {
//   try {
//     return await promise;
//   } catch (error) {
//     if (codes.some(code => this.isResolutionError(error, code))) {
//       return undefined;
//     } else {
//       throw error;
//     }

//   }
// }

// protected isResolutionError(error: any, code?: ResolutionErrorCode): boolean {
//   return error instanceof ResolutionError && (!code || error.code === code);
// }

// }
