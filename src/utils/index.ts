import ConfigurationError, { ConfigurationErrorCode } from '../errors/configurationError';
import { CryptoRecords, EnsSupportedNetworks, CnsSupportedNetworks, Provider, ZnsSupportedNetworks, NamingServiceName, Api } from '../types/publicTypes';
import { isCnsSupportedNetworks, NullAddresses, isEnsSupportedNetworks, isZnsSupportedNetworks } from '../types';

export function signedInfuraLink(infura: string, network = 'mainnet'): string {
  return `https://${network}.infura.io/v3/${infura}`;
}

export function hexToBytes(hexString: string): number[] {
  const hex = hexString.replace(/^0x/i, '');
  const bytes: number[] = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }

  return bytes;
}

export function isNullAddress(
  key: string | null | undefined,
): key is undefined | null {
  if (!key) {
    return true;
  }
  return Object.values(NullAddresses).includes(key);
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

function ensureCorrectNetwork(network: CnsSupportedNetworks | EnsSupportedNetworks | ZnsSupportedNetworks, service: NamingServiceName) {
  switch(service) {
  case NamingServiceName.CNS:
    return isCnsSupportedNetworks(network);
  case NamingServiceName.ENS:
    return isEnsSupportedNetworks(network);
  case NamingServiceName.ZNS:
    return isZnsSupportedNetworks(network);
  }
}

export function ensureConfigured(source: {
  network: CnsSupportedNetworks | EnsSupportedNetworks | ZnsSupportedNetworks,
  url?: string,
  provider?: Provider
}, service: NamingServiceName): void {
  if (!source.network || !ensureCorrectNetwork(source.network, service)) {
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

export function isApi(obj: any): obj is Api {
  return obj && !!obj.api;
}

export const domainEndingToNS = {
  "crypto": NamingServiceName.CNS,
  "zil": NamingServiceName.ZNS,
  "eth": NamingServiceName.ENS,
  "luxe": NamingServiceName.ENS,
  "xyz": NamingServiceName.ENS,
  "kred": NamingServiceName.ENS,
  "reverse": NamingServiceName.ENS
}