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

export default class Udapi extends NamingService {
  readonly name = 'UDAPI';
  private url: string;
  private headers: {
    [key: string]: string;
  };

  constructor(url: string) {
    super();
    this.url = url;
    const DefaultUserAgent = this.isNode()
      ? 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
      : navigator.userAgent;
    const version = '1.0.9';
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
    if (!data.meta.owner || isNullAddress(data.meta.owner))
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
   * Resolves ipfshash from domain
   * @param domain - domain name
   * @throws ResolutionError.RecordNotFound if not found
   */
  async ipfsHash(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    if (!answer || !answer.ipfs || !answer.ipfs.html)
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: 'IPFS hash',
        domain: domain,
      });
    return answer.ipfs.html;
  }

  /**
   * Resolves email from domain
   * @param domain - domain name
   * @throws ResolutionError.RecordNotFound if not found
   */
  async email(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    if (!answer || !answer.whois || !answer.whois.email)
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: 'email',
        domain: domain,
      });
    return answer.whois.email;
  }

  /**
   * Resolves httpUrl from domain
   * @param domain - domain name
   * @throws ResolutionError.RecordNotFound if not found
   */
  async httpUrl(domain: string): Promise<string> {
    const answer = await this.resolve(domain);
    if (!answer || !answer.ipfs || !answer.ipfs.redirect_domain)
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: 'httpUrl',
        domain: domain,
      });
    return answer.ipfs.redirect_domain;
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

  serviceName(domain: string): NamingServiceName {
    return this.findMethodOrThrow(domain).name;
  }

  /** @internal */
  protected normalizeSource(source: NamingServiceSource): SourceDefinition {
    throw new Error('Method not implemented.');
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
