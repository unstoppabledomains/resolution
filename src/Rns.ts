import {isNullAddress, constructRecords} from './utils';
import {ContractMap, RnsSupportedNetwork} from './types';
import {ResolutionError, ResolutionErrorCode} from './errors/resolutionError';
import {
  CryptoRecords,
  Provider,
  NamingServiceName,
  Locations,
  UnsLocation,
  BlockchainType,
  DomainLocation,
  RnsSource,
} from './types/publicTypes';
import FetchProvider from './FetchProvider';
import {eip137Childhash, eip137Namehash} from './utils/namehash';
import {NamingService} from './NamingService';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';
import EthereumContract from './contracts/EthereumContract';
import RnsConfig from './config/rns-config.json';
import registry from './contracts/rns/registry';
import resolver from './contracts/rns/resolver';
import SupportedKeys from './config/resolver-keys.json';

/**
 * @internal
 */
export default class Rns extends NamingService {
  static readonly RegistryMap: ContractMap = this.getRegistryMap();
  static readonly ResolverMap: ContractMap = this.getResolverMap();

  static readonly UrlMap = {
    30: 'https://public-node.rsk.co',
    31: 'https://public-node.testnet.rsk.co',
  };

  static readonly NetworkNameMap = {
    mainnet: 30,
    testnet: 31,
  };

  readonly network: number;
  readonly name: NamingServiceName = NamingServiceName.RNS;
  readonly url: string;
  readonly provider: Provider;
  readonly registryContract: EthereumContract;
  readonly resolverContract: EthereumContract;

  constructor(
    source: RnsSource = {
      url: Rns.UrlMap[1],
      network: 'mainnet',
    },
  ) {
    super();
    this.checkNetworkConfig(source);
    this.network = Rns.NetworkNameMap[source.network];
    this.url = source['url'] || Rns.UrlMap[this.network];
    this.provider =
      source['provider'] || new FetchProvider(this.name, this.url!);
    this.registryContract = new EthereumContract(
      registry,
      source.registryAddress || Rns.RegistryMap[this.network],
      this.provider,
      source['proxyServiceApiKey'],
    );
    this.resolverContract = new EthereumContract(
      resolver,
      source.resolverAddress || Rns.ResolverMap[this.network],
      this.provider,
      source['proxyServiceApiKey'],
    );
  }

  async owner(domain: string): Promise<string> {
    if (!(await this.isSupportedDomain(domain))) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }

    const tokenId = this.namehash(domain);
    const resolverAddress = await this.callRegistryResolver(tokenId);
    if (isNullAddress(resolverAddress)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    const address = await this.callResolverAddr(tokenId);
    if (isNullAddress(address)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    return address.toLowerCase();
  }

  async resolver(domain: string): Promise<string> {
    return this.owner(domain);
  }

  namehash(domain: string): string {
    if (!this.checkDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
    return eip137Namehash(domain);
  }

  childhash(parentHash: string, label: string): string {
    return eip137Childhash(parentHash, label);
  }

  async isSupportedDomain(domain: string): Promise<boolean> {
    return this.checkDomain(domain);
  }

  async record(domain: string, key: string): Promise<string> {
    const record = (await this.records(domain, [key]))[key];
    if (!record) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        recordName: key,
      });
    }
    return record;
  }

  async getAddress(
    _domain: string,
    _network: string,
    _token: string,
  ): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'isSupportedDomain',
    });
  }

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    return await this.getCryptoRecords(domain, keys);
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    return this.getCryptoRecords(domain, [...Object.keys(SupportedKeys.keys)]);
  }

  async twitter(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'twitter',
    });
  }

  async reverse(
    address: string,
    currencyTicker: string,
  ): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverse',
    });
  }

  async reverseOf(
    address: string,
    location?: UnsLocation,
  ): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverseOf',
    });
  }

  async isRegistered(domain: string): Promise<boolean> {
    //TODO: check this!
    const tokenId = this.namehash(domain);
    const data = await this.callResolverAddr(tokenId);

    return !isNullAddress(data);
  }

  async getTokenUri(tokenId: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'getTokenUri',
    });
  }

  async getDomainFromTokenId(tokenId: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'getDomainFromTokenId',
    });
  }

  async isAvailable(domain: string): Promise<boolean> {
    return !(await this.isRegistered(domain));
  }

  async registryAddress(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'registryAddress',
    });
  }

  async locations(domains: string[]): Promise<Locations> {
    const recordsAddresses = await Promise.all(
      domains.map((domain) => this.callRegistryResolver(this.namehash(domain))),
    );

    return domains.reduce((locations, domain, i) => {
      let location: DomainLocation | null = null;
      const domainAddress = recordsAddresses[i];
      if (domainAddress) {
        location = {
          registryAddress: Rns.RegistryMap[this.network],
          resolverAddress: Rns.ResolverMap[this.network],
          networkId: this.network,
          blockchain: BlockchainType.RSK,
          ownerAddress: domainAddress,
          blockchainProviderUrl: this.url,
        };
      }
      return {
        ...locations,
        [domain]: location,
      };
    }, {} as Locations);
  }

  private checkDomain(domain: String): boolean {
    const tokens = domain.split('.');
    return (
      !!tokens.length &&
      tokens[tokens.length - 1] === 'rsk' &&
      tokens.every((v) => !!v.length)
    );
  }

  private checkNetworkConfig(source: RnsSource): void {
    if (!source.network) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: NamingServiceName.RNS,
      });
    }
    if (!RnsSupportedNetwork.guard(source.network)) {
      this.checkCustomNetworkConfig(source);
    }
  }

  private checkCustomNetworkConfig(source: RnsSource): void {
    if (!source.resolverAddress) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: NamingServiceName.RNS,
          config: 'resolverAddress',
        },
      );
    }
    if (!source.registryAddress) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: NamingServiceName.RNS,
          config: 'registryAddress',
        },
      );
    }
    if (!source['url'] && !source['provider']) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: NamingServiceName.RNS,
          config: 'url or provider',
        },
      );
    }
  }

  static getRegistryMap(): ContractMap {
    const map: ContractMap = {};
    for (const id of Object.keys(RnsConfig.networks)) {
      map[id] = RnsConfig.networks[id].contracts.Registry.address.toLowerCase();
    }
    return map;
  }

  static getResolverMap(): ContractMap {
    const map: ContractMap = {};
    for (const id of Object.keys(RnsConfig.networks)) {
      map[id] = RnsConfig.networks[id].contracts.Resolver.address.toLowerCase();
    }
    return map;
  }

  async callRegistryResolver(tokenId: string): Promise<string> {
    const [address] = await this.registryContract.call('resolver', [tokenId]);

    return address;
  }

  async callResolverAddr(tokenId: string): Promise<string> {
    const [address] = await this.resolverContract.call('addr', [tokenId]);

    return address;
  }

  private async getCryptoRecords(
    domain: string,
    keys: string[],
  ): Promise<CryptoRecords> {
    const tokenId = this.namehash(domain);
    const data = await this.callResolverAddr(tokenId);
    return constructRecords(keys, [data]);
  }
}
