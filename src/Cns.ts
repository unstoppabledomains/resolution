import { EthereumNamingService } from './EthereumNamingService';
import {
  NamingServiceName,
  RegistryMap,
  ResolutionResponse,
  nodeHash,
  SourceDefinition,
} from './types';
import { default as hash, childhash } from './cns/namehash';
import { default as proxyReaderAbi } from './cns/contract/proxyReader';
import { ResolutionErrorCode } from './errors/resolutionError';
import CnsRegistryReader from './cns/CnsRegistryReader';
import CnsProxyReader from './cns/CnsProxyReader';

/** @internal */
export default class Cns extends EthereumNamingService {
  readonly registryAddress?: string;
  /** @internal */
  readonly RegistryMap: RegistryMap = {
    mainnet: '0x7ea9ee21077f84339eda9c80048ec6db678642b1',
    kovan: '0xcf4318918fd18aca9bdc11445c01fbada4b448e3', // for internal testing
  };

  source: SourceDefinition;
  service: EthereumNamingService;

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.CNS);

    this.registryAddress = source.registry ?
      source.registry :
      this.RegistryMap[this.network];
    this.source = { ...this.normalizeSource(source), registry: this.registryAddress };
  }

  async getService(): Promise<EthereumNamingService> {
    if (!this.service) {
      this.service = await this.isDataReaderSupported() ?
        new CnsProxyReader(this.source) :
        new CnsRegistryReader(this.source);
    }
    return this.service;
  }

  protected async isDataReaderSupported(): Promise<boolean> {
    try {
      const contract = this.buildContract(proxyReaderAbi, this.registryAddress);
      const isDataReaderSupported = await this.callMethod(contract, 'supportsInterface', ['0x6eabca0d']);
      if (!isDataReaderSupported) {
        throw new Error('Not supported DataReader');
      }

      return true;
    } catch { }

    return false;
  }

  async resolver(domain: string): Promise<string> {
    const service = await this.getService();
    return service.resolver(domain);
  }

  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'crypto' ||
      (domain.indexOf('.') > 0 &&
        /^.{1,}\.(crypto)$/.test(domain) &&
        domain.split('.').every((v) => !!v.length))
    );
  }

  /**
   * Resolves the given domain.
   * @deprecated
   * @param domain - domain name to be resolved
   * @returns- Returns a promise that resolves in an object
   */
  async resolve(_: string): Promise<ResolutionResponse> {
    throw new Error('This method is unsupported for CNS');
  }

  /**
   * Resolves domain to a specific cryptoAddress
   * @param domain - domain name to be resolved
   * @param currencyTicker currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @returns - A promise that resolves in a string
   */
  async address(domain: string, currencyTicker: string): Promise<string> {
    const service = await this.getService();
    return service.address(domain, currencyTicker);
  }

  /**
   * Produces CNS namehash
   * @param domain - domain to be hashed
   * @returns CNS namehash of a domain
   */
  namehash(domain: string): nodeHash {
    this.ensureSupportedDomain(domain);
    return hash(domain);
  }

  /**
   * Returns the childhash
   * @param parent - nodehash of a parent
   * @param label - child
   */
  childhash(
    parent: nodeHash,
    label: string,
    options: { prefix: boolean } = { prefix: true },
  ): nodeHash {
    return childhash(parent, label, options);
  }

  /** @internal */
  async owner(domain: string): Promise<string> {
    const service = await this.getService();
    return await service.owner(domain) || '';
  }

  /**
   * resolves an ipfsHash stored on domain
   * @param domain - domain name
   */
  async ipfsHash(domain: string): Promise<string> {
    return await this.record(domain, 'ipfs.html.value');
  }

  /**
   * resolves an email address stored on domain
   * @param domain - domain name
   */
  async email(domain: string): Promise<string> {
    return await this.record(domain, 'whois.email.value');
  }

  /**
   * resolves a gun db userId attached to the domain
   * @param domain - domain name
   */
  async chatId(domain: string): Promise<string> {
    return await this.record(domain, 'gundb.username.value');
  }

  /**
   * resolves a gun db public key attached to the domain
   * @param domain - domain name
   */
  async chatpk(domain: string): Promise<string> {
    return await this.record(domain, 'gundb.public_key.value');
  }

  /**
   * resolves an httpUrl stored on domain
   * @param domain - domain name
   */
  async httpUrl(domain: string): Promise<string> {
    return await this.record(domain, 'ipfs.redirect_domain.value');
  }

  /** @internal */
  async record(domain: string, key: string): Promise<string> {
    const service = await this.getService();
    return service.record(domain, key);
  }

  protected async getResolver(tokenId: string): Promise<string> {
    return await this.ignoreResolutionError(
      ResolutionErrorCode.RecordNotFound,
      this.callMethod(this.registryContract, 'resolverOf', [tokenId]),
    );
  }
}
