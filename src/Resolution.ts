import Ens from './ens';
import Zns from './zns';
import Cns from './cns';
import Udapi from './unstoppableAPI';
import {
  Blockchain,
  UnclaimedDomainResponse,
  ResolutionResponse,
  DefaultAPI,
  API,
  nodeHash,
  NamingServiceName,
  Web3Provider,
} from './types';
import ResolutionError, { ResolutionErrorCode } from './resolutionError';
import NamingService from './namingService';
import { signedInfuraLink } from './utils';

/**
 * Blockchain domain Resolution library - Resolution.
 * @example
 * ```
 * let Resolution = new Resolution({blockchain: {ens: {url: 'https://mainnet.infura.io', network: 'mainnet'}}});
 * let domain = brad.zil
 * let Resolution = Resolution.address(domain);
 * ```
 */
export default class Resolution {
  readonly blockchain: Blockchain | boolean;
  readonly web3Provider?: Web3Provider;
  /** @internal */
  readonly ens?: Ens;
  /** @internal */
  readonly zns?: Zns;
  /** @internal */
  readonly cns?: Cns;
  /** @internal */
  readonly api?: Udapi;

  /**
   * Resolution constructor
   * @property blockchain - main configuration object
   */
  constructor({
    blockchain = true,
    api = DefaultAPI,
  }: { blockchain?: Blockchain; api?: API } = {}) {
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
      if (blockchain.cns === undefined) {
        blockchain.cns = true;
      }
      if (blockchain.ens) {
        this.ens = new Ens(
          blockchain.ens,
          blockchain.web3Provider as Web3Provider,
        );
      }
      if (blockchain.zns) {
        this.zns = new Zns(blockchain.zns);
      }
      if (blockchain.cns) {
        this.cns = new Cns(
          blockchain.cns,
          blockchain.web3Provider as Web3Provider,
        );
      }
    } else {
      this.api = new Udapi(api.url);
    }
  }

  /**
   * Creates a resolution with configured infura id for ens and cns
   * @param infura infura project id
   */
  static infura(infura: string): Resolution {
    return new this({
      blockchain: {
        ens: { url: signedInfuraLink(infura), network: 'mainnet' },
        cns: { url: signedInfuraLink(infura), network: 'mainnet' },
      },
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param provider - any provider with sendAsync function impelmented
   */
  static provider(provider: Web3Provider): Resolution {
    return new this({ blockchain: { web3Provider: provider } });
  }

  /**
   * Creates a resolution instance from configured jsonRPCProvider
   * @param provider - any jsonRPCprovider will work as long as it's prototype has send(method, params): Promise<any> method
   */
  static jsonRPCprovider(provider): Resolution {
    return new this({ blockchain: { web3Provider: provider.send } });
  }

  /**
   * Resolves the given domain
   * @async
   * @param domain - domain name to be resolved
   * @returns A promise that resolves in an object
   */
  async resolve(domain: string): Promise<ResolutionResponse> {
    domain = this.prepareDomain(domain);
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
    domain = this.prepareDomain(domain);
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
   * Resolve a chat id from the domain record
   * @param domain - domain name to be resolved
   * @throws ResolutionError with code RecordNotFound
   * @returns A promise that resolves in chatId
   */
  async chatId(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.chatId(domain);
  }

  /**
   * Resolve a gundb public key from the domain record
   * @param domain - domain name to be resolved
   * @throws ResolutionError with code RecordNotFound
   * @returns a promise that resolves in gundb public key
   */
  async chatPk(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.chatpk(domain);
  }


  /**
   * Resolves the IPFS hash configured for domain records on ZNS
   * @param domain - domain name
   * @throws ResolutionError
   */
  async ipfsHash(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    return await this.getNamingMethodOrThrow(domain).ipfsHash(domain);
  }

  /**
   * Resolves the httpUrl attached to domain
   * @param domain - domain name
   */
  async httpUrl(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    return await this.getNamingMethodOrThrow(domain).httpUrl(domain);
  }

  /**
   * Resolves the ipfs redirect url for a supported domain records
   * @deprecated - use Resolution#httpUrl instead
   * @param domain - domain name
   * @throws ResolutionError
   * @returns A Promise that resolves in redirect url
   */
  async ipfsRedirect(domain: string): Promise<string> {
    console.warn(
      'Resolution#ipfsRedirect is depricated since 1.0.15, use Resolution#httpUrl instead',
    );
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
    domain = this.prepareDomain(domain);
    return await this.getNamingMethodOrThrow(domain).email(domain);
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
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.address(domain, currencyTicker);
  }

  async resolver(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    return await this.getNamingMethodOrThrow(domain).resolver(domain);
  }

  /**
   * Owner of the domain
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return (await method.owner(domain)) || null;
  }

  /**
   * Custom key for the domain
   * @param domain - domain name
   * @param recordKey - key from resolver contract
   * This method is not implemented for ens domains
   */
  async record(domain: string, recordKey: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.record(domain, recordKey);
  }

  /**
   * This method is only for ens at the moment. Reverse the ens address to a ens registered domain name
   * @async
   * @param address - address you wish to reverse
   * @param currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns Domain name attached to this address
   */
  async reverse(
    address: string,
    currencyTicker: string,
  ): Promise<string | null> {
    return (this.findNamingService(NamingServiceName.ENS) as Ens).reverse(address, currencyTicker);
  }

  /**
   * Produce a namehash from supported naming service
   * @param domain - domain name to be hashed
   * @returns Namehash either for ENS or ZNS
   * @throws ResolutionError with UnsupportedDomain error code if domain extension is unknown
   */
  namehash(domain: string): string {
    domain = this.prepareDomain(domain);
    return this.getNamingMethodOrThrow(domain).namehash(domain);
  }

  /**
   * returns a childhash for specific namingService
   * @param parent -> hash for parent
   * @param label -> hash for label
   * @param method -> "ENS", "CNS" or "ZNS"
   */
  childhash(
    parent: nodeHash,
    label: string,
    method: NamingServiceName,
  ): nodeHash {
    return this.findNamingService(method).childhash(parent, label);
  }

  /**
   * Checks weather the domain name matches the hash
   * @param domain - domain name to check againt
   * @param hash - hash obtained from the blockchain
   */
  isValidHash(domain: string, hash: string): boolean {
    domain = this.prepareDomain(domain);
    return this.namehash(domain) === hash;
  }

  /**
   * Checks if the domain is in valid format
   * @param domain - domain name to be checked
   */
  isSupportedDomain(domain: string): boolean {
    domain = this.prepareDomain(domain);
    return !!this.getNamingMethod(domain);
  }

  /**
   * Checks if the domain is supported by the specified network as well as if it is in valid format
   * @param domain - domain name to be checked
   */
  isSupportedDomainInNetwork(domain: string): boolean {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethod(domain);
    return !!method && method.isSupportedNetwork();
  }

  serviceName(domain: string): NamingServiceName {
    domain = this.prepareDomain(domain);
    return this.getNamingMethodOrThrow(domain).serviceName(domain);
  }

  private getNamingMethod(domain: string): NamingService | undefined {
    domain = this.prepareDomain(domain);
    return this.getResolutionMethods().find(
      method => method.isSupportedDomain(domain),
    );
  }

  private getResolutionMethods(): NamingService[] {
    return (this.blockchain
      ? [this.ens, this.zns, this.cns] as NamingService[]
      : [this.api] as NamingService[]).filter(v => v);
  }

  private getNamingMethodOrThrow(domain: string): NamingService {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethod(domain);
    if (!method)
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    return method;
  }

  private findNamingService(name: NamingServiceName): NamingService {
    const service = this.getResolutionMethods().find(m => m.name === name)
    if (!service)
      throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
        method: name,
      });
    return service;
  }

  private prepareDomain(domain: string): string {
    return domain ? domain.trim().toLowerCase() : "";
  }
}

export { Resolution };
