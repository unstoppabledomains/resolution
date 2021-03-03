import { toBech32Address } from './utils/znsUtils';
import {
  ResolutionMethod,
  ResolutionError,
  ResolutionErrorCode,
  ResolutionResponse,
} from './index';
import NamingService from './interfaces/NamingService';
import pckg from './package.json';
import { isValidTwitterSignature } from './utils/TwitterSignatureValidator';
import standardKeys from './utils/standardKeys';
import { CryptoRecords, Provider, NamingServiceName } from './publicTypes';
import Networking from './utils/Networking';
import { constructRecords, domainEndingToNS, ensureRecordPresence } from './utils';
import FetchProvider from './FetchProvider';
import Namehash from './utils/Namehash';

export default class Udapi implements NamingService {
  readonly name: ResolutionMethod = "UDAPI";
  readonly network: number = 1;
  readonly url: string;
  readonly provider: Provider;

  private headers: {
    [key: string]: string;
  };

  constructor() {
    const DefaultUserAgent = Networking.isNode()
      ? 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
      : navigator.userAgent;
    const version = pckg.version;
    const CustomUserAgent = `${DefaultUserAgent} Resolution/${version}`;
    this.url = "https://unstoppabledomains.com/api/v1";
    this.provider =  new FetchProvider(this.name, this.url);
    this.headers = { 'X-user-agent': CustomUserAgent };
  }

  isSupportedDomain(domain: string): boolean {
    return !!this.findMethod(domain);
  }

  namehash(domain: string): string {
    return Namehash.hash(domain);
  }

  async record(domain: string, key: string): Promise<string> {
    return (await this.records(domain, [key]))[key];
  }

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    const records = await this.allRecords(domain);
    return constructRecords(keys, records)
  }


  async owner(domain: string): Promise<string> {
    const { owner } = (await this.resolve(domain)).meta;
    if (!owner) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, { domain });
    }

    if (domain.endsWith('.zil')) {
      return owner.startsWith('zil1') ? owner : toBech32Address(owner);
    }
    return owner;
  }

  async twitter(domain: string): Promise<string> {
    const serviceName = this.serviceName(domain);
    if (serviceName !== 'CNS') {
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
    const validationSignature =
      records[standardKeys.validation_twitter_username];
    const twitterHandle = records[standardKeys.twitter_username];
    ensureRecordPresence(
      domain,
      'twitter validation username',
      validationSignature,
    );
    ensureRecordPresence(domain, 'twitter handle', twitterHandle);
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

  async allRecords(domain: string): Promise<CryptoRecords> {
    return (await this.resolve(domain)).records || {};
  }

  async resolve(domain: string): Promise<ResolutionResponse> {
    try {
      const response = await Networking.fetch(`${this.url}/${domain}`, {
        method: 'GET',
        headers: this.headers,
      });
      return await response.json();
    } catch (error) {
      if (error.name !== 'FetchError') {
        throw error;
      }
      throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
        method: this.name,
      });
    }
  }

  serviceName(domain: string): NamingServiceName {
    return domainEndingToNS[domain.split(".").pop() || ''];
  }

  async resolver(domain: string): Promise<string> {
    const record = await this.resolve(domain);
    return record.meta.resolver;
  }

  async reverse(address: string, currencyTicker: string): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverse',
    });
  }

  private findMethod(domain: string): NamingServiceName | undefined {
    return domainEndingToNS[domain.split(".").pop() || '']
  }
}
