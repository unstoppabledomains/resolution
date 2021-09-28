import {
  BlockhainNetworkUrlMap,
  UnsSupportedNetwork,
  ProxyReaderMap,
  EventData,
} from './types';
import {UnsLayerSource} from '.';
import {ConfigurationError, ConfigurationErrorCode} from '.';
import {CryptoRecords, DomainData, UnsLocation} from './types/publicTypes';
import {constructRecords, EthereumNetworks, isNullAddress} from './utils';
import FetchProvider from './FetchProvider';
import EthereumContract from './contracts/EthereumContract';
import proxyReader from './contracts/uns/proxyReader';
import UnsConfig from './config/uns-config.json';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import {eip137Namehash} from './utils/namehash';
import registry from './contracts/uns/registry';
import {Interface} from '@ethersproject/abi';
import {default as resolverInterface} from './contracts/uns/resolver';
import SupportedKeys from './config/resolver-keys.json';

export default class UnsInternal {
  static readonly ProxyReaderMap: ProxyReaderMap = getProxyReaderMap();
  static readonly UrlMap: BlockhainNetworkUrlMap = {
    mainnet: 'https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    rinkeby: 'https://rinkeby.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    'polygon-mainnet':
      'https://polygon.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    'polygon-mumbai':
      'https://polygon-mumbai.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
  };

  readonly network: string;
  readonly url: string;
  readonly provider: FetchProvider;
  readonly readerContract: EthereumContract;
  readonly unsLocation: UnsLocation;

  constructor(unsLocation: UnsLocation, source: UnsLayerSource) {
    this.checkNetworkConfig(unsLocation, source);
    this.unsLocation = unsLocation;
    this.network = source.network;
    this.url = source['url'] || UnsInternal.UrlMap[this.network];
    this.provider =
      source['provider'] || new FetchProvider(this.unsLocation, this.url);
    this.readerContract = new EthereumContract(
      proxyReader,
      source.proxyReaderAddress ||
        UnsInternal.ProxyReaderMap[EthereumNetworks[this.network]],
      this.provider,
    );
  }

  async exists(domain: string): Promise<boolean> {
    const [exists] = await this.readerContract.call('exists', [
      this.namehash(domain),
    ]);
    return exists;
  }

  async getTokenUri(tokenId: string): Promise<string> {
    const [tokenURI] = await this.readerContract.call('tokenURI', [tokenId]);
    return tokenURI;
  }

  async registryAddress(domainOrNamehash: string): Promise<string> {
    if (
      !this.checkDomain(domainOrNamehash, domainOrNamehash.startsWith('0x'))
    ) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain: domainOrNamehash,
      });
    }
    const namehash = domainOrNamehash.startsWith('0x')
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

  async allRecords(domain: string): Promise<CryptoRecords> {
    const tokenId = this.namehash(domain);
    const resolver = await this.resolver(domain);

    if (!resolver) {
      return {};
    }
    const resolverContract = new EthereumContract(
      resolverInterface,
      resolver,
      this.provider,
    );
    if (this.isLegacyResolver(resolver)) {
      return this.getStandardRecords(tokenId);
    }

    return this.getAllRecords(resolverContract, tokenId);
  }

  async getDomainFromTokenId(tokenId: string): Promise<string> {
    const registryAddress = await this.registryAddress(tokenId);
    const registryContract = new EthereumContract(
      registry,
      registryAddress,
      this.provider,
    );
    const startingBlock = this.getStartingBlockFromRegistry(registryAddress);
    const newURIEvents = await registryContract.fetchLogs(
      'NewURI',
      tokenId,
      startingBlock,
    );

    if (!newURIEvents || newURIEvents.length === 0) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: `with tokenId ${tokenId}`,
      });
    }
    const rawData = newURIEvents[newURIEvents.length - 1].data;
    const decoded = Interface.getAbiCoder().decode(['string'], rawData);
    return decoded[decoded.length - 1];
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

  namehash(domain: string): string {
    if (!this.checkDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
    return eip137Namehash(domain);
  }

  private isLegacyResolver(resolverAddress: string): boolean {
    return this.isWellKnownLegacyResolver(resolverAddress);
  }

  private isWellKnownLegacyResolver(resolverAddress: string): boolean {
    const legacyAddresses =
      UnsConfig?.networks[EthereumNetworks[this.network]]?.contracts?.Resolver
        ?.legacyAddresses;
    if (!legacyAddresses || legacyAddresses.length === 0) {
      return false;
    }
    return (
      legacyAddresses.findIndex((address) => {
        return address.toLowerCase() === resolverAddress.toLowerCase();
      }) > -1
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

  private getStartingBlockFromRegistry(registryAddress: string): string {
    const contractDetails = Object.values(UnsConfig?.networks).reduce(
      (acc, network) => {
        const contracts = network.contracts;

        return [
          ...acc,
          ...Object.values(contracts).map((c) => ({
            address: c.address,
            deploymentBlock: c.deploymentBlock,
          })),
        ];
      },
      [],
    );

    const contractDetail = contractDetails.find(
      (detail) => detail.address === registryAddress,
    );
    if (!contractDetail || contractDetail?.deploymentBlock === '0x0') {
      return 'earliest';
    }
    return contractDetail.deploymentBlock;
  }

  private checkDomain(domain: string, passIfTokenID = false): boolean {
    if (passIfTokenID) {
      return true;
    }
    const tokens = domain.split('.');
    return (
      !!tokens.length &&
      tokens[tokens.length - 1] !== 'zil' &&
      !(
        domain === 'eth' ||
        /^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain)
      ) &&
      tokens.every((v) => !!v.length)
    );
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

  private async getStandardRecords(tokenId: string): Promise<CryptoRecords> {
    const keys = Object.keys(SupportedKeys.keys);
    return this.getMany(tokenId, keys);
  }

  private async getMany(
    tokenId: string,
    keys: string[],
  ): Promise<CryptoRecords> {
    return (await this.get(tokenId, keys)).records;
  }

  private async getStartingBlock(
    contract: EthereumContract,
    tokenId: string,
  ): Promise<string | undefined> {
    const defaultStartingBlock =
      UnsConfig?.networks[EthereumNetworks[this.network]]?.contracts?.Resolver
        ?.deploymentBlock;
    const logs = await contract.fetchLogs('ResetRecords', tokenId);
    const lastResetEvent = logs[logs.length - 1];
    return lastResetEvent?.blockNumber || defaultStartingBlock;
  }

  private async getAllRecords(
    resolverContract: EthereumContract,
    tokenId: string,
  ): Promise<CryptoRecords> {
    const startingBlock = await this.getStartingBlock(
      resolverContract,
      tokenId,
    );
    const logs = await this.getNewKeyEvents(
      resolverContract,
      tokenId,
      startingBlock || 'earliest',
    );
    const keyTopics = logs.map((event) => event.topics[2]);
    // If there are no NewKey events we want to check the standardRecords
    if (keyTopics.length === 0) {
      return this.getStandardRecords(tokenId);
    }
    return this.getManyByHash(tokenId, keyTopics);
  }

  private async getManyByHash(
    tokenId: string,
    hashes: string[],
  ): Promise<CryptoRecords> {
    const [keys, values] = (await this.readerContract.call('getManyByHash', [
      hashes,
      tokenId,
    ])) as [string[], string[]];
    return constructRecords(keys, values);
  }

  private async getNewKeyEvents(
    resolverContract: EthereumContract,
    tokenId: string,
    startingBlock: string,
  ): Promise<EventData[]> {
    return resolverContract.fetchLogs('NewKey', tokenId, startingBlock);
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
