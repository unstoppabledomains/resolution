import BN from 'bn.js';
import Ens from './Ens';
import Zns from './Zns';
import Cns from './Cns';
import UdApi from './UdApi';
import {
  NamingServiceName,
  NamehashOptions,
  NamehashOptionsDefault,
  DnsRecordType,
  DnsRecord,
  CryptoRecords,
  TickerVersion,
  SourceConfig,
  EnsSupportedNetworks,
  CnsSupportedNetworks,
  Provider,
  Web3Version0Provider,
  Web3Version1Provider,
  EthersProvider,
  CnsSource,
  EnsSource,
  ZnsSource,
} from './publicTypes';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import NamingService from './interfaces/NamingService';
import DnsUtils from './utils/DnsUtils';
import { ensureRecordPresence, isSupportedChainVersion, signedInfuraLink } from './utils';
import { Eip1993Factories } from './utils/Eip1993Factories';

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
  private services: NamingService[];
  
  constructor({
    sourceConfig = undefined,
  }: { sourceConfig?: SourceConfig } = {}) {

    const cns = sourceConfig && sourceConfig.cns && sourceConfig?.cns['api'] ? new UdApi() : new Cns(sourceConfig?.cns as CnsSource);
    const zns = sourceConfig && sourceConfig.zns && sourceConfig?.zns['api'] ? new UdApi() : new Zns(sourceConfig?.zns as ZnsSource);
    const ens = sourceConfig && sourceConfig.ens && sourceConfig?.ens['api'] ? new UdApi() : new Ens(sourceConfig?.ens as EnsSource);
    this.services = [cns, ens, zns];

  }

  /**
   * Creates a resolution with configured infura id for ens and cns
   * @param infura infura project id
   * @param network ethereum network name
   */
  static infura(infura: string, networks: { ens?: {
      network: EnsSupportedNetworks 
    }, cns?: {
      network: CnsSupportedNetworks
    }}): Resolution {
    return new this({
      sourceConfig: {
        ens: { url: signedInfuraLink(infura, networks.ens?.network), network: networks.ens?.network || "mainnet" },
        cns: { url: signedInfuraLink(infura, networks.ens?.network), network: networks.cns?.network || "mainnet" },
      },
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param provider - any provider compatible with EIP-1193
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromEip1193Provider(provider: Provider, networks: { ens?: {
    network: EnsSupportedNetworks 
  }, cns?: {
    network: CnsSupportedNetworks
  }}): Resolution {
    return new this({
      sourceConfig: {
        ens: { provider, network: networks.ens?.network || "mainnet" },
        cns: { provider, network: networks.cns?.network || "mainnet" },
      },
    });
  }

  /**
   * Create a resolution instance from web3 0.x version provider
   * @param provider - an 0.x version provider from web3 ( must implement sendAsync(payload, callback) )
   * @see https://github.com/ethereum/web3.js/blob/0.20.7/lib/web3/httpprovider.js#L116
   */
  static fromWeb3Version0Provider(provider: Web3Version0Provider, networks: { ens?: {
    network: EnsSupportedNetworks 
  }, cns?: {
    network: CnsSupportedNetworks
  }}): Resolution {
    return this.fromEip1193Provider(
      Eip1993Factories.fromWeb3Version0Provider(provider),
      networks
    );
  }

  /**
   * Create a resolution instance from web3 1.x version provider
   * @param provider - an 1.x version provider from web3 ( must implement send(payload, callback) )
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L165
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-providers-http/src/index.js#L95
   */
  static fromWeb3Version1Provider(provider: Web3Version1Provider, networks: { ens?: {
    network: EnsSupportedNetworks 
  }, cns?: {
    network: CnsSupportedNetworks
  }}): Resolution {
    return this.fromEip1193Provider(
      Eip1993Factories.fromWeb3Version1Provider(provider),
      networks
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
  static fromEthersProvider(provider: EthersProvider, networks: { ens?: {
    network: EnsSupportedNetworks 
  }, cns?: {
    network: CnsSupportedNetworks
  }}): Resolution {
    return this.fromEip1193Provider(
      Eip1993Factories.fromEthersProvider(provider),
      networks
    );
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
      throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
        methodName: NamingServiceName.ENS,
        domain,
      });
    }

    if (!isSupportedChainVersion(version)) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        recordName: `crypto.USDT.version.${version}.address`,
      });
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
    return await this.getPreferableNewRecord(
      domain,
      'dweb.ipfs.hash',
      'ipfs.html.value',
    );
  }

  /**
   * Resolves the httpUrl attached to domain
   * @param domain - domain name
   */
  async httpUrl(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    return await this.getPreferableNewRecord(
      domain,
      'browser.redirect_url',
      'ipfs.redirect_domain.value',
    );
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
   * @returns the resolver address for a specific domain
   * @param domain - domain to look for
   */
  async resolver(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const resolver = await this.getNamingMethodOrThrow(domain).resolver(domain);
    if (!resolver) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain,
      });
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
    return (this.findNamingService(NamingServiceName.ENS) as unknown as Ens).reverse(
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
  namehash(
    domain: string,
    options: NamehashOptions = NamehashOptionsDefault,
  ): string {
    domain = this.prepareDomain(domain);
    return this.formatNamehash(
      this.getNamingMethodOrThrow(domain).namehash(domain),
      options,
    );
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
    types.forEach((type) => {
      records.push(`dns.${type}`);
      records.push(`dns.${type}.ttl`);
    });
    return records;
  }

  private async getPreferableNewRecord(
    domain: string,
    newRecord: string,
    oldRecord: string,
  ): Promise<string> {
    const records = (await this.records(domain, [
      newRecord,
      oldRecord,
    ]));
    return ensureRecordPresence(
      domain,
      newRecord,
      records[newRecord] || records[oldRecord],
    );
  }

  private getNamingMethod(domain: string): NamingService | undefined {
    return this.services.find((method) =>
      method.isSupportedDomain(domain),
    );
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
    const service = this.services.find((m) => m.name === name);
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
}

export { Resolution };
