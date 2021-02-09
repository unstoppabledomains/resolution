import BN from 'bn.js';
import Ens from './Ens';
import Zns from './Zns';
import Cns from './Cns';
import UdApi from './UdApi';
import {
  Blockchain,
  UnclaimedDomainResponse,
  ResolutionResponse,
  DefaultAPI,
  API,
  NamingServiceName,
  Web3Version0Provider,
  Web3Version1Provider,
  Provider,
  NamingServiceSource,
  SourceDefinition,
  NamehashOptions,
  NamehashOptionsDefault,
  DnsRecordType,
  DnsRecord,
  CryptoRecords,
  TickerVersion,
} from './publicTypes';
import { nodeHash } from './types';
import { EthersProvider } from './publicTypes';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import NamingService from './NamingService';
import { signedInfuraLink, isSupportedChainVersion } from './utils';
import { Eip1993Factories } from './utils/Eip1993Factories';
import DnsUtils from './DnsUtils';

/**
 * Blockchain domain Resolution library - Resolution.
 * @example
 * ```
 * import Resolution from '@unstoppabledomains/resolution';
 *
 * let resolution = new Resolution({ blockchain: {
 *        ens: {
 *           url: "https://mainnet.infura.io/v3/12351245223",
 *           network: "mainnet"
 *        }
 *      }
 *   });
 *
 * let domain = "brad.zil";
 * resolution.addr(domain, "eth").then(addr => console.log(addr));;
 * ```
 */
export default class Resolution {
  /** @internal */
  readonly blockchain: boolean;
  /** @internal */
  readonly ens?: Ens;
  /** @internal */
  readonly zns?: Zns;
  /** @internal */
  readonly cns?: Cns;
  /** @internal */
  readonly api?: UdApi;

  constructor({
    blockchain = true,
    api = DefaultAPI,
  }: { blockchain?: Blockchain | boolean; api?: API } = {}) {
    this.blockchain = !!blockchain;
    if (blockchain) {
      if (blockchain === true) {
        blockchain = {};
      }

      const web3provider = blockchain.web3Provider;
      if (web3provider) {
        console.warn(
          'Usage of `web3Provider` option is deprecated. Use `provider` option instead for each individual blockchain',
        );
      }

      const ens = this.normalizeSource(blockchain.ens, web3provider);
      const zns = this.normalizeSource(blockchain.zns);
      const cns = this.normalizeSource(
        blockchain.cns || {
          url: `https://mainnet.infura.io/v3/${Cns.DefaultInfuraKey}`,
        },
        web3provider,
      );
      
      if (ens) {
        this.ens = new Ens(ens);
      }

      if (zns) {
        this.zns = new Zns(zns);
      }

      if (cns) {
        this.cns = new Cns(cns);
      }

    } else {
      this.api = new UdApi(api);
    }

  }

  /**
   * Creates a resolution with configured infura id for ens and cns
   * @param infura infura project id
   * @param network ethereum network name
   */
  static infura(infura: string, network = 'mainnet'): Resolution {
    return new this({
      blockchain: {
        ens: { url: signedInfuraLink(infura, network), network },
        cns: { url: signedInfuraLink(infura, network), network },
      },
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param provider - any provider compatible with EIP-1193
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromEip1193Provider(provider: Provider): Resolution {
    return new this({
      blockchain: { zns: true, ens: { provider }, cns: { provider } },
    });
  }

  /**
   * Create a resolution instance from web3 0.x version provider
   * @param provider - an 0.x version provider from web3 ( must implement sendAsync(payload, callback) )
   * @see https://github.com/ethereum/web3.js/blob/0.20.7/lib/web3/httpprovider.js#L116
   */
  static fromWeb3Version0Provider(provider: Web3Version0Provider): Resolution {
    return this.fromEip1193Provider(
      Eip1993Factories.fromWeb3Version0Provider(provider),
    );
  }

  /**
   * Create a resolution instance from web3 1.x version provider
   * @param provider - an 1.x version provider from web3 ( must implement send(payload, callback) )
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L165
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-providers-http/src/index.js#L95
   */
  static fromWeb3Version1Provider(provider: Web3Version1Provider): Resolution {
    return this.fromEip1193Provider(
      Eip1993Factories.fromWeb3Version1Provider(provider),
    );
  }

  /**
   * Creates instance of resolution from provider that implements Ethers Provider#call interface.
   * This wrapper support only `eth_call` method for now, which is enough for all the current Resolution functionality
   * @param provider - provider object
   * @see https://github.com/ethers-io/ethers.js/blob/v4-legacy/providers/abstract-provider.d.ts#L91
   * @see https://github.com/ethers-io/ethers.js/blob/v5.0.4/packages/abstract-provider/src.ts/index.ts#L224
   * @see https://docs.ethers.io/ethers.js/v5-beta/api-providers.html#jsonrpcprovider-inherits-from-provider
   * @see https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
   */
  static fromEthersProvider(provider: EthersProvider): Resolution {
    return this.fromEip1193Provider(
      Eip1993Factories.fromEthersProvider(provider),
    );
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
   * Resolves given domain name to a specific currency address if exists
   * @async
   * @param domain - domain name to be resolved
   * @param currencyTicker - currency ticker like BTC, ETH, ZIL
   * @deprecated since Resolution v1.7.0
   * @returns A promise that resolves in an address or null
   */
  async address(
    domain: string,
    currencyTicker: string,
  ): Promise<string | null> {
    console.warn(
      'Resolution#address is deprecated since v1.7.0, use Resolution#addr instead',
    );
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
   * Resolves given domain name to a specific currency address if exists
   * @async
   * @param domain - domain name to be resolved
   * @param currencyTicker - currency ticker like BTC, ETH, ZIL
   * @throws [[ResolutionError]] if address is not found
   * @returns A promise that resolves in an address
   */
  async addr(domain: string, currrencyTicker: string): Promise<string> {
    return await this.record(
      domain,
      `crypto.${currrencyTicker.toUpperCase()}.address`,
    );
  }

  /**
   * Resolves given domain name to a specific USDT chain address if exists
   * @async
   * @param domain - domain name to be resolved
   * @param version - chain version to look for such as ERC20, TRON, EOS, OMNI
   * @throws [[ResolutionError]] when domain is not from ZNS or CNS or such address doesn't exist
   * @returns A promise that resolves in an address
   */
  async usdt(domain: string, version: TickerVersion): Promise<string> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    if (method.name === NamingServiceName.ENS) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, 
        { methodName: NamingServiceName.ENS, domain });
    }
    
    if (!isSupportedChainVersion(version)) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, 
        { domain, recordName: `crypto.USDT.version.${version}.address` });
    }

    const recordKey = `crypto.USDT.version.${version}.address`;
    return await method.record(domain, recordKey);
  }

