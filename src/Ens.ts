import { default as ensInterface } from './ens/contract/ens';
import { default as resolverInterface } from './ens/contract/resolver';
import { formatsByCoinType } from '@ensdomains/address-encoder';
import {
  ResolutionResponse,
  EthCoinIndex,
  NamingServiceName,
  Bip44Constants,
  isNullAddress,
  SourceDefinition,
} from './types';
import { EthereumNamingService } from './EthereumNamingService';
import { ResolutionError, ResolutionErrorCode } from './index';
import Contract from './utils/contract';
import contentHash from 'content-hash';
import EnsNetworkMap from 'ethereum-ens-network-map';

/** @internal */
export default class Ens extends EthereumNamingService {
  readonly name = NamingServiceName.ENS;

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.ENS);
    if (this.registryAddress) {
      this.registryContract = this.buildContract(
        ensInterface,
        this.registryAddress,
      );
    }
  }

  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'eth' ||
      (domain.includes('.') &&
        /^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain) &&
        domain.split('.').every(v => !!v.length))
    );
  }

  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  record(domain: string, key: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async reverse(
    address: string,
    currencyTicker: string,
  ): Promise<string | null> {
    if (currencyTicker != 'ETH') {
      throw new Error(`Ens doesn't support any currency other than ETH`);
    }
    if (address.startsWith('0x')) {
      address = address.substr(2);
    }
    const reverseAddress = address + '.addr.reverse';
    const nodeHash = this.namehash(reverseAddress);
    const resolverAddress = await this.getResolver(nodeHash);
    if (isNullAddress(resolverAddress)) {
      return null;
    }
    const resolverContract = this.buildContract(
      resolverInterface(resolverAddress, EthCoinIndex),
      resolverAddress,
    );

    return await this.resolverCallToName(resolverContract, nodeHash);
  }

  /** @deprecated since Resolution v1.6.2 
   * use ENS#addr instead
  */
  async address(domain: string, currencyTicker: string): Promise<string> {
    const resolver = await this.resolver(domain);
    const coinType = this.getCoinType(currencyTicker.toUpperCase());

    const addr = await this.fetchAddress(resolver, domain, coinType);
    if (!addr) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    }
    return addr;
  }

  async addr(domain: string, currencyTicker: string): Promise<string> {
    const resolver = await this.resolver(domain);
    const cointType = this.getCoinType(currencyTicker.toUpperCase());
    return (await this.fetchAddressOrThrow(resolver, domain, cointType));
  }

  async owner(domain: string): Promise<string | null> {
    const nodeHash = this.namehash(domain);
    return (
      (await this.ignoreResolutionErrors(
        [ResolutionErrorCode.RecordNotFound],
        this.getOwner(nodeHash),
      )) || null
    );
  }

  async resolve(domain: string): Promise<ResolutionResponse | null> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork()) {
      return null;
    }
    let [owner, ttl, resolver] = await this.getResolutionInfo(domain);
    if (isNullAddress(owner)) owner = null;
    const address = await this.ignoreResolutionErrors([ResolutionErrorCode.RecordNotFound], this.fetchAddress(resolver, domain, EthCoinIndex));
    const resolution = { 
      meta: {
        owner,
        type: this.name,
        ttl: Number(ttl || 0),
      },
      addresses: {},
    };
    if (address) resolution.addresses = { ETH: address };
    return resolution;
  }

  async ipfsHash(domain: string): Promise<string> {
    const hash = await this.getContentHash(domain);
    return this.ensureRecordPresence(domain, 'IPFS hash', hash);
  }

  async httpUrl(domain: string): Promise<string> {
    return await this.getTextRecord(domain, 'url');
  }

  async email(domain: string): Promise<string> {
    return await this.getTextRecord(domain, 'email');
  }

  async chatId(domain: string): Promise<string> {
    return await this.getTextRecord(domain, 'gundb_username');
  }

  async chatpk(domain: string): Promise<string> {
    return await this.getTextRecord(domain, 'gundb_public_key');
  }

  async allRecords(domain: string): Promise<Record<string, string>> {
    throw new Error('Method not implemented.');
  }

  protected defaultRegistry(network: number): string | undefined {
    return EnsNetworkMap[network];
  }

  private async getContentHash(domain: string): Promise<string | undefined> {
    const nodeHash = this.namehash(domain);
    const resolverContract = await this.getResolverContract(domain);
    const contentHashEncoded = await this.callMethod(
      resolverContract,
      'contenthash',
      [nodeHash],
    );
    const codec = contentHash.getCodec(contentHashEncoded);
    if (codec !== 'ipfs-ns') return undefined;
    return contentHash.decode(contentHashEncoded);
  }

  private async getTextRecord(domain, key) {
    const nodeHash = this.namehash(domain);
    const resolver = await this.getResolverContract(domain);
    const record = await this.callMethod(resolver, 'text', [nodeHash, key]);
    return this.ensureRecordPresence(domain, key, record);
  }

  private async getResolverContract(
    domain: string,
    coinType?: string,
  ): Promise<Contract> {
    const resolverAddress = await this.resolver(domain);
    return this.buildContract(
      resolverInterface(resolverAddress, coinType),
      resolverAddress,
    );
  }

  /**
   * This was done to make automated tests more configurable
   */
  private resolverCallToName(resolverContract: Contract, nodeHash) {
    return this.callMethod(resolverContract, 'name', [nodeHash]);
  }

  private async getTTL(nodeHash) {
    return await this.ignoreResolutionErrors(
      [ResolutionErrorCode.RecordNotFound],
      this.callMethod(this.registryContract, 'ttl', [nodeHash]),
    );
  }

  /**
   * This was done to make automated tests more configurable
   */
  protected async getResolver(nodeHash) {
    return await this.ignoreResolutionErrors(
      [ResolutionErrorCode.RecordNotFound],
      this.callMethod(this.registryContract, 'resolver', [nodeHash]),
    );
  }

  /**
   * This was done to make automated tests more configurable
   */
  private async getOwner(nodeHash) {
    return await this.callMethod(this.registryContract, 'owner', [nodeHash]);
  }

  /**
   * This was done to make automated tests more configurable
   */
  private async getResolutionInfo(domain: string) {
    const nodeHash = this.namehash(domain);
    return await Promise.all([
      this.owner(domain),
      this.getTTL(nodeHash),
      this.getResolver(nodeHash),
    ]);
  }

  protected getCoinType(currencyTicker: string): string {
    const constants: Bip44Constants[] = require('bip44-constants');
    const coin = constants.findIndex(
      item =>
        item[1] === currencyTicker.toUpperCase() ||
        item[2] === currencyTicker.toUpperCase(),
    );
    if (coin < 0 || !formatsByCoinType[coin]) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedCurrency, {
        currencyTicker,
      });
    }
    return coin.toString();
  }

  private async fetchAddressOrThrow(
    resolver: string,
    domain: string,
    coinType: string,
  ): Promise<string> {
    if (isNullAddress(resolver)) throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {domain: domain} );
    const resolverContract = this.buildContract(
      resolverInterface(resolver, coinType),
      resolver,
    );
    const nodeHash = this.namehash(domain);
    const addr: string =
      coinType !== EthCoinIndex
        ? await this.callMethod(resolverContract, 'addr', [nodeHash, coinType])
        : await this.callMethod(resolverContract, 'addr', [nodeHash]);
    if (isNullAddress(addr)) throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {domain: domain});
    const data = Buffer.from(addr.replace('0x', ''), 'hex');
    return formatsByCoinType[coinType].encoder(data);
  }

  private async fetchAddress(resolver: string, domain: string, coin: string): Promise<string | null> {
    return (
      (await this.ignoreResolutionErrors(
        [ResolutionErrorCode.RecordNotFound, ResolutionErrorCode.UnspecifiedResolver],
        this.fetchAddressOrThrow(resolver, domain, coin),
      )) || null
    );
  }
}
