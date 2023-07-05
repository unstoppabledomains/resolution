import {UnsSupportedNetwork, hasProvider} from './types';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import {
  constructRecords,
  isNullAddress,
  EthereumNetworksInverted,
  wrapResult,
  unwrapResult,
} from './utils';
import {
  UnsSource,
  CryptoRecords,
  DomainData,
  NamingServiceName,
  Provider,
  UnsLocation,
  Locations,
  BlockchainType,
  DomainMetadata,
} from './types/publicTypes';
import {isValidTwitterSignature} from './utils/TwitterSignatureValidator';
import FetchProvider from './FetchProvider';
import {
  eip137Childhash,
  eip137Namehash,
  fromHexStringToDecimals,
} from './utils/namehash';
import {NamingService} from './NamingService';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';
import UnsInternal from './UnsInternal';
import Networking from './utils/Networking';
import SupportedKeys from './config/resolver-keys.json';

const ensureValidSourceConfig = (source: UnsSource): void => {
  if (
    !source.locations ||
    !source.locations.Layer1 ||
    !source.locations.Layer2
  ) {
    throw new ConfigurationError(ConfigurationErrorCode.NetworkConfigMissing, {
      method: NamingServiceName.UNS,
      config: !source?.locations?.Layer1 ? 'Layer1' : 'Layer2',
    });
  }

  const layer1Config = source.locations.Layer1;
  if (!layer1Config['url'] && !layer1Config['provider']) {
    throw new ConfigurationError(ConfigurationErrorCode.NetworkConfigMissing, {
      method: NamingServiceName.UNS,
      config: 'Layer1.url',
    });
  }

  const layer2Config = source.locations.Layer2;
  if (!layer2Config['url'] && !layer2Config['provider']) {
    throw new ConfigurationError(ConfigurationErrorCode.NetworkConfigMissing, {
      method: NamingServiceName.UNS,
      config: 'Layer2.url',
    });
  }

  return;
};

/**
 * @internal
 */
export default class Uns extends NamingService {
  public unsl1: UnsInternal;
  public unsl2: UnsInternal;
  readonly name: NamingServiceName = NamingServiceName.UNS;

  constructor(source?: UnsSource) {
    super();
    if (source) {
      ensureValidSourceConfig(source);
    } else {
      source = {
        locations: {
          Layer1: {
            url: '',
            network: 'mainnet',
          },
          Layer2: {
            url: '',
            network: 'polygon-mainnet',
          },
        },
      };
    }

    this.unsl1 = new UnsInternal(
      UnsLocation.Layer1,
      source.locations.Layer1,
      BlockchainType.ETH,
    );
    this.unsl2 = new UnsInternal(
      UnsLocation.Layer2,
      source.locations.Layer2,
      BlockchainType.MATIC,
    );
  }

