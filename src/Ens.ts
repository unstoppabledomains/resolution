import { default as ensInterface } from './ens/contract/ens';
import { default as resolverInterface } from './ens/contract/resolver';
import { formatsByCoinType } from '@ensdomains/address-encoder';
import { EthCoinIndex, Bip44Constants, BlockhanNetworkUrlMap } from './types';
import { EthereumNamingService } from './EthereumNamingService';
import {
  NamingServiceName,
  ResolutionError,
  ResolutionErrorCode,
} from './index';
import Contract from './utils/contract';
import contentHash from 'content-hash';
import EnsNetworkMap from 'ethereum-ens-network-map';
import { ResolutionResponse, CryptoRecords, SourceDefinition } from './publicTypes';
import { isNullAddress } from './utils';

export default class Ens extends EthereumNamingService {
  readonly name = NamingServiceName.ENS;

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.ENS);
  }

  protected readerAbi(): any {
    return ensInterface;
  }

  protected urlMap(): BlockhanNetworkUrlMap {
    return {
      1: 'https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee',
      3: 'https://ropsten.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee'
    };
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

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    const values = await Promise.all(keys.map(async key => {
      if (key.startsWith('crypto.')) {
        const ticker = key.split('.')[1];
        return await this.addr(domain, ticker);
      }
      if (key === 'ipfs.html.value' || key === 'dweb.ipfs.hash') {
        return await this.getContentHash(domain);
      }
      const ensRecordName = this.fromUDRecordNameToENS(key);
      return await this.getTextRecord(domain, ensRecordName);
    }));
    return this.constructRecords(keys, values);
  }

  async twitter(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'twitter',
    });
  }

  private fromUDRecordNameToENS(record: string): string {
    const mapper = {
      'ipfs.redirect_domain.value': 'url',
      'browser.redirect_url': 'url',
      'whois.email.value': 'email',
      'gundb.username.value': 'gundb_username',
      'gundb.public_key.value': 'gundb_public_key',
    };
    return mapper[record] || record;
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
    const resolverAddress = await this.resolver(reverseAddress).catch(err => null);
    if (isNullAddress(resolverAddress)) {
      return null;
    }

    const resolverContract = this.buildContract(
      resolverInterface(resolverAddress, EthCoinIndex),
      resolverAddress,
    );

    return await this.resolverCallToName(resolverContract, nodeHash);
  }

  private async addr(domain: string, currencyTicker: string): Promise<string | undefined> {
    const resolver = await this.resolver(domain).catch(err => null);
    if (!resolver) {
      const owner = await this.owner(domain);
      if (isNullAddress(owner)) {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {domain});
      }
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {domain});
    }

    const cointType = this.getCoinType(currencyTicker.toUpperCase());
    return await this.fetchAddress(resolver, domain, cointType);
  }

  async owner(domain: string): Promise<string | null> {
    const nodeHash = this.namehash(domain);
    return await this.getOwner(nodeHash)
  }

  async resolve(domain: string): Promise<ResolutionResponse | null> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork()) {
      return null;
    }

    const [owner, ttl, resolver] = await this.getResolutionInfo(domain);
    const address = await this.fetchAddress(resolver, domain, EthCoinIndex);
    const resolution = {
      meta: {
        namehash: this.namehash(domain),
        resolver: resolver,
        owner: isNullAddress(owner) ? null : owner,
        type: this.name,
        ttl: Number(ttl || 0),
      },
      addresses: {},
      records: {},
    };
    if (address) {
      resolution.addresses = { ETH: address };
    }
    return resolution;
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
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
    if (codec !== 'ipfs-ns') {
      return undefined;
    }
    return contentHash.decode(contentHashEncoded);
  }

  private async getTextRecord(domain, key): Promise<string | undefined> {
    const nodeHash = this.namehash(domain);
    const resolver = await this.getResolverContract(domain);
    return await this.callMethod(resolver, 'text', [nodeHash, key]);
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
    return await this.callMethod(this.readerContract, 'ttl', [nodeHash]);
  }

  /**
   * This was done to make automated tests more configurable
   */
  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const resolverAddr = await this.callMethod(this.readerContract, 'resolver', [nodeHash]);
    if (isNullAddress(resolverAddr)) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver);
    }
    return resolverAddr;
  }

  /**
   * This was done to make automated tests more configurable
   */
  private async getOwner(nodeHash) {
    return await this.callMethod(this.readerContract, 'owner', [nodeHash]);
  }

  /**
   * This was done to make automated tests more configurable
   */
  private async getResolutionInfo(domain: string) {
    const nodeHash = this.namehash(domain);
    return await Promise.all([
      this.owner(domain),
      this.getTTL(nodeHash),
      this.resolver(domain),
    ]);
  }

  protected getCoinType(currencyTicker: string): string {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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

  private async fetchAddress(
    resolver: string,
    domain: string,
    coinType: string,
  ): Promise<string | undefined> {
    const resolverContract = this.buildContract(
      resolverInterface(resolver, coinType),
      resolver,
    );
    const nodeHash = this.namehash(domain);
    const addr: string =
      coinType !== EthCoinIndex
        ? await this.callMethod(resolverContract, 'addr', [nodeHash, coinType])
        : await this.callMethod(resolverContract, 'addr', [nodeHash]);
    if (isNullAddress(addr)) {
      return undefined;
    }
    // eslint-disable-next-line no-undef
    const data = Buffer.from(addr.replace('0x', ''), 'hex');
    return formatsByCoinType[coinType].encoder(data);
  }
}
