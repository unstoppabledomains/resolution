import ConfigurationError, { ConfigurationErrorCode } from '../errors/configurationError';
import ResolutionError, { ResolutionErrorCode } from '../errors/resolutionError';
import { CryptoRecords, TickerVersion, EnsSupportedNetworks, CnsSupportedNetworks, Provider, ZnsSupportedNetworks, NamingServiceName } from '../publicTypes';
import { isCnsSupportedNetworks, NullAddresses, isEnsSupportedNetworks, isZnsSupportedNetworks } from '../types';
import Contract from './contract';

/**
 * Parses object in format { "key.key2.key3" : value } into { key: { key2: {key3: value } } }
 * @param object object to parse
 * @param key string to split
 * @param value value to make it equal to
 */
export function set<T>(object: T, key: string, value: any): T {
  let current = object;
  const tokens = key.split('.');
  const last = tokens.pop()!;
  tokens.forEach(token => {
    current[token] = typeof current[token] == 'object' ? current[token] : {};
    current = current[token];
  });
  current[last] = value;
  return object;
}

/**
 * Should invert the object (keys becomes values and values becomes keys)
 * @param object
 */
export function invert(
  object: Record<string, string | number>,
): Record<string, string> {
  const returnee = {};

  for (const key in object) {
    // eslint-disable-next-line no-prototype-builtins
    if (!object.hasOwnProperty(key)) {
      continue;
    }
    returnee[object[key]] = key;
  }
  return returnee;
}

export function signedInfuraLink(infura: string, network = 'mainnet'): string {
  return `https://${network}.infura.io/v3/${infura}`;
}

// Need more sophisticated way to determine if the contract is Legacy
export function isLegacyResolver(resolverAddress: string): boolean {
  if (isWellKnownLegacyResolver(resolverAddress)) {
    return true;
  }
  if (isUpToDateResolver(resolverAddress)) {
    return false;
  }
  // TODO we need to make an IO call to the contract to check the interface
  return false;
}

export function isWellKnownLegacyResolver(resolverAddress: string): boolean {
  return [
    '0xa1cac442be6673c49f8e74ffc7c4fd746f3cbd0d',
    '0x878bc2f3f717766ab69c0a5f9a6144931e61aed3',
  ].includes(resolverAddress.toLowerCase());
}

export function isUpToDateResolver(resolverAddress: string): boolean {
  return (
    resolverAddress.toLowerCase() ===
    '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842'
  );
}

export function hexToBytes(hexString: string): number[] {
  const hex = hexString.replace(/^0x/i, '');
  const bytes: number[] = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }

  return bytes;
}

/** @internal */
const CRYPTO_RESOLVER_ADVANCED_EVENTS_STARTING_BLOCK = '0x960844';

export async function getStartingBlock(
  contract: Contract,
  tokenId: string,
): Promise<string> {
  const logs = await contract.fetchLogs('ResetRecords', tokenId);
  const lastResetEvent = logs[logs.length - 1];
  return (
    lastResetEvent?.blockNumber ||
    CRYPTO_RESOLVER_ADVANCED_EVENTS_STARTING_BLOCK
  );
}

export function isStringArray(value: any): value is string[] {
  if (value instanceof Array) {
    return value.every(item => typeof item === 'string');
  }
  return false;
}

export function isNullAddress(
  key: string | null | undefined,
): key is undefined | null {
  if (!key) {
    return true;
  }
  return Object.values(NullAddresses).includes(key);
}

export function isSupportedChainVersion(obj: any): obj is TickerVersion {
  return Object.values(TickerVersion).includes(obj);
}

export function constructRecords(
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

export function ensureConfigured(source: {
  network: CnsSupportedNetworks | EnsSupportedNetworks | ZnsSupportedNetworks,
  url?: string,
  provider?: Provider
}, service: NamingServiceName): void {
  if (!source.network ||
   !( isCnsSupportedNetworks(source.network) ||
      isEnsSupportedNetworks(source.network) ||
      isZnsSupportedNetworks(source.network) 
   )
  ) {
    throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedNetwork, {
      method: service,
    });
  }

  if (!source.url && !source.provider) {
    throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
      method: service,
    });
  }
}

export function buildContract(abi: any, address: string, provider: Provider): Contract {
  return new Contract(abi, address, provider);
}

export function  ensureRecordPresence(
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