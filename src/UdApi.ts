import { toBech32Address } from './zns/utils';
import {
  NamingServiceName,
  ResolutionError,
  ResolutionErrorCode,
  ResolutionResponse,
  SourceDefinition,
} from './index';
import NamingService from './NamingService';
import { isNullAddress } from './types';
import Zns from './Zns';
import Ens from './Ens';
import Cns from './Cns';
import pckg from './package.json';
import { isValidTwitterSignature } from './utils/TwitterSignatureValidator';
import standardKeys from './utils/standardKeys';
import { stringify } from 'querystring';
import { ensureRecordPresence } from './utils';

export default class Udapi extends NamingService {
  private headers: {
    [key: string]: string;
  };

  constructor(options: { url: string }) {
    super(options, 'UDAPI');
    const DefaultUserAgent = this.isNode()
      ? 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
      : navigator.userAgent;
    const version = pckg.version;
    const CustomUserAgent = `${DefaultUserAgent} Resolution/${version}`;
    this.headers = { 'X-user-agent': CustomUserAgent };
  }

  isSupportedDomain(domain: string): boolean {
    return !!this.findMethod(domain);
  }

  isSupportedNetwork(): boolean {
    return true;
  }

  namehash(domain: string): string {
    return this.findMethodOrThrow(domain).namehash(domain);
  }

  async addr(domain: string, currencyTicker: string): Promise<string> {
    const data = await this.resolve(domain);
    if (isNullAddress(data.meta.owner)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    const address = data.addresses[currencyTicker.toUpperCase()];
    if (!address) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        currencyTicker,
      });
    }

    return address;
  }

  async owner(domain: string): Promise<string | null> {
    const { owner } = (await this.resolve(domain)).meta;
    if (!owner) {
      return null;
    }
    return owner.startsWith('zil1') ? owner : toBech32Address(owner);
  }

  async records(domain: string, keys: string[]): Promise<Record<string, string>> {
    const allRecords = await this.allRecords(domain);
    const neededRecords: Record<string, string> = {};
    keys.forEach(key => neededRecords[key] = allRecords[key]);
    return neededRecords;
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
      !(await isValidTwitterSignature({
        tokenId: domainMetaData.meta.namehash,
        owner,
        twitterHandle,
        validationSignature,
      }))
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

  async allRecords(domain: string): Promise<Record<string, string>> {
    return (await this.resolve(domain)).records || {};
  }

  async resolve(domain: string): Promise<ResolutionResponse> {
    try {
      const response = await this.fetch(`${this.url}/${domain}`, {
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

  childhash(parent: string, label: string): never {
    throw new Error('Unsupported method whe using UD Resolution API');
  }

  serviceName(domain: string): NamingServiceName {
    return this.findMethodOrThrow(domain).name as NamingServiceName;
  }
  async resolver(domain: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  protected normalizeSource(source): SourceDefinition {
    return { network: 1, ...source };
  }

  private findMethod(domain: string) {
    return [new Zns(), new Ens(), new Cns()].find(m =>
      m.isSupportedDomain(domain),
    );
  }

  private findMethodOrThrow(domain: string) {
    const method = this.findMethod(domain);
    if (!method) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }

    return method;
  }
}
