import {toBech32Address} from './utils/znsUtils';
import {ResolutionError, ResolutionErrorCode} from './errors/resolutionError';
import {isValidTwitterSignature} from './utils/TwitterSignatureValidator';
import {
  Api,
  BlockchainType,
  CryptoRecords,
  Locations,
  UnsLocation,
  NamingServiceName,
  ResolutionResponse,
} from './types/publicTypes';
import Networking from './utils/Networking';
import {constructRecords, findNamingServiceName, isNullAddress} from './utils';
import {
  eip137Namehash,
  fromDecStringToHex,
  znsNamehash,
} from './utils/namehash';
import {NamingService} from './NamingService';

/**
 * @internal
 */
export default class UdApi extends NamingService {
  public readonly url: string;
  private readonly headers: {
    [key: string]: string;
  };

  constructor(api?: Api) {
    super();
    this.url = api?.url || 'https://unstoppabledomains.com/api/v1';
    const DefaultUserAgent =
      'cross-fetch/3.1.4 (+https://github.com/lquixada/cross-fetch)';
    const CustomUserAgent = `${DefaultUserAgent} Resolution`;
    this.headers = {'X-user-agent': CustomUserAgent};
  }

  async isSupportedDomain(_domain: string): Promise<boolean> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'isSupportedDomain',
    });
  }

  namehash(_domain: string): string {
    throw new Error('Unsupported method when using UD Resolution API');
  }

  childhash(_parentHash: string, _label: string): string {
    throw new Error('Unsupported method when using UD Resolution API');
  }

  async record(domain: string, key: string): Promise<string> {
    return (await this.records(domain, [key]))[key];
  }

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    const records = await this.allRecords(domain);
    return constructRecords(keys, records);
  }

  async owner(domain: string): Promise<string> {
    const response = await this.resolve(domain);
    const {owner, blockchain} = response.meta;
    if (!owner) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    if (blockchain === BlockchainType.ZIL && !owner.startsWith('zil1')) {
      return toBech32Address(owner);
    }
    return owner;
  }

  async twitter(domain: string): Promise<string> {
    const serviceName = findNamingServiceName(domain);
    if (serviceName !== NamingServiceName.UNS) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
        domain,
        methodName: 'twitter',
      });
    }

    const domainMetaData = await this.resolve(domain);
    if (!domainMetaData.meta.owner) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }
    const owner = domainMetaData.meta.owner;
    const records = domainMetaData.records || {};
    const validationSignature = records['validation.social.twitter.username'];
    const twitterHandle = records['social.twitter.username'];

    if (!validationSignature) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: 'validation.social.twitter.username',
        domain: domain,
      });
    }
    if (!twitterHandle) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: 'social.twitter.username',
        domain: domain,
      });
    }

    if (
      !isValidTwitterSignature({
        tokenId: domainMetaData.meta.namehash,
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

  async getAddress(
    _domain: string,
    _network: string,
    _token: string,
  ): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'isSupportedDomain',
    });
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    return (await this.resolve(domain)).records || {};
  }

  async getDomainFromTokenId(tokenId: string): Promise<string> {
    tokenId = fromDecStringToHex(tokenId);
    const metadata = await this.getMetadata(tokenId);
    return metadata.meta.domain;
  }

  private async getMetadata(tokenId: string): Promise<ResolutionResponse> {
    const tokenUri = `${this.url}/${tokenId}`;
    const resp = await Networking.fetch(tokenUri, {}).catch((err) => {
      throw new ResolutionError(ResolutionErrorCode.MetadataEndpointError, {
        tokenUri: tokenUri || 'undefined',
        errorMessage: err.message,
      });
    });

    const metadata: ResolutionResponse = await resp.json();
    if (!metadata.meta || !metadata.meta.domain) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: `with tokenId ${tokenId}`,
      });
    }

    const namehash =
      metadata.meta.blockchain === BlockchainType.ZIL
        ? znsNamehash(metadata.meta.domain)
        : eip137Namehash(metadata.meta.domain);

    if (namehash !== tokenId) {
      throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
        methodName: 'unhash',
        domain: metadata.meta.domain,
        providerMessage: 'Service provider returned an invalid domain name',
      });
    }
    return metadata;
  }

  async resolve(domain: string): Promise<ResolutionResponse> {
    const response = await Networking.fetch(`${this.url}/${domain}`, {
      method: 'GET',
      headers: this.headers,
    });
    return response.json();
  }

  async resolver(domain: string): Promise<string> {
    const record = await this.resolve(domain);
    return record.meta.resolver;
  }

  async reverse(
    _address: string,
    _currencyTicker: string,
  ): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverse',
    });
  }

  async reverseOf(
    _address: string,
    _location?: UnsLocation,
  ): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverseOf',
    });
  }

  async isRegistered(domain: string): Promise<boolean> {
    const record = await this.resolve(domain);

    return !isNullAddress(record.meta.owner);
  }

  async getTokenUri(_tokenId: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'getTokenUri',
    });
  }

  async isAvailable(domain: string): Promise<boolean> {
    return !(await this.isRegistered(domain));
  }

  async registryAddress(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'registryAddress',
    });
  }

  async locations(_domains: string[]): Promise<Locations> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'locations',
    });
  }
}