  /**
   * Resolves given domain name to a verified twitter handle
   * @async
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]] if twitter is not found
   * @returns A promise that resolves in a verified twitter handle
   */
  async twitter(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const namingService = this.serviceName(domain);
    if (namingService !== 'CNS') {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
        domain,
        methodName: 'twitter',
      });
    }

    const method = this.getNamingMethodOrThrow(domain);
    return method.twitter(domain);
  }

  /**
   * Resolve a chat id from the domain record
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]]
   * @returns A promise that resolves in chatId
   */
  async chatId(domain: string): Promise<string> {
    return await this.record(domain, 'gundb.username.value');
  }

  /**
   * Resolve a gundb public key from the domain record
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]]
   * @returns a promise that resolves in gundb public key
   */
  async chatPk(domain: string): Promise<string> {
    return await this.record(domain, 'gundb.public_key.value');
  }

  /**
   * Resolves the IPFS hash configured for domain records on ZNS
   * @param domain - domain name
   * @throws [[ResolutionError]]
   */
  async ipfsHash(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    return await this.getPreferableNewRecord(domain, 'dweb.ipfs.hash', 'ipfs.html.value');
  }

  /**
   * Resolves the httpUrl attached to domain
   * @param domain - domain name
   */
  async httpUrl(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    return await this.getPreferableNewRecord(domain, 'browser.redirect_url', 'ipfs.redirect_domain.value');
  }

  /**
   * Resolves the ipfs redirect url for a supported domain records
   * @deprecated since v1.0.15 use Resolution#httpUrl instead
   * @param domain - domain name
   * @throws [[ResolutionError]]
   * @returns A Promise that resolves in redirect url
   */
  async ipfsRedirect(domain: string): Promise<string> {
    console.warn(
      'Resolution#ipfsRedirect is deprecated since v1.0.15, use Resolution#httpUrl instead',
    );
    return await this.record(domain, 'ipfs.redirect_domain.value');
  }

  /**
   * Resolves the ipfs email field from whois configurations
   * @param domain - domain name
   * @throws [[ResolutionError]]
   * @returns A Promise that resolves in an email address configured for this domain whois
   */
  async email(domain: string): Promise<string> {
    return await this.record(domain, 'whois.email.value');
  }

  /**
   * @returns A specific currency address or throws an error
   * @param domain domain name
   * @param currencyTicker currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @throws [[ResolutionError]] if address is not found
   * @deprecated since v1.7.0 use Resolution#addr instead
   */
  async addressOrThrow(
    domain: string,
    currencyTicker: string,
  ): Promise<string> {
    console.warn(
      'Resolution#addressOrThrow is deprecated since v1.7.0, use Resolution#addr instead',
    );
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    try {
      const addr = await method.record(
        domain,
        `crypto.${currencyTicker.toUpperCase()}.address`,
      );
      return addr;
    } catch (error) {
      // re-throw an error for back compatability. old method throws deprecated UnspecifiedCurrency code since before v1.7.0
      if (
        error instanceof ResolutionError &&
        error.code === ResolutionErrorCode.RecordNotFound
      ) {
        throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
          domain,
          currencyTicker,
        });
      }

      throw error;
    }
  }

  /**
   * @returns the resolver address for a specific domain
   * @param domain - domain to look for
   */
  async resolver(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const resolver = await this.getNamingMethodOrThrow(domain).resolver(domain);
    if (!resolver) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {domain});
    }
    return resolver;
  }

  /**
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return (await method.owner(domain)) || null;
  }

  /**
   * @param domain - domain name
   * @param recordKey - a name of a record to be resolved
   * @returns A record value promise for a given record name
   */
  async record(domain: string, recordKey: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.record(domain, recordKey);
  }

  /**
   * @param domain domain name
   * @param keys Array of record keys to be resolved
   * @returns A Promise with key-value mapping of domain records
   */
  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.records(domain, keys);
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
    return (this.findNamingService(NamingServiceName.ENS) as Ens).reverse(
      address,
      currencyTicker,
    );
  }

  /**
   * @returns Produces a namehash from supported naming service in hex format with 0x prefix.
   * Corresponds to ERC721 token id in case of Ethereum based naming service like ENS or CNS.
   * @param domain domain name to be converted
   * @param options formatting options
   * @throws [[ResolutionError]] with UnsupportedDomain error code if domain extension is unknown
   */
  namehash(domain: string, options: NamehashOptions = NamehashOptionsDefault): string {
    domain = this.prepareDomain(domain);
    return this.formatNamehash(this.getNamingMethodOrThrow(domain).namehash(domain), options);
  }

  /**
   * @returns a namehash of a subdomain with name label
   * @param parent namehash of a parent domain
   * @param label subdomain name
   * @param method "ENS", "CNS" or "ZNS"
   * @param options formatting options
   */
  childhash(
    parent: nodeHash,
    label: string,
    method: NamingServiceName,
    options: NamehashOptions = NamehashOptionsDefault,
  ): nodeHash {
    return this.formatNamehash(this.findNamingService(method).childhash(parent, label), options);
  }

  private formatNamehash(hash, options: NamehashOptions) {
    hash = hash.replace('0x', '');
    if (options.format === 'dec') {
      return new BN(hash, 'hex').toString(10);
    } else {
      return options.prefix ? '0x' + hash : hash;
    }

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
   * Checks if the domain name is valid according to naming service rules
   * for valid domain names.
   * Example: ENS doesn't allow domains that start from '-' symbol.
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

  /**
   * Returns the name of the service for a domain ENS | CNS | ZNS
   * @param domain - domain name to look for
   */
  serviceName(domain: string): NamingServiceName {
    domain = this.prepareDomain(domain);
    return this.getNamingMethodOrThrow(domain).serviceName(domain);
  }

  /**
   * Returns all record keys of the domain.
   * This method is strongly unrecommended for production use due to lack of support for many ethereum service providers and low performance
   * Method is not supported by ENS
   * @param domain - domain name
   */
  async allRecords(domain: string): Promise<CryptoRecords> {
    domain = this.prepareDomain(domain);
    return await this.getNamingMethodOrThrow(domain).allRecords(domain);
  }

  async dns(domain: string, types: DnsRecordType[]): Promise<DnsRecord[]> {
    const dnsUtils = new DnsUtils();
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    const dnsRecordKeys = this.getDnsRecordKeys(types);
    const blockchainData = await method.records(domain, dnsRecordKeys);
    return dnsUtils.toList(blockchainData);
  }

  private getDnsRecordKeys(types: DnsRecordType[]): string[] {
    const records = ['dns.ttl'];
    types.forEach(type => {
      records.push(`dns.${type}`);
      records.push(`dns.${type}.ttl`);
    });
    return records;
  }

  private async getPreferableNewRecord(domain: string, newRecord: string, oldRecord: string): Promise<string> {
    const records = await this.records(domain, [newRecord, oldRecord]) as Record<string, string>;
    return NamingService.ensureRecordPresence(domain, newRecord, records[newRecord] || records[oldRecord]);
  }

  private getNamingMethod(domain: string): NamingService | undefined {
    return this.getResolutionMethods().find(method =>
      method.isSupportedDomain(domain),
    );
  }

  private getResolutionMethods(): NamingService[] {
    return (this.blockchain
      ? ([this.ens, this.zns, this.cns] as NamingService[])
      : ([this.api] as NamingService[])
    ).filter(v => v);
  }

  private getNamingMethodOrThrow(domain: string): NamingService {
    const method = this.getNamingMethod(domain);
    if (!method) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }

    return method;
  }

  private findNamingService(name: NamingServiceName): NamingService {
    const service = this.getResolutionMethods().find(m => m.name === name);
    if (!service) {
      throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
        method: name,
      });
    }

    return service;
  }

  private prepareDomain(domain: string): string {
    return domain ? domain.trim().toLowerCase() : '';
  }

  private normalizeSource(
    source: NamingServiceSource | undefined,
    provider?: Provider,
  ): SourceDefinition | false {
    switch (typeof source) {
    case 'undefined': {
      return { provider };
    }
    case 'boolean': {
      return source ? { provider } : false;
    }
    case 'string': {
      return { url: source };
    }
    case 'object': {
      return { provider, ...source };
    }
    }
    throw new Error('Unsupported configuration');
  }
}

export { Resolution };
