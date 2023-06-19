import {UnsSupportedNetwork, ProxyReaderMap, NullAddress} from './types';
import {UnsLayerSource} from './types/publicTypes';
import ConfigurationError from './errors/configurationError';
import {ConfigurationErrorCode} from './errors/configurationError';
import {
  BlockchainType,
  DomainData,
  Locations,
  UnsLocation,
} from './types/publicTypes';
import {constructRecords, EthereumNetworks, isNullAddress} from './utils';
import FetchProvider from './FetchProvider';
import EthereumContract from './contracts/EthereumContract';
import proxyReader from './contracts/uns/proxyReader';
import UnsConfig from './config/uns-config.json';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import {eip137Namehash} from './utils/namehash';

export default class UnsInternal {
  static readonly ProxyReaderMap: ProxyReaderMap = getProxyReaderMap();

  readonly network: string;
  readonly url: string;
  readonly provider: FetchProvider;
  readonly readerContract: EthereumContract;
  readonly unsLocation: UnsLocation;
  readonly blockchain: BlockchainType;

  constructor(
    unsLocation: UnsLocation,
    source: UnsLayerSource,
    blockchain: BlockchainType,
  ) {
    this.unsLocation = unsLocation;
    this.checkNetworkConfig(unsLocation, source);
    this.network = source.network;
    this.blockchain = blockchain;
    this.url = source['url'];
    this.provider =
      source['provider'] || new FetchProvider(this.unsLocation, this.url);
    this.readerContract = new EthereumContract(
      proxyReader,
      source.proxyReaderAddress ||
        UnsInternal.ProxyReaderMap[EthereumNetworks[this.network]],
      this.provider,
      source['proxyServiceApiKey'],
    );
  }

  async exists(domain: string): Promise<boolean> {
    const [exists] = await this.readerContract.call('exists', [
      this.namehash(domain),
    ]);
    return exists;
  }

  async reverseOf(addr: string): Promise<{_hex: string}> {
    const [reverseHash] = await this.readerContract.call('reverseOf', [addr]);
    return reverseHash;
  }

  async getAddress(
    domain: string,
    network: string,
    token: string,
  ): Promise<{string}> {
    const tokenId = this.namehash(domain);
    const [addr] = await this.readerContract.call('getAddress', [
      network,
      token,
      tokenId,
    ]);

    return addr;
  }

  async getTokenUri(tokenId: string): Promise<string> {
    const [tokenURI] = await this.readerContract.call('tokenURI', [tokenId]);
    return tokenURI;
  }

  async registryAddress(domainOrNamehash: string): Promise<string> {
    const isNamehash = !domainOrNamehash.includes('.');
    if (!this.checkDomain(domainOrNamehash, isNamehash)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain: domainOrNamehash,
      });
    }
    const namehash = isNamehash
      ? domainOrNamehash
      : this.namehash(domainOrNamehash);
    const [address] = await this.readerContract.call('registryOf', [namehash]);
    if (isNullAddress(address)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: domainOrNamehash,
      });
    }
    return address;
  }

  async resolver(domain: string): Promise<string> {
    return (await this.getVerifiedData(domain)).resolver;
  }

  async get(tokenId: string, keys: string[] = []): Promise<DomainData> {
    const [resolver, owner, values] = await this.readerContract.call(
      'getData',
      [keys, tokenId],
    );

    return {
      owner,
      resolver,
      records: constructRecords(keys, values),
      location: this.unsLocation,
    };
  }

  async locations(domains: string[]): Promise<Locations> {
    const tokenIds = domains.map((d) => this.namehash(d));
    const [[resolvers, owners], ...registries] =
      await this.readerContract.multicall([
        {
          method: 'getDataForMany',
          args: [[], tokenIds],
        },
        ...tokenIds.map((id) => ({
          method: 'registryOf',
          args: [id],
        })),
      ]);

    const locations: Locations = domains.reduce((locations, domain, i) => {
      locations[domain] = null;
      if (owners && owners[i] !== NullAddress) {
        locations[domain] = {
          resolverAddress: resolvers[i],
          registryAddress: registries[i][0],
          ownerAddress: owners[i],
          networkId: EthereumNetworks[this.network],
          blockchain: this.blockchain,
          blockchainProviderUrl: this.url,
        };
      }
      return locations;
    }, {} as Locations);
    return locations;
  }

  namehash(domain: string): string {
    if (!this.checkDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
    return eip137Namehash(domain);
  }

  private checkDomain(domain: string, passIfTokenID = false): boolean {
    if (passIfTokenID) {
      return true;
    }
    const tokens = domain.split('.');
    return (
      !!tokens.length &&
      !(
        domain === 'eth' ||
        /^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain)
      ) &&
      tokens.every((v) => !!v.length)
    );
  }

  private async getVerifiedData(
    domain: string,
    keys?: string[],
  ): Promise<DomainData> {
    const tokenId = this.namehash(domain);
    const data = await this.get(tokenId, keys);
    if (isNullAddress(data.resolver)) {
      if (isNullAddress(data.owner)) {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain,
        });
      }
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        location: this.unsLocation,
        domain,
      });
    }
    return data;
  }

  private checkNetworkConfig(
    location: UnsLocation,
    source: UnsLayerSource,
  ): void {
    if (!source.network) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: location,
      });
    }
    if (
      source.proxyReaderAddress &&
      !this.isValidProxyReader(source.proxyReaderAddress)
    ) {
      throw new ConfigurationError(
        ConfigurationErrorCode.InvalidConfigurationField,
        {
          method: this.unsLocation,
          field: 'proxyReaderAddress',
        },
      );
    }
    if (!UnsSupportedNetwork.guard(source.network)) {
      this.checkCustomNetworkConfig(source);
    }
  }

  private checkCustomNetworkConfig(source: UnsLayerSource): void {
    if (!this.isValidProxyReader(source.proxyReaderAddress)) {
      throw new ConfigurationError(
        ConfigurationErrorCode.InvalidConfigurationField,
        {
          method: this.unsLocation,
          field: 'proxyReaderAddress',
        },
      );
    }
    if (!source['url'] && !source['provider']) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: this.unsLocation,
          config: 'url or provider',
        },
      );
    }
  }

  private isValidProxyReader(address?: string): boolean {
    if (!address) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: this.unsLocation,
          config: 'proxyReaderAddress',
        },
      );
    }
    const ethLikePattern = new RegExp('^0x[a-fA-F0-9]{40}$');
    return ethLikePattern.test(address);
  }
}

function getProxyReaderMap(): ProxyReaderMap {
  const map: ProxyReaderMap = {};
  for (const id of Object.keys(UnsConfig.networks)) {
    map[id] =
      UnsConfig.networks[id].contracts.ProxyReader.address.toLowerCase();
  }
  return map;
}
