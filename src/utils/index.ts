import { ResolutionError, ResolutionErrorCode } from "../errors/resolutionError";
import Contract from "./contract";
/**
 * Parses object in format { "key.key2.key3" : value } into { key: { key2: {key3: value } } }
 * @param object object to parse
 * @param key string to split
 * @param value value to make it equal to
 */
export function set(object, key, value) {
  let current = object;
  const tokens = key.split('.');
  const last = tokens.pop();
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
export function invert(object) {
  const returnee = {};

  for (const key in object) {
    if (!object.hasOwnProperty(key)) {
      continue;
    }
    returnee[object[key]] = key;
  }
  return returnee;
}

export function signedInfuraLink(
  infura: string,
  network: string = 'mainnet',
): string {
  return `https://${network}.infura.com/v3/${infura}`;
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
  return resolverAddress.toLowerCase() === '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842';
}

export function hexToBytes(hexString: string): number[] {
  const hex = hexString.replace(/^0x/i, '');
  const bytes: number[] = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  
  return bytes;
}

export function ensureRecordPresence(
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

/** @internal */
const CRYPTO_RESOLVER_ADVANCED_EVENTS_STARTING_BLOCK = "0x960844";

export async function getStartingBlock(contract: Contract, tokenId: string): Promise<string> {
  const logs =  await contract.fetchLogs("ResetRecords", tokenId);
  const lastResetEvent = logs[logs.length - 1];
  return lastResetEvent?.blockNumber || CRYPTO_RESOLVER_ADVANCED_EVENTS_STARTING_BLOCK;
}
