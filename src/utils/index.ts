import {
  BlockchainType,
  CryptoRecords,
  NamingServiceName,
} from '../types/publicTypes';
import {NullAddresses} from '../types';
import {UnsSupportedNetwork} from '../types';
import Tlds from './Tlds';
import ResolutionError, {ResolutionErrorCode} from '../errors/resolutionError';

type Providers = 'infura' | 'alchemy';
type NetworkSignedLinkURLs = Record<UnsSupportedNetwork, string>;
const ProviderURLMap: Record<Providers, NetworkSignedLinkURLs> = {
  infura: {
    mainnet: 'https://mainnet.infura.io/v3/',
    sepolia: 'https://sepolia.infura.io/v3/',
    'polygon-mainnet': 'https://polygon-mainnet.infura.io/v3/',
    'polygon-amoy': 'https://polygon-amoy.infura.io/v3/',
    'base-mainnet': 'https://base-mainnet.infura.io/v3/',
    'base-sepolia': 'https://base-sepolia.infura.io/v3/',
  },
  alchemy: {
    mainnet: 'https://eth-mainnet.g.alchemy.com/v2/',
    sepolia: 'https://eth-sepolia.g.alchemy.com/v2/',
    'polygon-mainnet': 'https://polygon-mainnet.g.alchemy.com/v2/',
    'polygon-amoy': 'https://polygon-amoy.g.alchemy.com/v2/',
    'base-mainnet': 'https://base-mainnet.g.alchemy.com/v2/',
    'base-sepolia': 'https://base-sepolia.g.alchemy.com/v2/',
  },
};

export function getLibAgent(): string {
  let libAgent = 'UnstoppableDomains/resolution-js';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pjson = require('../../package.json');
    libAgent += '/' + pjson.version;

    return libAgent;
  } catch (e) {
    return libAgent;
  }
}

export function signedInfuraLink(infura: string, network = 'mainnet'): string {
  return `https://${network}.infura.io/v3/${infura}`;
}

export function signedLink(
  key: string,
  network: UnsSupportedNetwork = 'mainnet',
  provider: Providers = 'alchemy',
): string {
  const url = ProviderURLMap[provider][network];
  return `${url}${key}`;
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
    records[key] =
      (values instanceof Array ? values[index] : values?.[key]) || '';
  });
  return records;
}

const EnsTlds = ['eth', 'luxe', 'kred', 'reverse'];

export const findNamingServiceName = async (
  domain: string,
): Promise<NamingServiceName | null> => {
  const tld = domain.split('.').pop();

  if (!tld) {
    return null;
  }

  if (EnsTlds.includes(tld)) {
    return NamingServiceName.ENS;
  }

  const tldsMeta = await Tlds.getTldsMeta();

  if (!tldsMeta) {
    throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
      providerMessage:
        'TLD meta is not available. Possibly failed to load supported TLDs data',
    });
  }

  if (tld in tldsMeta) {
    const {namingService, registrationBlockchain} = tldsMeta[tld];
    switch (namingService) {
      case 'UNS': {
        switch (registrationBlockchain) {
          case BlockchainType.BASE:
            return NamingServiceName.UNS_BASE;
          default:
            return NamingServiceName.UNS;
        }
      }
      case 'ENS':
        return NamingServiceName.ENS;
      case 'ZNS':
        return NamingServiceName.ZNS;
    }
  }

  return null;
};

export const EthereumNetworks = {
  mainnet: 1,
  sepolia: 11155111,
  'polygon-mainnet': 137,
  'polygon-amoy': 80002,
  'base-mainnet': 8453,
  'base-sepolia': 84532,
} as const;

export const EthereumNetworksInverted = Object.entries(EthereumNetworks).reduce<
  Record<number, string>
>(
  (acc, [originalKey, originalValue]) => ({
    ...acc,
    [originalValue]: originalKey,
  }),
  {},
);

export const wrapResult = <T>(func: () => T): Promise<WrappedResult<T>> => {
  let callResult;
  // Catch immediately in case it's not an async call.
  try {
    callResult = func();
  } catch (error) {
    return Promise.resolve({result: null, error});
  }

  // `Promise.resolve` will convert both promise-like objects and plain values to promises.
  const promise =
    callResult instanceof Promise ? callResult : Promise.resolve(callResult);
  // We wrap results and errors to avoid unhandled promise rejections in case we won't `await` every promise
  // and return earlier.
  return promise.then(
    (result) => ({result, error: null}),
    (error) => ({result: null, error}),
  );
};

export const unwrapResult = <T>(
  wrappedResult: WrappedResult<T>,
): UnwrapPromise<T> => {
  if (wrappedResult.error !== null) {
    throw wrappedResult.error;
  }
  return wrappedResult.result;
};

export type WrappedResult<T> =
  | {
      result: UnwrapPromise<T>;
      error: null;
    }
  | {
      result: null;
      // The correct type would be `any` or `unknown`, but we don't care about it in this particular context.
      // We need a more narrow type to let TypeScript infer that `result` is not `null` if `error` is.
      error: Error;
    };

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
