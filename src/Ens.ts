import {default as ensInterface} from './contracts/ens/ens';
import {default as resolverInterface} from './contracts/ens/resolver';
import {default as nameWrapperInterface} from './contracts/ens/nameWrapper';
import {default as baseRegistrarInterface} from './contracts/ens/baseRegistrar';
import {default as reverseRegistrarInterface} from './contracts/ens/reverseRegistrar';
import {EnsSupportedNetwork, EthCoinIndex, hasProvider} from './types';
import {ResolutionError, ResolutionErrorCode} from './errors/resolutionError';
import EthereumContract from './contracts/EthereumContract';
import EnsNetworkMap from 'ethereum-ens-network-map';
import {
  EnsSource,
  Locations,
  NamingServiceName,
  Provider,
  TokenUriMetadata,
  BlockchainType,
} from './types/publicTypes';
import {EthereumNetworksInverted, isNullAddress} from './utils';
import FetchProvider from './FetchProvider';
import {eip137Childhash, eip137Namehash, labelNameHash} from './utils/namehash';
import {NamingService} from './NamingService';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';
import {EthereumNetworks} from './utils';
import {requireOrFail} from './utils/requireOrFail';
import ensConfig from '../src/config/ens-config.json';
import Networking from './utils/Networking';

/**
 * @internal
 */
export default class Ens extends NamingService {
  readonly name = NamingServiceName.ENS;
  readonly network: number;
  readonly networkName: string;
  readonly url: string;
  readonly provider: Provider;
  readonly registryContract: EthereumContract;
  readonly nameWrapperContract: EthereumContract;
  readonly baseRegistrarContract: EthereumContract;
  readonly proxyServiceApiKey: string | undefined;

  constructor(source?: EnsSource) {
    super();
    let finalSource: EnsSource = {url: '', network: 'mainnet'};
    if (source) {
      finalSource = this.checkNetworkConfig(source);
    }
    this.network = EthereumNetworks[finalSource.network];
    this.networkName = finalSource.network;
    this.url = finalSource['url'];
    this.provider =
      finalSource['provider'] ||
      FetchProvider.factory(NamingServiceName.ENS, this.url);
    this.proxyServiceApiKey = finalSource['proxyServiceApiKey'];

    const registryAddress =
      finalSource['registryAddress'] || EnsNetworkMap[this.network];
    this.registryContract = new EthereumContract(
      ensInterface,
      registryAddress,
      this.provider,
      this.proxyServiceApiKey,
    );

    const nameWrapperAddress = this.determineNameWrapperAddress(this.network);
    this.nameWrapperContract = new EthereumContract(
      nameWrapperInterface,
      nameWrapperAddress,
      this.provider,
      this.proxyServiceApiKey,
    );

    const baseRegistrarAddress = this.determineBaseRegistrarAddress(
      this.network,
    );
    this.baseRegistrarContract = new EthereumContract(
      baseRegistrarInterface,
      baseRegistrarAddress,
      this.provider,
      this.proxyServiceApiKey,
    );
  }

