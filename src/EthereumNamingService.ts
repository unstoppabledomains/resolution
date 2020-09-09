import { keccak_256 as sha3 } from 'js-sha3';
import NamingService from './NamingService';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import {
  BlockhanNetworkUrlMap,
  isNullAddress,
  NamingServiceName,
  NetworkIdMap,
  SourceDefinition,
  nodeHash,
} from './types';
import { invert } from './utils';
import Contract from './utils/contract';

/** @internal */
export abstract class EthereumNamingService extends NamingService {
  readonly name: NamingServiceName;
  abstract registryAddress?: string;
  protected abstract getResolver(id: string): Promise<string>;
  protected registryContract: Contract;
  static readonly NetworkIdMap: NetworkIdMap = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
  };

  static readonly UrlMap: BlockhanNetworkUrlMap = {
    mainnet: 'https://main-rpc.linkpool.io',
    ropsten: 'https://ropsten-rpc.linkpool.io',
  };

  static readonly NetworkNameMap = invert(EthereumNamingService.NetworkIdMap);

  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const ownerPromise = this.owner(domain);
    const resolverAddress = await this.getResolver(nodeHash);
    if (isNullAddress(resolverAddress)) {
      await this.throwOwnershipError(domain, ownerPromise);
    } else {
      // We don't care about this promise anymore
      // Ensure it doesn't generate a warning if it rejects
      ownerPromise.catch(() => { });
    }
    return resolverAddress;
  }

  private networkFromUrl(url: string | undefined): string | undefined {
    if (!url) {
      return undefined;
    }
    for (const key in EthereumNamingService.NetworkNameMap) {
      if (!EthereumNamingService.NetworkNameMap.hasOwnProperty(key)) continue;
      if (url.indexOf(key) >= 0) return key;
    }
  }

  protected normalizeSource(source: SourceDefinition): SourceDefinition {
    source = { ...source };
    if (typeof source.network == 'number') {
      source.network = EthereumNamingService.NetworkIdMap[source.network] || source.network;
    }
    source.network = source.network || this.networkFromUrl(source.url) || 'mainnet';
    if (!source.provider) {
      source.url = source.url || EthereumNamingService.UrlMap[source.network];
    }
    return source;
  }

  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  childhash(
    parent: nodeHash,
    label: string,
    options: { prefix: boolean } = { prefix: true },
  ): nodeHash {
    parent = parent.replace(/^0x/, '');
    const childHash = sha3(label);
    const mynode = sha3(Buffer.from(parent + childHash, 'hex'));
    return (options.prefix ? '0x' : '') + mynode;
  }

  protected async callMethod(
    contract: Contract,
    method: string,
    params: string[],
  ): Promise<any> {
    try {
      const result = await contract.call(method, params);
      if (!result.length) {
        throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
          recordName: method,
          domain: params[0],
        });
      }
      return result[0];
    } catch (error) {
      if (error instanceof ResolutionError) {
        throw error;
      }

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
    return new Contract(abi, address, this.provider);
  }

  protected async throwOwnershipError(
    domain,
    ownerPromise?: Promise<string | null>,
  ) {
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
