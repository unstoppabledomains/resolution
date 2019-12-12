import { EtheriumNamingService } from './namingService';
import {
  NamingServiceSource,
  RegistryMap,
  NullAddress,
  ResolutionResponse,
} from './types';
import { default as resolverInterface } from './cns/contract/resolver';
import { default as cnsInterface } from './cns/contract/registry';
import { ResolutionError } from '.';
import { ResolutionErrorCode } from './resolutionError';
import Contract from './utils/contract';

/**
 * Class to support connection with Crypto naming service
 * @param network - network string such as
 * - mainnet
 * - ropsten
 * @param url - main api url such as
 * - https://mainnet.infura.io
 * @param registryAddress - address for a registry contract
 */
export default class Cns extends EtheriumNamingService {
  name = 'CNS';
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  /** @internal */
  readonly RegistryMap: RegistryMap = {
    mainnet: '0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe',
  };

  /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omited then defaults are used
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: NamingServiceSource = true) {
    super();
    source = this.normalizeSource(source);
    this.network = source.network as string;
    this.url = source.url;
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
    return domain.indexOf('.') > 0 && /^.{1,}\.(crypto)$/.test(domain);
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
    const [tokenId, _, __, resolver] = await this.getResolutionMeta(domain);
    const addr: string = await this.fetchAddress(
      resolver,
      tokenId,
      currencyTicker,
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
    tokenId: string,
    coinName?: string,
  ): Promise<string> {
    const resolverContract = this.buildContract(
      resolverInterface,
      resolver,
    );
    const addrKey = `crypto.${coinName.toUpperCase()}.address`;
    const addr: string = await this.getRecord(resolverContract, 'get', [
      addrKey,
      tokenId,
    ]);
    return addr;
  }

  /** @internal */
  private getResolver = async (tokenId): Promise<string> =>
    await this.callMethod(this.registryContract, 'resolverOf', [tokenId]);

  /** @internal */
  async owner(tokenId): Promise<string> {
    return await this.callMethod(this.registryContract, 'ownerOf', [tokenId]);
  }

  private getTtl = async (
    contract: Contract,
    methodname: string,
    params: any[],
  ): Promise<string> =>
    await this.callMethod(this.registryContract, methodname, params);

  /** @internal */
  async record(domain: string, key: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const resolver: string = await this.getResolver(tokenId);
    const resolverContract = this.buildContract(
      resolverInterface,
      resolver,
    );
    const record: string = await this.getRecord(resolverContract, 'get', [
      key.replace('.value', ''),
      tokenId,
    ]);
    // Wrong Record checks
    if (!record || record === '0x' || record == NullAddress)
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: key,
        domain: domain,
      });
    return record;
  }

  /** This is done to make testwriting easy */
  private async getRecord(
    contract: Contract,
    methodname: string,
    params: any[],
  ): Promise<any> {
    return await this.callMethod(contract, methodname, params);
  }

  /**
   * @param domain
   * @retuns Promise that resolves to [tokenId, owner, ttl, resolver]
   */
  private async getResolutionMeta(
    domain: string,
  ): Promise<[string, string, number, string]> {
    const tokenId = this.namehash(domain);
    const owner: string = await this.owner(tokenId);
    const resolver: string = await this.getResolver(tokenId);

    if (!resolver || resolver === NullAddress) {
      if (!owner || owner === NullAddress)
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain,
        });
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain,
      });
    }
    const resolverContract = this.buildContract(
      resolverInterface,
      resolver,
    );
    const ttl = await this.getTtl(resolverContract, 'get', ['ttl', tokenId]);
    return [tokenId, owner, parseInt(ttl) || 0, resolver];
  }
}
