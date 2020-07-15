import { toBech32Address } from './zns/utils';
import { ResolutionError, ResolutionErrorCode } from './index';
import NamingService from './namingService';
import {
  ResolutionResponse,
  NamingServiceSource,
  NamingServiceName,
  SourceDefinition,
  isNullAddress,
} from './types';
import Zns from './zns';
import Ens from './ens';
import Cns from './cns';
import pckg from './package.json';

/** @internal */
export default class Udapi extends NamingService {
  private headers: {
    [key: string]: string;
  };

  constructor(options: {url: string}) {
    super(options, 'UDAPI');
    const DefaultUserAgent = this.isNode()
      ? 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
      : navigator.userAgent;
    const version = pckg.version;
    const CustomUserAgent = `${DefaultUserAgent} Resolution/${version}`;
    this.headers = { 'X-user-agent': CustomUserAgent };
  }

  /** @internal */
  isSupportedDomain(domain: string): boolean {
    return !!this.findMethod(domain);
  }

  /** @internal */
  isSupportedNetwork(): boolean {
    return true;
  }

  /** @internal */
  namehash(domain: string): string {
    const method = this.findMethod(domain);
    if (!method)
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    return method.namehash(domain);
  }

  /**
   * Resolves the domain via UD API mirror
   * @param domain - domain name to be resolved
   * @param currencyTicker - currencyTicker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   */
  async address(domain: string, currencyTicker: string): Promise<string> {
    const data = await this.resolve(domain);
    if (isNullAddress(data.meta.owner))
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    const address = data.addresses[currencyTicker.toUpperCase()];
    if (!address)
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    return address;
  }

  /**
   * Owner of the domain
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    const { owner } = (await this.resolve(domain)).meta;
    if (!owner) return null;
    return owner.startsWith('zil1') ? owner : toBech32Address(owner);
  }

  /**
   * Returns the gundb chat id of the domain
   * @param domain - domain name
   * @throws ResolutionError with code RecordNotFound
   * @returns A gundb chatId configured for a domain
   */
  async chatId(domain: string): Promise<string> {
    const resolution = await this.resolve(domain);
    const value = resolution?.gundb?.username;
    return this.ensureRecordPresence(domain, 'Gundb chatId', value);
  }

  /**
   * Returns the gundb chat public key of the domain
   * @param domain - domain name
   * @throws ResolutionError with code RecordNotFound
   * @returns a gundb public key configured for a domain
   */
  async chatpk(domain: string): Promise<string> {
    const resolution = await this.resolve(domain);
    const pk = resolution?.gundb?.public_key;
    return this.ensureRecordPresence(domain, 'Gundb publick key', pk);
  }

  /**
   * Resolves ipfshash from domain
   * @param domain - domain name
   * @throws ResolutionError.RecordNotFound if not found
   */
  async ipfsHash(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    const value = answer?.ipfs?.html;
    return this.ensureRecordPresence(domain, 'IPFS hash', value);
  }

  /**
   * Resolves email from domain
   * @param domain - domain name
   * @throws ResolutionError.RecordNotFound if not found
   */
  async email(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    const value = answer?.whois?.email;
    return this.ensureRecordPresence(domain, 'email', value);
  }

  /**
   * Resolves httpUrl from domain
   * @param domain - domain name
   * @throws ResolutionError.RecordNotFound if not found
   */
  async httpUrl(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    const value = answer?.ipfs?.redirect_domain;
    return this.ensureRecordPresence(domain, 'httpUrl', value);
  }

  /**
   * Resolves the domain name via UD API mirror
   * @param domain - domain name to be resolved
   */
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
    throw new Error('Unsupported method whe using UD Resolution API')
  }

  serviceName(domain: string): NamingServiceName {
    return this.findMethodOrThrow(domain).name as NamingServiceName;
  }
  async resolver(domain: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  protected normalizeSource(source): SourceDefinition {
    return {network: 'mainnet', ...source};
  }

  private findMethod(domain: string) {
    return [new Zns(), new Ens(), new Cns()].find(m =>
      m.isSupportedDomain(domain),
    );
  }

  private findMethodOrThrow(domain: string) {
    const method = this.findMethod(domain);
    if (!method)
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    return method;
  }

  /**
   * Looks up for an arbitrary key inside the records of certain domain
   * @param domain - domain name
   * @param key - key to look for
   */
  async record(domain: string, key: string): Promise<string> {
    return await this.findMethodOrThrow(domain).record(domain, key);
  }
}
