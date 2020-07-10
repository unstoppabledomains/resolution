import { EthereumNamingService } from './EthereumNamingService';
import {
  NamingServiceSource,
  NamingServiceName,
  RegistryMap,
  ResolutionResponse,
  isNullAddress,
  nodeHash,
  Web3Provider,
} from './types';
import { default as resolverInterface } from './cns/contract/resolver';
import { default as cnsInterface } from './cns/contract/registry';
import { default as hash, childhash } from './cns/namehash';
import ResolutionError from './resolutionError';
import { ResolutionErrorCode } from './resolutionError';
import Contract from './utils/contract';

/** @internal */
export default class Cns extends EthereumNamingService {
  readonly name = NamingServiceName.CNS;
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  /** @internal */
  readonly RegistryMap: RegistryMap = {
    mainnet: '0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe',
    kovan: '0x22c2738cdA28C5598b1a68Fb1C89567c2364936F', // for internal testing
  };

  /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omited then defaults are used
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: NamingServiceSource = true, web3Provider?: Web3Provider) {
    super(web3Provider);
    source = this.normalizeSource(source);
    this.network = source.network as string;
    this.url = source.url as string;
    if (!this.network) {
      throw new Error('Unspecified network in Resolution CNS configuration');
    }
    if (!this.url) {
      throw new Error('Unspecified url in Resolution CNS configuration');
    }
    this.registryAddress = source.registry
      ? source.registry
      : this.RegistryMap[this.network];
    if (this.registryAddress) {
      this.registryContract = this.buildContract(
        cnsInterface,
        this.registryAddress,
      );
    }
  }

  /**
   * Checks if the domain is in valid format
   * @param domain - domain name to be checked
   * @returns
   */
  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'crypto' ||
      (domain.indexOf('.') > 0 &&
        /^.{1,}\.(crypto)$/.test(domain) &&
        domain.split('.').every(v => !!v.length))
    );
  }

  /**
   * Resolves the given domain.
   * @deprecated
   * @param domain - domain name to be resolved
   * @returns- Returns a promise that resolves in an object
   */
  async resolve(domain: string): Promise<ResolutionResponse> {
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
    const tokenId = this.namehash(domain);
    const ownerPromise = this.owner(domain);
    const resolver = await this.getResolver(tokenId);
    if (!resolver || isNullAddress(resolver)) {
      await this.throwOwnershipError(domain, ownerPromise);
    } else {
      ownerPromise.catch(() => {})
    }
    const addr: string | undefined = await this.ignoreResolutionError(
      ResolutionErrorCode.RecordNotFound,
      this.fetchAddress(resolver, this.namehash(domain), currencyTicker),
    );
    if (!addr)
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    return addr;
  }

  /**
   * @internal
   * @param resolver - Resolver address
   * @param tokenId - namehash of a domain name
   */
  private async fetchAddress(
    resolver: string,
    tokenId: nodeHash,
    coinName: string,
  ): Promise<string> {
    const resolverContract = this.buildContract(resolverInterface, resolver);
    const addrKey = `crypto.${coinName.toUpperCase()}.address`;
    const addr: string = await this.getRecord(resolverContract, 'get', [
      addrKey,
      tokenId,
    ]);
    return addr;
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
  protected getResolver = async (tokenId: nodeHash): Promise<string> => {
    return await this.ignoreResolutionError(
      ResolutionErrorCode.RecordNotFound,
      this.callMethod(this.registryContract, 'resolverOf', [tokenId]),
    );
  };

  /** @internal */
  async owner(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    return await this.callMethod(this.registryContract, 'ownerOf', [tokenId]);
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

  private getTtl = async (
    contract: Contract,
    methodname: string,
    params: string[],
  ): Promise<string> => await this.callMethod(contract, methodname, params);

  /** @internal */
  async record(domain: string, key: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const resolver = await this.resolver(domain);
    const resolverContract = this.buildContract(resolverInterface, resolver);
    const record = await this.getRecord(resolverContract, 'get', [
      key,
      tokenId,
    ]);
    return this.ensureRecordPresence(domain, key, record);
  }

  /** This is done to make testwriting easy */
  private async getRecord(
    contract: Contract,
    methodname: string,
    params: any[],
  ): Promise<any> {
    return await this.callMethod(contract, methodname, params);
  }
}
