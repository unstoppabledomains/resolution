import {
  EventFilter,
  RequestArguments,
  RpcProviderLogEntry,
  TransactionRequest,
} from './types';

/**
 * SourceDefinition object
 * @typedef {Object} SourceDefinition
 * @property {string} [url] - main blockchain api url
 * @property {string | number} [network] - blockchain network
 */
export interface SourceDefinition {
  url?: string;
  network?: string | number;
  registry?: string;
  provider?: Provider;
}

export enum NamingServiceName {
  ENS = 'ENS',
  CNS = 'CNS',
  ZNS = 'ZNS',
}
export type ResolutionMethod = NamingServiceName | 'UDAPI';

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
    owner: string | null;
    type: string; // available domain
    namehash: string;
    resolver: string;
    ttl: number;
  };
  records: {
    [key: string]: string;
  };
};

/**
 * Main configurational object for Resolution instance
 */
export type Blockchain = {
  ens?: NamingServiceSource;
  zns?: NamingServiceSource;
  cns?: NamingServiceSource;
  web3Provider?: Provider;
};

export interface Web3Version0Provider {
  sendAsync: ProviderMethod;
}
export interface Web3Version1Provider {
  send: ProviderMethod;
}
export type API = {
  url: string;
};

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
    namehash: '',
    resolver: '',
    owner: null, // available domain
    type: '',
    ttl: 0,
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

/**
 * @deprecated Use UnclaimedDomainResponse instead (deprecated since 0.3.4)
 */
export const UNCLAIMED_DOMAIN_RESPONSE = UnclaimedDomainResponse;

export const UDApiDefaultUrl = 'https://unstoppabledomains.com/api/v1';
export const DefaultAPI: API = {
  url: UDApiDefaultUrl,
};

/**
 * NamingServiceSource
 * just an alias
 * @typedef {string | boolean | SourceDefinition}
 */
export type NamingServiceSource = string | boolean | SourceDefinition;

export type NamehashOptions = {
  readonly format?: 'dec' | 'hex',
  readonly prefix?: boolean,
};

export const NamehashOptionsDefault = {format: 'hex', prefix: true} as const;

export enum DnsRecordType {
A="A",
AAAA="AAAA",
AFSDB="AFSDB",
APL="APL",
CAA="CAA",
CDNSKEY="CDNSKEY",
CDS="CDS",
CERT="CERT",
CNAME="CNAME",
CSYNC="CSYNC",
DHCID="DHCID",
DLV="DLV",
DNAME="DNAME",
DNSKEY="DNSKEY",
DS="DS",
EUI48="EUI48",
EUI64="EUI64",
HINFO="HINFO",
HIP="HIP",
HTTPS="HTTPS",
IPSECKEY="IPSECKEY",
KEY="KEY",
KX="KX",
LOC="LOC",
MX="MX",
NAPTR="NAPTR",
NS="NS",
NSEC="NSEC",
NSEC3="NSEC3",
NSEC3PARAM="NSEC3PARAM",
OPENPGPKEY="OPENPGPKEY",
PTR="PTR",
RP="RP",
RRSIG="RRSIG",
SIG="SIG",
SMIMEA="SMIMEA",
SOA="SOA",
SRV="SRV",
SSHFP="SSHFP",
SVCB="SVCB",
TA="TA",
TKEY="TKEY",
TLSA="TLSA",
TSIG="TSIG",
TXT="TXT",
URI="URI",
ZONEMD="ZONEMD",
}

export interface DnsRecord { type: DnsRecordType, TTL: number, data: string }
export type CryptoRecords = Record<string, string>;
export type DomainData = {
  owner: string,
  resolver: string,
  records: CryptoRecords,
};

export enum TickerVersion {
  ERC20 = "ERC20",
  TRON = "TRON",
  EOS = "EOS",
  OMNI = "OMNI"
}