import Ens from './ens';
import Zns from './zns';
import Udapi from './unstoppableAPI';
import {
  Blockchain,
  NamicornResolution,
  UnclaimedDomainResponse,
} from './types';
import ResolutionError from './resolutionError';
import NamingService from './namingService';

/**
 * Blockchain domain resolution library - Namicorn.
 * @example
 * ```
 * let namicorn = new Namicorn({blockchain: {ens: {url: 'https://mainnet.infura.io', network: 'mainnet'}}});
 * let domain = brad.zil
 * let resolution = namicorn.address(domain);
 * ```
 */
export default class Namicorn {
  readonly blockchain: Blockchain | boolean;
  /** @internal */
  readonly ens?: Ens;
  /** @internal */
  readonly zns?: Zns;
  /** @internal */
  readonly api?: Udapi;

  /**
   * Namicorn constructor
   * @property blockchain - main configuration object
   */
  constructor({ blockchain = true }: { blockchain?: Blockchain } = {}) {
    this.blockchain = !!blockchain;
    if (blockchain) {
      if (blockchain == true) {
        blockchain = {};
      }
      if (blockchain.ens === undefined) {
        blockchain.ens = true;
      }
      if (blockchain.zns === undefined) {
        blockchain.zns = true;
      }
      if (blockchain.ens) {
        this.ens = new Ens(blockchain.ens);
      }
      if (blockchain.zns) {
        this.zns = new Zns(blockchain.zns);
      }
    } else {
      this.api = new Udapi();
    }
  }

  /**
   * Resolves the given domain
   * @async
   * @param domain - domain name to be resolved
   * @returns A promise that resolves in an object
   */
  async resolve(domain: string): Promise<NamicornResolution> {
    const method = this.getNamingMethodOrThrow(domain);
    const result = await method.resolve(domain);
    return result || UnclaimedDomainResponse;
  }

  /**
   * Resolves give domain name to a specific currency address if exists
   * @async
   * @param domain - domain name to be resolved
   * @param currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns A promise that resolves in an address or null
   */
  async address(
    domain: string,
    currencyTicker: string,
  ): Promise<string | null> {
    try {
      return await this.addressOrThrow(domain, currencyTicker);
    } catch (error) {
      if (error instanceof ResolutionError) {
        return null;
      } else {
        throw error;
      }
    }
  }

  /**
   * Resolves the ipfs hash configured for domain records on ZNS
   * @param domain - domain name
   * @throws ResolutionError
   * @returns A Promise that resolves in ipfsHash
   */
  async ipfsHash(domain: string): Promise<string> {
    return await this.getNamingMethodOrThrow(domain).record(
      domain,
      'ipfs.html.value',
    );
  }

  /**
   * Resolves the ipfs redirect url for a supported domain records
   * @param domain - domain name
   * @throws ResolutionError
   * @returns A Promise that resolves in redirect url
   */
  async ipfsRedirect(domain: string): Promise<string> {
    return await this.getNamingMethodOrThrow(domain).record(
      domain,
      'ipfs.redirect_domain.value',
    );
  }

  /**
   * Resolves the ipfs email field from whois configurations
   * @param domain - domain name
   * @throws ResolutionError
   * @returns A Promise that resolves in an email address configured for this domain whois
   */
  async email(domain: string): Promise<string> {
    return await this.getNamingMethodOrThrow(domain).record(
      domain,
      'whois.email.value',
    );
  }

  /**
   * Resolves given domain to a specific currency address or throws an error
   * @param domain - domain name
   * @param currencyTicker - currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @throws ResolutionError if address is not found
   */
  async addressOrThrow(
    domain: string,
    currencyTicker: string,
  ): Promise<string> {
    const method = this.getNamingMethodOrThrow(domain);
    return await method.address(domain, currencyTicker);
  }

  /**
   * Owner of the domain
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    const method = this.getNamingMethod(domain);
    return (await method.owner(domain)) || null;
  }

  /**
   * This method is only for ens at the moment. Reverse the ens address to a ens registered domain name
   * @async
   * @param address - address you wish to reverse
   * @param currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns Domain name attached to this address
   */
  async reverse(address: string, currencyTicker: string): Promise<string> {
    return await this.ens.reverse(address, currencyTicker);
  }

  /**
   * Produce a namehash from supported naming service
   * @param domain - domain name to be hashed
   * @returns Namehash either for ENS or ZNS
   */
  namehash(domain: string): string {
    const method = this.getNamingMethod(domain);
    if (!method) throw new ResolutionError('UnsupportedDomain', { domain });
    const result = method.namehash(domain);
    return result;
  }

  /**
   * Checks if the domain is in valid format
   * @param domain - domain name to be checked
   */
  isSupportedDomain(domain: string): boolean {
    return !!this.getNamingMethod(domain);
  }

  /**
   * Checks if the domain is supported by the specified network as well as if it is in valid format
   * @param domain - domain name to be checked
   */
  isSupportedDomainInNetwork(domain: string): boolean {
    const method = this.getNamingMethod(domain);
    return method && method.isSupportedNetwork();
  }

  /**
   * Used internally to get the right method (ens or zns)
   * @param domain - domain name
   */
  private getNamingMethod(domain: string): NamingService | undefined {
    const methods: Array<NamingService | undefined> = this.blockchain
      ? [this.ens, this.zns]
      : [this.api];
    const method = methods.find(
      method => method && method.isSupportedDomain(domain),
    );
    return method;
  }

  private getNamingMethodOrThrow(domain: string) {
    const method = this.getNamingMethod(domain);
    if (!method) throw new ResolutionError('UnsupportedDomain', { domain });
    return method;
  }
}

export { Namicorn };
