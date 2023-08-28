import {
  fromBech32Address,
  toBech32Address,
  toChecksumAddress,
} from './utils/znsUtils';
import {isNullAddress, constructRecords} from './utils';
import {Dictionary, RnsSupportedNetwork, ZnsResolution} from './types';
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

/**
 * @internal
 */
export default class Rns extends NamingService {
  static readonly UrlMap = {
    30: 'https://public-node.rsk.co',
    31: 'https://public-node.testnet.rsk.co',
  };

  static readonly NetworkNameMap = {
    mainnet: 30,
    testnet: 31,
  };

  static readonly RegistryMap = {
    30: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
    31: '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
  };

  readonly network: number;
  readonly name: NamingServiceName = NamingServiceName.RNS;
  readonly url: string;
  readonly registryAddr: string;
  readonly provider: Provider;

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
    this.registryAddr =
      source['registryAddress'] || Rns.RegistryMap[this.network];
    this.checkRegistryAddress(this.registryAddr);
  }

  async owner(domain: string): Promise<string> {
    const recordAddresses = await this.getRecordsAddresses(domain);
    if (!recordAddresses) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }
    const [ownerAddress] = recordAddresses;
    if (!ownerAddress) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    return ownerAddress;
  }

  async resolver(domain: string): Promise<string> {
    const recordsAddresses = await this.getRecordsAddresses(domain);
    if (!recordsAddresses || !recordsAddresses[0]) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: domain,
      });
    }

    const [, resolverAddress] = recordsAddresses;
    if (isNullAddress(resolverAddress)) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain: domain,
      });
    }

    return resolverAddress;
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
    const records = await this.records(domain, [key]);
    const record = records[key];
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
    const records = await this.allRecords(domain);
    return constructRecords(keys, records);
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    const resolverAddress = await this.resolver(domain);
    return this.getResolverRecords(resolverAddress);
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
    const recordAddresses = await this.getRecordsAddresses(domain);
    return Boolean(recordAddresses && recordAddresses[0]);
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
    return this.registryAddr;
  }

  async locations(domains: string[]): Promise<Locations> {
    const recordsAddresses = await Promise.all(
      domains.map((domain) => this.getRecordsAddresses(domain)),
    );
    return domains.reduce((locations, domain, i) => {
      let location: DomainLocation | null = null;
      const domainRecordsAddresses = recordsAddresses[i];
      if (domainRecordsAddresses) {
        const [ownerAddress, resolverAddress] = domainRecordsAddresses;
        location = {
          registryAddress: this.registryAddr,
          resolverAddress,
          networkId: this.network,
          blockchain: BlockchainType.RSK,
          ownerAddress,
          blockchainProviderUrl: this.url,
        };
      }
      return {
        ...locations,
        [domain]: location,
      };
    }, {} as Locations);
  }

  private async getRecordsAddresses(
    domain: string,
  ): Promise<[string, string] | undefined> {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }

    const registryRecord = await this.getContractMapValue(
      this.registryAddr,
      'records',
      this.namehash(domain),
    );
    if (!registryRecord) {
      return undefined;
    }
    const [ownerAddress, resolverAddress] = registryRecord.arguments as [
      string,
      string,
    ];
    return [
      ownerAddress.startsWith('0x')
        ? toBech32Address(ownerAddress)
        : ownerAddress,
      resolverAddress,
    ];
  }

  private async getResolverRecords(
    resolverAddress: string,
  ): Promise<ZnsResolution> {
    if (isNullAddress(resolverAddress)) {
      return {};
    }
    const resolver = toChecksumAddress(resolverAddress);
    return ((await this.getContractField(resolver, 'records')) ||
      {}) as Dictionary<string>;
  }

  private async fetchSubState(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const params = [contractAddress.replace('0x', ''), field, keys];
    const method = 'GetSmartContractSubState';
    return this.provider.request({method, params});
  }

  private async getContractField(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const contractAddr = contractAddress.startsWith('zil1')
      ? fromBech32Address(contractAddress)
      : contractAddress;
    const result = (await this.fetchSubState(contractAddr, field, keys)) || {};
    return result[field];
  }

  private async getContractMapValue(
    contractAddress: string,
    field: string,
    key: string,
  ): Promise<any> {
    const record = await this.getContractField(contractAddress, field, [key]);
    return (record && record[key]) || null;
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

  private checkRegistryAddress(address: string): void {
    const addressValidator = new RegExp(
      '^0x[a-fA-F0-9]{40}$|^(0x|0X)?[0-9a-f]{40}$|^(0x|0X)?[0-9A-F]{40}$',
    );
    if (!addressValidator.test(address)) {
      throw new ConfigurationError(
        ConfigurationErrorCode.InvalidConfigurationField,
        {
          method: this.name,
          field: 'registryAddress',
        },
      );
    }
  }

  private checkCustomNetworkConfig(source: RnsSource): void {
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
}
