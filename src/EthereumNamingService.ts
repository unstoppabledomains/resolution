import { keccak_256 as sha3 } from 'js-sha3';
import NamingService from './interfaces/NamingService';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import {
  BlockhanNetworkUrlMap,
  NetworkIdMap,
  nodeHash,
} from './types';
import { invert, isNullAddress } from './utils';
import Contract from './utils/contract';
import { NamingServiceName, ResolutionMethod, NamingServiceConfig } from './publicTypes';
import { NormalizedSource } from './types';

export abstract class EthereumNamingService extends NamingService {
  readonly name: NamingServiceName;
  protected readerContract: Contract;

  static readonly UrlMap: BlockhanNetworkUrlMap = {
    1: 'https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    3: 'https://ropsten.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
  };
  
  // Todo remove when ens whitelisting resolver contracts problem solved
  static readonly EnsUrlMap: BlockhanNetworkUrlMap = {
    1: 'https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee',
    3: 'https://ropsten.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee',
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

  constructor(name: ResolutionMethod, source?: NamingServiceConfig) {
    super(name, source);
    if (this.registryAddress) {
      this.readerContract = this.buildContract(
        this.readerAbi(),
        this.registryAddress,
      );
    }
  }

  protected abstract defaultRegistry(network: number): string | undefined;
  protected abstract readerAbi(): any;
  protected networkFromUrl(url: string | undefined): string | undefined {
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

  // Todo remove when ens whitelisting resolver contracts problem solved
  protected normalizeSource(source: NamingServiceConfig ): NormalizedSource {
    source.network =
      typeof source.network == 'string'
        ? EthereumNamingService.NetworkNameMap[source.network]
        : source.network || this.networkFromUrl(source.url) || 1;
    if (!source.provider && !source.url) {

      if (this.name === NamingServiceName.ENS) {
        source.url = source.network
          ? EthereumNamingService.EnsUrlMap[source.network]
          : EthereumNamingService.EnsUrlMap[1];
      } else {
        source.url = source.network
          ? EthereumNamingService.UrlMap[source.network]
          : EthereumNamingService.UrlMap[1];
      }
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
