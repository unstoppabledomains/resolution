import {
  EventFilter,
  RequestArguments,
  RpcProviderLogEntry,
  TransactionRequest,
} from './index';

export type Api = {api: true; url?: string; network?: number};

type NamingServiceSource = {url?: string} | {provider?: Provider};

export type UnsLayerSource = NamingServiceSource & {
  network: string;
  proxyServiceApiKey?: string;
  proxyReaderAddress?: string;
};

export type UnsSource = {
  locations: {Layer1: UnsLayerSource; Layer2: UnsLayerSource};
};

export type ZnsSource = NamingServiceSource & {
  network: string;
  registryAddress?: string;
};

export type SourceConfig = {
  uns?: UnsSource | Api;
  zns?: ZnsSource | Api;
};

export type ResolutionConfig = {
  sourceConfig?: SourceConfig;
  apiKey?: string;
};

export enum UnsLocation {
  Layer1 = 'UNSLayer1',
  Layer2 = 'UNSLayer2',
}

export enum NamingServiceName {
  UNS = 'UNS',
  ZNS = 'ZNS',
}

export type ResolutionMethod = NamingServiceName | UnsLocation | 'UDAPI';

export type AutoNetworkConfigs = {
  uns?: {
    locations: {
      Layer1: {url: string} | {provider: Provider};
      Layer2: {url: string} | {provider: Provider};
    };
  };
  zns?: {url: string} | {provider: Provider};
};

/**
 * ResolutionResulution
 * @typedef ResolutionResponse
 * @property {Object} addresses - Resolution addresses for various currency addresses attached to the domain
 * @property {Object} meta - meta information about the owner of the domain
 */
export type ResolutionResponse = {
  addresses: {
    [key: string]: string;
  };
  meta: {
    domain: string;
    owner: string | null;
    type: string; // available domain
    blockchain: BlockchainType | null;
    namehash: string;
    resolver: string;
    ttl: number;
  };
  records: {
    [key: string]: string;
  };
};
export interface Web3Version0Provider {
  sendAsync: ProviderMethod;
}
export interface Web3Version1Provider {
  send: ProviderMethod;
}

export interface ZilliqaProvider {
  middleware: any;
  send<R = any, E = string>(method: string, ...params: any[]): Promise<any>;
  sendBatch<R = any, E = string>(
    method: string,
    ...params: any[]
  ): Promise<any>;
  subscribe?(event: string, subscriber: any): symbol;
  unsubscribe?(token: symbol): void;
}

/**
 * @see https://eips.ethereum.org/EIPS/eip-1193
 */
export interface Provider {
  request: (request: RequestArguments) => Promise<unknown>;
}

type ProviderMethod = (
  payload: JsonRpcPayload,
  callback: (error: Error | null, result?: JsonRpcResponse) => void,
) => void;
export const UnclaimedDomainResponse: ResolutionResponse = {
  addresses: {},
  meta: {
    domain: '',
    namehash: '',
    resolver: '',
    owner: null, // available domain
    type: '',
    ttl: 0,
    blockchain: null,
  },
  records: {},
};

/**
 * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L216
 */
export interface JsonRpcPayload {
  jsonrpc: string;
  method: string;
  params: any[];
  id?: string | number;
}
export interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: string;
}

/**
 * @see https://github.com/ethers-io/ethers.js/blob/v5.0.4/packages/abstract-provider/src.ts/index.ts#L224
 */
export interface EthersProvider {
  call(transaction: TransactionRequest, blockTag?: never): Promise<string>;
  getLogs(filter: EventFilter): Promise<RpcProviderLogEntry[]>;
}

export const UDApiDefaultUrl = 'https://unstoppabledomains.com/api/v1';
export type NamehashOptions = {
  readonly format?: 'dec' | 'hex';
  readonly prefix?: boolean;
  readonly zns?: boolean;
};

export const NamehashOptionsDefault = {
  format: 'hex',
  prefix: true,
  zns: false,
} as const;

export enum DnsRecordType {
  A = 'A',
  AAAA = 'AAAA',
  AFSDB = 'AFSDB',
  APL = 'APL',
  CAA = 'CAA',
  CDNSKEY = 'CDNSKEY',
  CDS = 'CDS',
  CERT = 'CERT',
  CNAME = 'CNAME',
  CSYNC = 'CSYNC',
  DHCID = 'DHCID',
  DLV = 'DLV',
  DNAME = 'DNAME',
  DNSKEY = 'DNSKEY',
  DS = 'DS',
  EUI48 = 'EUI48',
  EUI64 = 'EUI64',
  HINFO = 'HINFO',
  HIP = 'HIP',
  HTTPS = 'HTTPS',
  IPSECKEY = 'IPSECKEY',
  KEY = 'KEY',
  KX = 'KX',
  LOC = 'LOC',
  MX = 'MX',
  NAPTR = 'NAPTR',
  NS = 'NS',
  NSEC = 'NSEC',
  NSEC3 = 'NSEC3',
  NSEC3PARAM = 'NSEC3PARAM',
  OPENPGPKEY = 'OPENPGPKEY',
  PTR = 'PTR',
  RP = 'RP',
  RRSIG = 'RRSIG',
  SIG = 'SIG',
  SMIMEA = 'SMIMEA',
  SOA = 'SOA',
  SRV = 'SRV',
  SSHFP = 'SSHFP',
  SVCB = 'SVCB',
  TA = 'TA',
  TKEY = 'TKEY',
  TLSA = 'TLSA',
  TSIG = 'TSIG',
  TXT = 'TXT',
  URI = 'URI',
  ZONEMD = 'ZONEMD',
}

export interface DnsRecord {
  type: DnsRecordType;
  TTL: number;
  data: string;
}
export type CryptoRecords = Record<string, string>;

export type DomainData = {
  owner: string;
  resolver: string;
  records: CryptoRecords;
  location: UnsLocation;
};

export interface Erc721Metadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
}

export type TokenUriMetadataAttribute =
  | {
      value: string | number;
    }
  | {
      trait_type: string;
      value: string | number;
    }
  | {
      display_type:
        | 'number'
        | 'date'
        | 'boost_number'
        | 'boost_percentage'
        | 'ranking';
      trait_type: string;
      value: number;
    };

export interface TokenUriMetadata extends Erc721Metadata {
  tokenId?: string;
  namehash?: string;
  external_link?: string;
  image_data?: string;
  image_url?: string;
  attributes?: Array<TokenUriMetadataAttribute>;
  background_color?: string;
  animation_url?: string;
  youtube_url?: string;
}

export interface DomainMetadata extends Erc721Metadata {
  properties: {
    records: CryptoRecords;
  };
}

export enum BlockchainType {
  ETH = 'ETH',
  MATIC = 'MATIC',
  ZIL = 'ZIL',
}

export type DomainLocation = {
  registryAddress: string;
  resolverAddress: string;
  networkId: number;
  blockchain: BlockchainType;
  ownerAddress: string;
  blockchainProviderUrl: string;
};

export type Locations = Record<string, DomainLocation | null>;

export type ReverseResolutionOptions = {
  location?: UnsLocation;
};
