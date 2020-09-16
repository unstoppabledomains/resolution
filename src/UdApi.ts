import { toBech32Address } from './zns/utils';
import { ResolutionError, ResolutionErrorCode } from './index';
import NamingService from './NamingService';
import {
  ResolutionResponse,
  NamingServiceName,
  SourceDefinition,
  isNullAddress,
} from './types';
import Zns from './Zns';
import Ens from './Ens';
import Cns from './Cns';
import pckg from './package.json';

/** @internal */
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

  async address(domain: string, currencyTicker: string): Promise<string> {
    const data = await this.resolve(domain);
    if (isNullAddress(data.meta.owner)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }
    const address = data.addresses[currencyTicker.toUpperCase()];
    if (!address) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    }
    return address;
  }

  async owner(domain: string): Promise<string | null> {
    const { owner } = (await this.resolve(domain)).meta;
    if (!owner) return null;
    return owner.startsWith('zil1') ? owner : toBech32Address(owner);
  }

  async chatId(domain: string): Promise<string> {
    const resolution = await this.resolve(domain);
    const value = resolution?.gundb?.username;
    return this.ensureRecordPresence(domain, 'Gundb chatId', value);
  }

  async chatpk(domain: string): Promise<string> {
    const resolution = await this.resolve(domain);
    // eslint-disable-next-line camelcase
    const pk = resolution?.gundb?.public_key;
    return this.ensureRecordPresence(domain, 'Gundb publick key', pk);
  }

  async ipfsHash(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    const value = answer?.ipfs?.html;
    return this.ensureRecordPresence(domain, 'IPFS hash', value);
  }

  async email(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    const value = answer?.whois?.email;
    return this.ensureRecordPresence(domain, 'email', value);
  }

  async httpUrl(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    // eslint-disable-next-line camelcase
    const value = answer?.ipfs?.redirect_domain;
    return this.ensureRecordPresence(domain, 'httpUrl', value);
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
      if (error.name !== 'FetchError') throw error;
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

  async record(domain: string, key: string): Promise<string> {
    return await this.findMethodOrThrow(domain).record(domain, key);
  }
}
