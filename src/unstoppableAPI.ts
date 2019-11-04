import { ResolutionError } from './index';
import NamingService from './namingService';
import nodeFetch from 'node-fetch';
import { NamicornResolution, NullAddress } from './types';
import fs from 'fs';

/** @ignore  */
const DefaultUrl = 'https://unstoppabledomains.com/api/v1';

/** @ignore */
const isNode = () => {
  if (typeof process === 'object') {
    if (typeof process.versions === 'object') {
      if (typeof process.versions.node !== 'undefined') {
        return true;
      }
    }
  }
  return false;
};

/** @ignore */
const myFetch = isNode() ? nodeFetch : window.fetch;

export default class Udapi extends NamingService {
  /** @ignore */
  private url: string;
  private headers: {
    [key: string]: string;
  };

  constructor() {
    super();
    this.url = DefaultUrl;

    const DefaultUserAgent = isNode()
      ? 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
      : navigator.userAgent;
    const pckg = JSON.parse(fs.readFileSync('./package.json') as any);
    const version = pckg.version;
    const CustomUserAgent = `${DefaultUserAgent} namicorn/${version}`;
    this.headers = { 'X-user-agent': CustomUserAgent };
  }

  /** @ignore */
  isSupportedDomain(domain: string): boolean {
    throw new Error('Method not implemented.');
  }

  /** @ignore */
  isSupportedNetwork(): boolean {
    throw new Error('Method not implemented.');
  }
  /** @ignore */
  namehash(domain: string): string {
    throw new Error('Method not implemented.');
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
    if (!data.meta.owner || data.meta.owner === NullAddress)
      throw new ResolutionError('UnregisteredDomain', { domain });
    const address = data.addresses[currencyTicker.toUpperCase()];
    if (!address)
      throw new ResolutionError('UnspecifiedCurrency', {
        domain,
        currencyTicker,
      });
    return address;
  }

  /**
   * Resolves the domain name via UD API mirror
   * @param domain - domain name to be resolved
   */
  async resolve(domain: string): Promise<NamicornResolution> {
    const response = await myFetch(`${this.url}/${domain}`, {
      method: 'GET',
      headers: this.headers,
    });
    return await response.json();
  }

  /** @ignore */
  protected normalizeSource(
    source: string | boolean | import('./types').SourceDefinition,
  ) {
    throw new Error('Method not implemented.');
  }
}