  static async autoNetwork(config: {
    locations: {
      Layer1: {url: string} | {provider: Provider};
      Layer2: {url: string} | {provider: Provider};
    };
  }): Promise<Uns> {
    let providerLayer1: Provider;
    let providerLayer2: Provider;

    if (
      hasProvider(config.locations.Layer1) &&
      hasProvider(config.locations.Layer2)
    ) {
      providerLayer1 = config.locations.Layer1.provider;
      providerLayer2 = config.locations.Layer2.provider;
    } else {
      if (!config.locations.Layer1['url'] || !config.locations.Layer2['url']) {
        throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
          method: NamingServiceName.UNS,
        });
      }
      providerLayer1 = FetchProvider.factory(
        NamingServiceName.UNS,
        config.locations.Layer1['url'],
      );
      providerLayer2 = FetchProvider.factory(
        NamingServiceName.UNS,
        config.locations.Layer2['url'],
      );
    }

    const networkIdLayer1 = (await providerLayer1.request({
      method: 'net_version',
    })) as number;
    const networkIdLayer2 = (await providerLayer2.request({
      method: 'net_version',
    })) as number;
    const networkNameLayer1 = EthereumNetworksInverted[networkIdLayer1];
    const networkNameLayer2 = EthereumNetworksInverted[networkIdLayer2];
    if (
      !networkNameLayer1 ||
      !UnsSupportedNetwork.guard(networkNameLayer1) ||
      !networkNameLayer2 ||
      !UnsSupportedNetwork.guard(networkNameLayer2)
    ) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: NamingServiceName.UNS,
      });
    }
    return new this({
      locations: {
        Layer1: {network: networkNameLayer1, provider: providerLayer1},
        Layer2: {network: networkNameLayer2, provider: providerLayer2},
      },
    });
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
    if (!this.checkDomain(domain)) {
      return false;
    }
    const tld = domain.split('.').pop();
    if (!tld) {
      return false;
    }
    const [existsL1, existsL2] = await Promise.all([
      this.unsl1.exists(tld),
      this.unsl2.exists(tld),
    ]);
    return existsL1 || existsL2;
  }

  async owner(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const data = await this.get(tokenId, []);
    if (isNullAddress(data.owner)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }
    return data.owner;
  }

  async resolver(domain: string): Promise<string> {
    return (await this.getVerifiedData(domain)).resolver;
  }

  async record(domain: string, key: string): Promise<string> {
    const returnee = (await this.records(domain, [key]))[key];
    if (!returnee) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: key,
        domain,
      });
    }
    return returnee;
  }

  async records(
    domain: string,
    keys: string[],
  ): Promise<Record<string, string>> {
    return (await this.getVerifiedData(domain, keys)).records;
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    return this.records(domain, [...Object.keys(SupportedKeys.keys)]);
  }

  async twitter(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const keys = [
      'validation.social.twitter.username',
      'social.twitter.username',
    ];
    const data = await this.getVerifiedData(domain, keys);
    const {records, location} = data;
    const validationSignature = records['validation.social.twitter.username'];
    const twitterHandle = records['social.twitter.username'];
    if (isNullAddress(validationSignature)) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        location,
        recordName: 'validation.social.twitter.username',
      });
    }

    if (!twitterHandle) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        location,
        recordName: 'social.twitter.username',
      });
    }

    const owner = data.owner;
    if (
      !isValidTwitterSignature({
        tokenId,
        owner,
        twitterHandle,
        validationSignature,
      })
    ) {
      throw new ResolutionError(
        ResolutionErrorCode.InvalidTwitterVerification,
        {
          domain,
        },
      );
    }

    return twitterHandle;
  }

  async reverse(
    address: string,
    currencyTicker: string,
  ): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverse',
    });
  }

  async isRegistered(domain: string): Promise<boolean> {
    const tokenId = this.namehash(domain);
    const data = await this.get(tokenId, []);

    return !isNullAddress(data.owner);
  }

  async getTokenUri(tokenId: string): Promise<string> {
    // Kick off both requests concurrently and wrap the results to avoid unhandled promise rejections.
    for await (const result of [
      wrapResult(() => this.unsl2.getTokenUri(tokenId)),
      wrapResult(() => this.unsl1.getTokenUri(tokenId)),
    ]) {
      const tokenUri = unwrapResult(result);
      if (tokenUri) {
        return tokenUri;
      }
    }

    // Note: if a token doesn't exist, ProxyReader returns an empty string. If both responses are empty,
    // we know for sure that the domain isn't registered.
    throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
      domain: `with tokenId ${tokenId}`,
    });
  }

  async isAvailable(domain: string): Promise<boolean> {
    return !(await this.isRegistered(domain));
  }

  async registryAddress(domainOrNamehash: string): Promise<string> {
    const [resultOrErrorL1, resultOrErrorL2] = await Promise.all([
      this.unsl1.registryAddress(domainOrNamehash).catch((err) => err),
      this.unsl2.registryAddress(domainOrNamehash).catch((err) => err),
    ]);

    if (resultOrErrorL2 instanceof Error) {
      validResolutionErrorOrThrow(
        resultOrErrorL2,
        ResolutionErrorCode.UnregisteredDomain,
      );
    } else if (!isNullAddress(resultOrErrorL2)) {
      return resultOrErrorL2;
    }
    return validResultOrThrow(resultOrErrorL1);
  }

  async locations(domains: string[]): Promise<Locations> {
    const [resultL1, resultL2] = await Promise.all([
      this.unsl1.locations(domains),
      this.unsl2.locations(domains),
    ]);

    const nonEmptyRecordsFromL2 = Object.keys(resultL2)
      .filter((k) => resultL2[k] != null)
      .reduce((a, k) => ({...a, [k]: resultL2[k]}), {});
    return {
      ...resultL1,
      ...nonEmptyRecordsFromL2,
    };
  }

  async reverseOf(
    addr: string,
    location?: UnsLocation,
  ): Promise<string | null> {
    const [resultOrErrorL1, resultOrErrorL2] = await Promise.all([
      this.unsl1.reverseOf(addr).catch((err) => err),
      this.unsl2.reverseOf(addr).catch((err) => err),
    ]);

    const reverseL1 = () => {
      validResultOrThrow(resultOrErrorL1);
      if (resultOrErrorL1._hex !== '0x00') {
        return fromHexStringToDecimals(resultOrErrorL1._hex);
      } else {
        return null;
      }
    };

    const reverseL2 = () => {
      validResultOrThrow(resultOrErrorL2);
      if (resultOrErrorL2._hex !== '0x00') {
        return fromHexStringToDecimals(resultOrErrorL2._hex);
      } else {
        return null;
      }
    };

    if (location === UnsLocation.Layer1) {
      return reverseL1() as string;
    }

    if (location === UnsLocation.Layer2) {
      return reverseL2() as string;
    }

    const reversedL1 = reverseL1();
    if (reversedL1) {
      return reversedL1;
    }

    const reversedL2 = reverseL2();
    if (reversedL2) {
      return reversedL2;
    }

    return null;
  }

  async getAddress(
    domain: string,
    network: string,
    token: string,
  ): Promise<string | null> {
    network = network.toUpperCase();
    token = token.toUpperCase();
    const [resultOrErrorL1, resultOrErrorL2] = await Promise.all([
      this.unsl1.getAddress(domain, network, token).catch((err) => err),
      this.unsl2.getAddress(domain, network, token).catch((err) => err),
    ]);

    const addressL1 = () => {
      validResultOrThrow(resultOrErrorL1);
      if (resultOrErrorL1 !== '') {
        return resultOrErrorL1;
      } else {
        return null;
      }
    };

    const addressL2 = () => {
      validResultOrThrow(resultOrErrorL2);
      if (resultOrErrorL2 !== '') {
        return resultOrErrorL2;
      } else {
        return null;
      }
    };

    const reversedL2 = addressL2();
    if (reversedL2) {
      return reversedL2;
    }

    const reversedL1 = addressL1();
    if (reversedL1) {
      return reversedL1;
    }

    return null;
  }

  async getDomainFromTokenId(tokenId: string): Promise<string> {
    const metadata = await this.getMetadata(tokenId);
    if (this.namehash(metadata.name) !== tokenId) {
      throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
        methodName: 'unhash',
        domain: metadata.name,
        providerMessage: 'Service provider returned an invalid domain name',
      });
    }
    return metadata.name;
  }

  private async getMetadata(tokenId: string): Promise<DomainMetadata> {
    const tokenUri = await this.getTokenUri(tokenId);
    const resp = await Networking.fetch(tokenUri, {}).catch((err) => {
      throw new ResolutionError(ResolutionErrorCode.MetadataEndpointError, {
        tokenUri: tokenUri || 'undefined',
        errorMessage: err.message,
      });
    });
    if (!resp.ok) {
      throw new ResolutionError(ResolutionErrorCode.MetadataEndpointError, {
        tokenUri: tokenUri || 'undefined',
      });
    }
    const metadata: DomainMetadata = await resp.json();
    if (!metadata.name) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: `with tokenId ${tokenId}`,
      });
    }
    if (this.namehash(metadata.name) !== tokenId) {
      throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
        methodName: 'unhash',
        domain: metadata.name,
        providerMessage: 'Service provider returned an invalid domain name',
      });
    }
    return metadata;
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
        location: data.location,
        domain,
      });
    }
    return data;
  }

  private async get(tokenId: string, keys: string[] = []): Promise<DomainData> {
    const [resultOrErrorL1, resultOrErrorL2] = await Promise.all([
      this.unsl1.get(tokenId, keys).catch((err) => err),
      this.unsl2.get(tokenId, keys).catch((err) => err),
    ]);
    validResultOrThrow(resultOrErrorL2);
    const {
      resolver: resolverL2,
      owner: ownerL2,
      records: recordsL2,
    } = resultOrErrorL2;
    if (!isNullAddress(ownerL2)) {
      return {
        resolver: resolverL2,
        owner: ownerL2,
        records: constructRecords(keys, recordsL2),
        location: UnsLocation.Layer2,
      };
    }
    validResultOrThrow(resultOrErrorL1);
    const {
      resolver: resolverL1,
      owner: ownerL1,
      records: recordsL1,
    } = resultOrErrorL1;
    return {
      resolver: resolverL1,
      owner: ownerL1,
      records: constructRecords(keys, recordsL1),
      location: UnsLocation.Layer1,
    };
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
}

function validResultOrThrow(resultOrError) {
  if (resultOrError instanceof Error) {
    throw resultOrError;
  }
  return resultOrError;
}

function validResolutionErrorOrThrow(
  error: Error,
  validCode: ResolutionErrorCode,
) {
  if (!(error instanceof ResolutionError)) {
    throw error;
  }
  if (error.code === validCode) {
    return true;
  }
  throw error;
}
