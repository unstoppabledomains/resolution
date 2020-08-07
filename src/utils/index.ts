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
    if (!object.hasOwnProperty(key)) continue;
    returnee[object[key]] = key;
  }
  return returnee;
}

export function signedInfuraLink(infura: string, network: string = 'mainnet'): string {
  return `https://${network}.infura.com/v3/${infura}`;
}

export function isLegacyResolver(resolverAddress: string): boolean {
  return ['0xa1cac442be6673c49f8e74ffc7c4fd746f3cbd0d',
  '0x878bc2f3f717766ab69c0a5f9a6144931e61aed3'].includes(resolverAddress.toLowerCase());
}
