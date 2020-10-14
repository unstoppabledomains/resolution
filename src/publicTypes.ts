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
  records?: {
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
