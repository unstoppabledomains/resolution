import {
  BlockhainNetworkUrlMap,
  UnsSupportedNetwork,
  ProxyReaderMap,
  NullAddress,
  EventData,
} from './types';
import {UnsLayerSource} from '.';
import {ConfigurationError, ConfigurationErrorCode} from '.';
import {CryptoRecords, DomainData, UnsLocation} from './types/publicTypes';
import {constructRecords, EthereumNetworks, isNullAddress} from './utils';
import FetchProvider from './FetchProvider';
import EthereumContract from './contracts/EthereumContract';
import proxyReaderL1 from './contracts/uns/proxyReaderL1';
import UnsConfig from './config/uns-config.json';
import proxyReaderL2 from './contracts/uns/proxyReaderL2';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import {eip137Namehash} from './utils/namehash';
import registryL1 from './contracts/uns/registryL1';
import registryL2 from './contracts/uns/registryL2';
import {Interface} from '@ethersproject/abi';
import {default as resolverInterface} from './contracts/uns/resolver';
import SupportedKeys from './config/resolver-keys.json';

export default class UnsInternal {
  static readonly ProxyReaderMap: ProxyReaderMap = getProxyReaderMap();
  static readonly UrlMap: BlockhainNetworkUrlMap = {
    1: 'https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    4: 'https://rinkeby.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    137: 'https://polygon.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    80001:
      'https://polygon-mumbai.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
  };

  readonly network;
  readonly url;
  readonly provider;
  readonly readerContract;
  readonly location: UnsLocation;

  constructor(location: UnsLocation, source: UnsLayerSource) {
    this.checkNetworkConfig(location, source);
    this.location = location;
    this.network = EthereumNetworks[source.network];
    this.url = source['url'] || UnsInternal.UrlMap[this.network];
    this.provider =
      source['provider'] || new FetchProvider(this.location, this.url);
    this.readerContract = new EthereumContract(
      this.location === UnsLocation.Layer1 ? proxyReaderL1 : proxyReaderL2,
      source.proxyReaderAddress || UnsInternal.ProxyReaderMap[this.network],
      this.provider,
    );
  }

  async callReaderContract(method: string, params: string[]): Promise<any[]> {
    return this.readerContract.call(method, params);
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
      this.location === UnsLocation.Layer1 ? registryL1 : registryL2,
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

  private isLegacyResolver(resolverAddress: string): boolean {
    return this.isWellKnownLegacyResolver(resolverAddress);
  }

  private isWellKnownLegacyResolver(resolverAddress: string): boolean {
    const legacyAddresses =
      UnsConfig?.networks[this.network]?.contracts?.Resolver?.legacyAddresses;
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

  private async registryAddress(domainOrNamehash: string): Promise<string> {
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
    if (address === NullAddress) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: domainOrNamehash,
      });
    }
    return address;
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
          method: this.location,
          field: 'proxyReaderAddress',
        },
      );
    }
    if (!source['url'] && !source['provider']) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: this.location,
          config: 'url or provider',
        },
      );
    }
  }

  namehash(domain: string): string {
    if (!this.checkDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
    return eip137Namehash(domain);
  }

  private isValidProxyReader(address?: string): boolean {
    if (!address) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: this.location,
          config: 'proxyReaderAddress',
        },
      );
    }
    const ethLikePattern = new RegExp('^0x[a-fA-F0-9]{40}$');
    return ethLikePattern.test(address);
  }

  private async get(tokenId: string, keys: string[] = []): Promise<DomainData> {
    const [resolver, owner, values] = await this.readerContract.call(
      'getData',
      [keys, tokenId],
    );

    return {owner, resolver, records: constructRecords(keys, values)};
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
      UnsConfig?.networks[this.network]?.contracts?.Resolver?.deploymentBlock;
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
      return await this.getStandardRecords(tokenId);
    }
    return await this.getManyByHash(tokenId, keyTopics);
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
