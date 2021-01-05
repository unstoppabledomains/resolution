import { keccak_256 as sha3 } from 'js-sha3';
import NamingService from './NamingService';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import {
  BlockhanNetworkUrlMap,
  NetworkIdMap,
  nodeHash,
} from './types';
import { invert, isNullAddress } from './utils';
import Contract from './utils/contract';
import { NamingServiceName, SourceDefinition, ResolutionMethod } from './publicTypes';

export abstract class EthereumNamingService extends NamingService {
  readonly name: NamingServiceName;
  protected readerContract: Contract;

  static readonly UrlMap: BlockhanNetworkUrlMap = {
    1: 'https://main-rpc.linkpool.io',
    3: 'https://ropsten-rpc.linkpool.io',
  };

  static readonly NetworkNameMap = {
    mainnet: 1,
    ropsten: 3,
    rinkeby: 4,
    goerli: 5,
    kovan: 42,
  };

  static readonly NetworkIdMap: NetworkIdMap = invert(
    EthereumNamingService.NetworkNameMap,
  );

  constructor(source: SourceDefinition = {}, name: ResolutionMethod) {
    super(source, name);
    if (this.registryAddress) {
      this.readerContract = this.buildContract(
        this.readerAbi(),
        this.registryAddress,
      );
    }
  }

  protected abstract defaultRegistry(network: number): string | undefined;
  protected abstract readerAbi(): any;
  private networkFromUrl(url: string | undefined): string | undefined {
    if (!url) {
      return undefined;
    }

    for (const key in EthereumNamingService.NetworkNameMap) {
      // eslint-disable-next-line no-prototype-builtins
      if (!EthereumNamingService.NetworkNameMap.hasOwnProperty(key)) {
        continue;
      }
      if (url.indexOf(key) >= 0) {
        return EthereumNamingService.NetworkNameMap[key];
      }
    }
    return undefined;
  }

  protected normalizeSource(source: SourceDefinition): SourceDefinition {
    source = { ...source };
    source.network =
      typeof source.network == 'string'
        ? EthereumNamingService.NetworkNameMap[source.network]
        : source.network || this.networkFromUrl(source.url) || 1;
    if (!source.provider && !source.url) {
      source.url = source.network
        ? EthereumNamingService.UrlMap[source.network]
        : undefined;
    }


    source.registry = source.registry
      ? source.registry
      : this.defaultRegistry(source.network as number);
    return source;
  }

  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  childhash(
    parent: nodeHash,
    label: string,
  ): nodeHash {
    parent = parent.replace(/^0x/, '');
    const childHash = sha3(label);
    // eslint-disable-next-line no-undef
    return sha3(Buffer.from(parent + childHash, 'hex'));
  }

  protected async callMethod(
    contract: Contract,
    method: string,
    params: (string | string[])[],
  ): Promise<any> {
    try {
      const result = await contract.call(method, params);
      return result[0];
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

  protected buildContract(abi: any, address: string): Contract {
    return new Contract(abi, address, this.provider);
  }

  protected async throwOwnershipError(
    domain: string,
    ownerPromise?: Promise<string | null>,
  ): Promise<void> {
    const owner = ownerPromise ? await ownerPromise : await this.owner(domain);
    if (isNullAddress(owner)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
      domain,
    });
  }
}