  static async autoNetwork(
    config: {url: string} | {provider: Provider},
  ): Promise<Ens> {
    let provider: Provider;

    if (hasProvider(config)) {
      provider = config.provider;
    } else {
      if (!config.url) {
        throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
          method: NamingServiceName.ENS,
        });
      }
      provider = FetchProvider.factory(NamingServiceName.ENS, config.url);
    }

    const networkId = (await provider.request({
      method: 'net_version',
    })) as number;
    const networkName = EthereumNetworksInverted[networkId];
    if (!networkName || !EnsSupportedNetwork.guard(networkName)) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: NamingServiceName.ENS,
      });
    }
    return new this({network: networkName, provider: provider});
  }

  serviceName(): NamingServiceName {
    return this.name;
  }

  namehash(domain: string): string {
    if (!this.checkSupportedDomain(domain)) {
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
    return this.checkSupportedDomain(domain);
  }

  async owner(domain: string): Promise<string> {
    const namehash = this.namehash(domain);
    const isWrapped = await this.determineIsWrappedDomain(namehash);
    if (isWrapped) {
      return await this.callMethod(this.nameWrapperContract, 'ownerOf', [
        namehash,
      ]);
    }
    return await this.callMethod(this.registryContract, 'owner', [namehash]);
  }

  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const resolverAddr = await this.callMethod(
      this.registryContract,
      'resolver',
      [nodeHash],
    );
    if (isNullAddress(resolverAddr)) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver);
    }
    return resolverAddr;
  }

  async record(domain: string, key: string): Promise<string> {
    const returnee = await this.getTextRecord(domain, key);
    if (!returnee) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        key,
      });
    }

    return returnee;
  }

  async records(
    domain: string,
    keys: string[],
  ): Promise<Record<string, string>> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'records',
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

  // TODO: Figure out why nameHash() does not work for reverse address.
  // Current implementation uses reverseRegistrarContract to fetch the correct node hash.
  // @see: https://eips.ethereum.org/EIPS/eip-181
  async reverseOf(address: string): Promise<string | null> {
    const originalAddress = address;
    if (address.startsWith('0x')) {
      address = address.substr(2);
    }

    const reverseRegistrarAddress = this.determineReverseRegistrarAddress(
      this.network,
    );
    const reverseRegistrarContract = new EthereumContract(
      reverseRegistrarInterface,
      reverseRegistrarAddress,
      this.provider,
      this.proxyServiceApiKey,
    );

    const nodeHash = await this.reverseRegistrarCallToNode(
      reverseRegistrarContract,
      address,
    );
    const resolverAddress = await this.callMethod(
      this.registryContract,
      'resolver',
      [nodeHash],
    );

    if (isNullAddress(resolverAddress)) {
      return null;
    }

    const resolverContract = new EthereumContract(
      resolverInterface(resolverAddress, EthCoinIndex),
      resolverAddress,
      this.provider,
      this.proxyServiceApiKey,
    );

    const domainName = await this.resolverCallToName(
      resolverContract,
      nodeHash,
    );
    const fetchedAddress = await this.addr(domainName, BlockchainType.ETH);
    if (fetchedAddress?.toLowerCase() !== originalAddress.toLowerCase()) {
      return null;
    }

    return domainName;
  }

  async getTokenUri(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const isWrappedDomain = await this.determineIsWrappedDomain(tokenId);
    if (isWrappedDomain) {
      return `https://metadata.ens.domains/${this.networkName}/${this.nameWrapperContract.address}/${tokenId}`;
    }

    const hashedLabel = labelNameHash(domain);
    return `https://metadata.ens.domains/${this.networkName}/${this.baseRegistrarContract.address}/${hashedLabel}`;
  }

  async isAvailable(domain: string): Promise<boolean> {
    return !(await this.isRegistered(domain));
  }

  async registryAddress(domain: string): Promise<string> {
    return this.registryContract.address;
  }

  async isRegistered(domain: string): Promise<boolean> {
    const address = await this.owner(domain);
    return !isNullAddress(address);
  }

  // Tries to fetch domain metadata from both NameWrapper & BaseRegistrar contract
  // due to ENS having wrapped domains and not knowing which hash the user will input.
  async getDomainFromTokenId(hash: string): Promise<string> {
    let domainName = '';
    const nameWrapperMetadataResponse = await Networking.fetch(
      `https://metadata.ens.domains/${this.networkName}/${this.nameWrapperContract.address}/${hash}`,
      {},
    );
    if (nameWrapperMetadataResponse.status === 200) {
      const jsonResponse = await nameWrapperMetadataResponse.json();
      domainName = jsonResponse.name;
      return domainName;
    }

    const baseRegistrarMetadataResponse = await Networking.fetch(
      `https://metadata.ens.domains/${this.networkName}/${this.baseRegistrarContract.address}/${hash}`,
      {},
    );

    if (baseRegistrarMetadataResponse.status === 200) {
      const jsonResponse = await baseRegistrarMetadataResponse.json();
      domainName = jsonResponse.name;
    }

    return domainName;
  }

  async locations(domains: string[]): Promise<Locations> {
    const result: Locations = domains.reduce(async (locations, domain) => {
      locations[domain] = {
        resolverAddress: (await this.getResolverContract(domain)).address,
        registryAddress: this.registryContract.address,
        networkId: this.network,
        blockchain: BlockchainType.ETH,
        ownerAddress: (await this.addr(domain, BlockchainType.ETH)) || '',
        blockchainProviderUrl: this.url,
      };
      return locations;
    }, {});

    return result;
  }

  async getAddress(
    domain: string,
    network: string,
    token: string,
  ): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'getAddress',
    });
  }

  /**
   * This was done to make automated tests more configurable
   */
  private resolverCallToName(
    resolverContract: EthereumContract,
    nodeHash: string,
  ) {
    return this.callMethod(resolverContract, 'name', [nodeHash]);
  }

  /**
   * This was done to make automated tests more configurable
   */
  private async reverseRegistrarCallToNode(
    reverseRegistrarContract: EthereumContract,
    address: string,
  ): Promise<string> {
    return await this.callMethod(reverseRegistrarContract, 'node', [address]);
  }

  async twitter(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'twitter',
    });
  }

  async allRecords(domain: string): Promise<Record<string, string>> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'allRecords',
    });
  }

  protected getCoinType(currencyTicker: string): string {
    const bip44constants = requireOrFail(
      'bip44-constants',
      'bip44-constants',
      '^8.0.5',
    );
    const formatsByCoinType = requireOrFail(
      '@ensdomains/address-encoder',
      '@ensdomains/address-encoder',
      '>= 0.1.x <= 0.2.x',
    ).formatsByCoinType;
    const coin = bip44constants.findIndex(
      (item) =>
        item[1] === currencyTicker.toUpperCase() ||
        item[2] === currencyTicker.toUpperCase(),
    );
    if (coin < 0 || !formatsByCoinType[coin]) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedCurrency, {
        currencyTicker,
      });
    }

    return coin.toString();
  }

  async addr(
    domain: string,
    currencyTicker: string,
  ): Promise<string | undefined> {
    const resolver = await this.resolver(domain).catch(
      (err: ResolutionError) => {
        if (err.code !== ResolutionErrorCode.UnspecifiedResolver) {
          throw err;
        }
      },
    );

    const isWrappedDomain = await this.determineIsWrappedDomain(
      this.namehash(domain),
    );
    if (isWrappedDomain) {
      return await this.getAddressForWrappedDomain(domain);
    }

    if (!resolver) {
      const owner = await this.owner(domain);
      if (isNullAddress(owner)) {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain,
        });
      }
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain,
      });
    }

    const coinType = this.getCoinType(currencyTicker.toUpperCase());
    return await this.fetchAddress(resolver, domain, coinType);
  }

  private async fetchAddress(
    resolver: string,
    domain: string,
    coinType: string,
  ): Promise<string | undefined> {
    const formatsByCoinType = requireOrFail(
      '@ensdomains/address-encoder',
      '@ensdomains/address-encoder',
      '>= 0.1.x <= 0.2.x',
    ).formatsByCoinType;

    const resolverContract = new EthereumContract(
      resolverInterface(resolver, coinType),
      resolver,
      this.provider,
      this.proxyServiceApiKey,
    );

    const nodeHash = this.namehash(domain);
    const addr: string =
      coinType !== EthCoinIndex
        ? await this.callMethod(resolverContract, 'addr', [nodeHash, coinType])
        : await this.callMethod(resolverContract, 'addr', [nodeHash]);
    if (isNullAddress(addr)) {
      return undefined;
    }

    // eslint-disable-next-line no-undef
    const data = Buffer.from(addr.replace('0x', ''), 'hex');
    return formatsByCoinType[coinType].encoder(data);
  }

  // @see https://docs.ens.domains/ens-improvement-proposals/ensip-5-text-records
  private async getTextRecord(
    domain: string,
    key: string,
  ): Promise<string | undefined> {
    if (key === 'contenthash') {
      return await this.getContentHash(domain);
    }
    const nodeHash = this.namehash(domain);
    const resolver = await this.getResolverContract(domain);
    const textRecord = await this.callMethod(resolver, 'text', [nodeHash, key]);
    return textRecord;
  }

  // @see https://docs.ens.domains/ens-improvement-proposals/ensip-7-contenthash-field
  private async getContentHash(domain: string): Promise<string | undefined> {
    const contentHash = requireOrFail('content-hash', 'content-hash', '^2.5.2');
    const nodeHash = this.namehash(domain);
    const resolverContract = await this.getResolverContract(domain);
    const contentHashEncoded = await this.callMethod(
      resolverContract,
      'contenthash',
      [nodeHash],
    );
    const codec = contentHash.getCodec(contentHashEncoded);
    if (codec !== 'ipfs-ns') {
      return undefined;
    }
    return contentHash.decode(contentHashEncoded);
  }

  private async getResolverContract(
    domain: string,
    coinType?: string,
  ): Promise<EthereumContract> {
    const resolverAddress = await this.resolver(domain);
    return new EthereumContract(
      resolverInterface(resolverAddress, coinType),
      resolverAddress,
      this.provider,
      this.proxyServiceApiKey,
    );
  }

  private async callMethod(
    contract: EthereumContract,
    method: string,
    params: (string | string[])[],
  ): Promise<any> {
    const result = await contract.call(method, params);
    return result[0];
  }

  // Checks if domain is an ENS domain with tlds, or a reverse address.
  private checkSupportedDomain(domain: string): boolean {
    return (
      domain === 'eth' ||
      /^([^\s\\.]+\.)+(eth|luxe|xyz|kred)+$/.test(domain) ||
      /^([^\s\\.]+\.)(addr\.)(reverse)$/.test(domain)
    );
  }

  private checkNetworkConfig(source: EnsSource | undefined): EnsSource {
    if (!source?.network) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: this.name,
      });
    }
    if (!EnsSupportedNetwork.guard(source.network)) {
      this.checkCustomNetworkConfig(source);
    }

    return source;
  }

  private checkCustomNetworkConfig(source: EnsSource): void {
    if (!this.isValidRegistryAddress(source.registryAddress)) {
      throw new ConfigurationError(
        ConfigurationErrorCode.InvalidConfigurationField,
        {
          method: this.name,
          field: 'registryAddress',
        },
      );
    }
    if (!source['url'] && !source['provider']) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: this.name,
          config: 'url or provider',
        },
      );
    }
  }

  private isValidRegistryAddress(address?: string): boolean {
    if (!address) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: this.name,
          config: 'registryAddress',
        },
      );
    }
    const ethLikePattern = new RegExp('^0x[a-fA-F0-9]{40}$');
    return ethLikePattern.test(address);
  }

  private async getAddressForWrappedDomain(
    domain: string,
  ): Promise<string | undefined> {
    const addr1 = await this.getOwnerOfFromNameHashContract(domain);
    const addr2 = await this.owner(domain);

    if (addr1) {
      return addr1;
    }

    if (addr2) {
      return addr2;
    }

    return;
  }

  private determineNameWrapperAddress(network: number): string {
    return ensConfig.networks[network].contracts.NameWrapper.address;
  }

  private determineBaseRegistrarAddress(network: number): string {
    return ensConfig.networks[network].contracts.BaseRegistrarImplementation
      .address;
  }

  private determineReverseRegistrarAddress(network: number): string {
    return ensConfig.networks[network].contracts.ReverseRegistrar.address;
  }

  private async determineIsWrappedDomain(
    hashedDomain: string,
  ): Promise<boolean> {
    return await this.callMethod(this.nameWrapperContract, 'isWrapped', [
      hashedDomain,
    ]);
  }

  private async getOwnerOfFromNameHashContract(
    domain: string,
  ): Promise<string> {
    return await this.callMethod(this.nameWrapperContract, 'ownerOf', [
      this.namehash(domain),
    ]);
  }

  private async getMetadataFromTokenURI(
    tokenUri: string,
  ): Promise<TokenUriMetadata> {
    const resp = await Networking.fetch(tokenUri, {});
    if (resp.ok) {
      return resp.json();
    }

    throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
      providerMessage: await resp.text(),
      method: 'UDAPI',
      methodName: 'tokenURIMetadata',
    });
  }
}
