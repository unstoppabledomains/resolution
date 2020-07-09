import {
  NamingServiceSource,
  ResolutionMethod,
  NamingServiceName,
  SourceDefinition,
  NetworkIdMap,
  BlockhanNetworkUrlMap,
  ResolutionResponse,
  isNullAddress,
  Provider,
  nodeHash,
} from './types';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import BaseConnection from './baseConnection';
import { invert } from './utils';
import Contract from './utils/contract';
import ConfigurationError, { ConfigurationErrorCode } from './errors/configurationError';

/** @internal */
export default abstract class NamingService extends BaseConnection {
  readonly name: ResolutionMethod;
  readonly network: string | undefined;
  readonly url: string | undefined;
  protected provider?: Provider;
  abstract isSupportedDomain(domain: string): boolean;
  abstract isSupportedNetwork(): boolean;
  abstract namehash(domain: string): string;
  abstract address(domain: string, currencyTicker: string): Promise<string>;
  abstract owner(domain: string): Promise<string | null>;
  abstract record(domain: string, key: string): Promise<string>;
  abstract resolve(domain: string): Promise<ResolutionResponse | null>;
  abstract ipfsHash(domain: string): Promise<string>;
  abstract email(domain: string): Promise<string>;
  abstract httpUrl(domain: string): Promise<string>;
  abstract resolver(domain: string): Promise<string>;
  abstract chatId(domain: string): Promise<string>;
  abstract chatpk(domain: string): Promise<string>;
  abstract childhash(parent: nodeHash, label: string): nodeHash;

  constructor(source: SourceDefinition, name: ResolutionMethod) {
    super();
    source = this.normalizeSource(source);
    this.name = name;
    this.provider = source.provider;
    this.url = source.url as string;
    this.network = source.network as string;
    this.ensureConfigured();
  }

  serviceName(domain: string): NamingServiceName {
    return this.name as NamingServiceName;
  }

  protected abstract normalizeSource(
    source: SourceDefinition | undefined,
  ): SourceDefinition;

  protected ensureSupportedDomain(domain: string): void {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
  }

  /* @internal */
  protected async ignoreResolutionError<T>(
    code: ResolutionErrorCode | undefined,
    promise: Promise<T>,
  ): Promise<T | undefined> {
    try {
      return await promise;
    } catch (error) {
      if (this.isResolutionError(error, code)) {
        return undefined;
      } else {
        throw error;
      }
    }
  }

  /* @internal */
  protected isResolutionError(error: any, code?: ResolutionErrorCode): boolean {
    return error instanceof ResolutionError && (!code || error.code === code);
  }

  protected ensureRecordPresence(domain: string, key: string, value: string | undefined | null): string {
    if (value) {
      return value;
    }
    throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
      recordName: key,
      domain: domain,
    });
  }

  protected ensureConfigured(): void {
    if (!this.network && !this.provider) {
      throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedNetwork, {
        method: this.name,
      });
    }
    if (!this.url && !this.provider) {
      throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
        method: this.name,
      });
    }
  }

  protected isEmptyConfig(source: SourceDefinition | undefined): boolean {
    return !source || !Object.values(source).find(v => v)
  }
}

/** @internal */
export abstract class EthereumNamingService extends NamingService {
  readonly name: NamingServiceName;
  abstract registryAddress?: string;
  protected abstract getResolver(id: string): Promise<string>;
  protected registryContract: Contract;
  /** @internal */
  static readonly NetworkIdMap: NetworkIdMap = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
  };

  static readonly UrlMap: BlockhanNetworkUrlMap = {
    mainnet: 'https://mainnet.infura.io',
    ropsten: 'https://ropsten.infura.io',
    kovan: 'https://kovan.infura.io',
    rinkeby: 'https://rinkeby.infura.io',
    goerli: 'https://goerli.infura.io',
  };

  static readonly NetworkNameMap = invert(EthereumNamingService.NetworkIdMap);

  /**
   * Returns the resolver address of a domain if exists
   * @param domain - domain name
   * @throws ResolutionError with codes UnregisteredDomain or UnspecifiedResolver
   */
  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const ownerPromise = this.owner(domain);
    const resolverAddress = await this.getResolver(nodeHash);
    if (!resolverAddress || isNullAddress(resolverAddress)) {
      await this.throwOwnershipError(domain, ownerPromise);
    } else {
      // We don't care about this promise anymore
      // Ensure it doesn't generate a warning if it rejects
      ownerPromise.catch(() => {})
    }
    return resolverAddress;
  }

  /**
   * Look up for network from url provided
   * @param url - main api url for blockchain
   * @returns Network such as:
   *  - mainnet
   *  - testnet
   */
  private networkFromUrl(url: string): string | undefined {
    for (const key in EthereumNamingService.NetworkNameMap) {
      if (!EthereumNamingService.NetworkNameMap.hasOwnProperty(key)) continue;
      if (url.indexOf(key) >= 0) return key;
    }
  }

  /**
   * Normalizes the source object based on type
   * @internal
   * @param source
   * @returns
   */
  protected normalizeSource(source): SourceDefinition {
    source = this.isEmptyConfig(source) ? {network: 'mainnet'} : {...source };
    if (typeof source.network == 'number') {
      source.network = EthereumNamingService.NetworkIdMap[source.network];
    }
    if (source.registry) {
      source.network = source.network ? source.network : 'mainnet';
      source.url = source.url
        ? source.url
        : `https://${source.network}.infura.io`;
    }
    if (
      source.network &&
      !source.url &&
      EthereumNamingService.NetworkNameMap.hasOwnProperty(source.network)
    ) {
      source.url = `https://${source.network}.infura.io`;
    }
    if (source.url && !source.network) {
      source.network = this.networkFromUrl(source.url);
    }
    return source;
  }

  /**
   * Checks if the current network is supported
   * @returns
   */
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  /**
   * Internal wrapper for ens method. Used to throw an error when ens is down
   *  @param method - method to be called
   *  @throws ResolutionError -> When blockchain is down
   */
  protected async callMethod(
    contract: Contract,
    methodname: string,
    params: string[],
  ): Promise<any> {
    try {
      return await contract.fetchMethod(methodname, params);
    } catch (error) {
      const { message }: { message: string } = error;
      if (
        message.match(/Invalid JSON RPC response/) ||
        message.match(/legacy access request rate exceeded/)
      ) {
        throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
          method: this.name,
        });
      }
      throw error;
    }
  }

  protected buildContract(abi, address) {
    return new Contract(this.name, this.url, abi, address, this.provider);
  }

  protected async throwOwnershipError(
    domain,
    ownerPromise?: Promise<string | null>,
  ) {
    const owner = ownerPromise ? await ownerPromise : await this.owner(domain);
    if (!owner || isNullAddress(owner))
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
      domain,
    });
  }
}
