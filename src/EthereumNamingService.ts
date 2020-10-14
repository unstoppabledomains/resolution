import BN from 'bn.js';
import { keccak_256 as sha3 } from 'js-sha3';
import NamingService from './NamingService';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import {
  BlockhanNetworkUrlMap,
  isNullAddress,
  NetworkIdMap,
  nodeHash,
} from './types';
import { invert } from './utils';
import Contract from './utils/contract';
import { NamingServiceName, SourceDefinition } from './publicTypes';

export abstract class EthereumNamingService extends NamingService {
  readonly name: NamingServiceName;
  protected abstract getResolver(id: string): Promise<string>;
  protected registryContract: Contract;

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

  protected abstract defaultRegistry(network: number): string | undefined;

  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const ownerPromise = this.owner(domain);
    const resolverAddress = await this.getResolver(nodeHash);
    if (isNullAddress(resolverAddress)) {
      await this.throwOwnershipError(domain, ownerPromise);
    } else {
      // We don't care about this promise anymore
      // Ensure it doesn't generate a warning if it rejects
      ownerPromise.catch(() => {});
    }

    return resolverAddress;
  }

  private networkFromUrl(url: string | undefined): string | undefined {
    if (!url) {
      return undefined;
    }

    for (const key in EthereumNamingService.NetworkNameMap) {
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
