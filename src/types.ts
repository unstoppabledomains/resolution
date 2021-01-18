export type Dictionary<T> = { [k: string]: T };
export type EnsNetworkIdMap = {
  [key: number]: string;
};
export interface BlockhanNetworkUrlMap {
  [key: string]: string | undefined;
}
export interface ProxyReaderMap {
  [key: string]: string;
}
export type NetworkIdMap = {
  [key: number]: string;
};

export type ProxyData = {
  owner: string,
  resolver: string,
  values: string[]
}

export type ProviderParams = unknown[] | object;
export interface RequestArguments {
  method: string;
  params?: ProviderParams;
}
export type TransactionRequest = {
  to?: unknown;
  from?: unknown;
  nonce?: unknown;

  gasLimit?: unknown;
  gasPrice?: unknown;

  data?: unknown;
  value?: unknown;
  chainId?: unknown;
};
export interface EventData {
  address: string;
  blockHash?: string;
  blockNumber?: string;
  data: string;
  logIndex?: string;
  removed?: boolean;
  topics: string[];
  transactionHash?: string;
  transactionIndex: string;
}
export interface EventFilter {
  address?: string;
  topics?: Array<string>;
  fromBlock?: string;
  toBlock?: string;
}
export type RpcProviderTestCase = {
  name?: string;
  request: RpcProviderRequestBody;
  response: string | RpcProviderLogEntry[];
}[];
export interface RpcProviderRequestBody {
  data?: string;
  to?: string;
  fromBlock?: string | number;
  toBlock?: string;
  address?: string;
  topics?: string[];
}

export interface RpcProviderLogEntry {
  blockNumber?: number;
  blockHash?: string;
  transactionIndex?: number;
  removed?: boolean;
  address: string;
  data: string;
  topics: string[];
  transactionHash?: string;
  logIndex?: number;
}
/**
 * Default structure of ZnsResolution records
 * @typedef {object} ZnsResolution
 */
export type ZnsResolution = {
  crypto?: Dictionary<{ address?: string; [key: string]: any }>;
  ttl?: string;
  [key: string]: any;
};
export type Bip44Constants = [number, string, string];
export type owner = string;
export type ttl = string;
export type nodeHash = string;
export const NullAddress = '0x0000000000000000000000000000000000000000';
export enum NullAddresses {
  '0x',
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000000000000000000000000000',
}

export const EthCoinIndex = '60';
