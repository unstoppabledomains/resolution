import { default as ensInterface } from './contracts/ens/ens';
import { default as resolverInterface } from './contracts/ens/resolver';
import { formatsByCoinType } from '@ensdomains/address-encoder';
import { EthCoinIndex, Bip44Constants, BlockhanNetworkUrlMap } from './types';
import {
  NamingServiceName,
  ResolutionError,
  ResolutionErrorCode,
} from './index';
import Contract from './utils/contract';
import contentHash from 'content-hash';
import EnsNetworkMap from 'ethereum-ens-network-map';
import { Provider, EnsSource, EnsConfig } from './types/publicTypes';
import { constructRecords, ensureConfigured, isNullAddress } from './utils';
import NamingService from './interfaces/NamingService';
import FetchProvider from './FetchProvider';
import Namehash from './utils/Namehash';

export default class Ens implements NamingService {
  static readonly UrlMap: BlockhanNetworkUrlMap = {
    1: 'https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee',
    3: 'https://ropsten.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee'
  };

  static readonly NetworkNameMap = {
    mainnet: 1,
    ropsten: 3,
    rinkeby: 4,
    goerli: 5,
  };

  readonly name = NamingServiceName.ENS;
  readonly network: number;
  readonly url: string | undefined;
  readonly provider: Provider;
  readonly readerContract: Contract;

  constructor(source?: EnsSource) {
    if (!source) {
      source = this.getDefaultSource();
    }
    
    this.network = Ens.NetworkNameMap[source.network];
    this.url = source['url'] || Ens.UrlMap[this.network];
    this.provider = source['provider'] || new FetchProvider(this.name, this.url!);
    ensureConfigured({
      network: source.network,
      url: this.url,
      provider: this.provider
    }, this.name);

    const registryAddress = source['registryAddress'] || EnsNetworkMap[this.network];
    this.readerContract = new Contract(
      ensInterface,
      registryAddress,
      this.provider
    );
  }

  serviceName(): NamingServiceName {
    return this.name;
  }

  namehash(domain: string): string {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {domain});
    }
    return Namehash.hash(domain);
  }

  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'eth' ||
      (domain.includes('.') &&
        /^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain) &&
        domain.split('.').every(v => !!v.length))
    );
  }

  async owner(domain: string): Promise<string> {
    const namehash = this.namehash(domain);
    return await this.callMethod(this.readerContract, 'owner', [namehash]);
  }

  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const resolverAddr = await this.callMethod(this.readerContract, 'resolver', [nodeHash]);
    if (isNullAddress(resolverAddr)) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver);
    }
    return resolverAddr;
  }

  async record(domain: string, key: string): Promise<string> {
    const returnee = (await this.records(domain, [key]))[key];
    if (!returnee) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {domain, recordName: key});
    }
    return returnee;
  }

  async records(domain: string, keys: string[]): Promise<Record<string, string>> {
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
    return constructRecords(keys, values);
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

    const resolverContract = new Contract(
      resolverInterface(resolverAddress, EthCoinIndex),
      resolverAddress,
      this.provider
    );

    return await this.resolverCallToName(resolverContract, nodeHash);
  }

  /**
   * This was done to make automated tests more configurable
   */
  private resolverCallToName(resolverContract: Contract, nodeHash) {
    return this.callMethod(resolverContract, 'name', [nodeHash]);
  }
  
  async twitter(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'twitter',
    });
  }

  async allRecords(domain: string): Promise<Record<string, string>> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'allRecords',
    });
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
  
  private getDefaultSource(): EnsConfig {
    return {
      url: Ens.UrlMap[1],
      network: "mainnet",
    }
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

  private async fetchAddress(
    resolver: string,
    domain: string,
    coinType: string,
  ): Promise<string | undefined> {
    const resolverContract = new Contract(
      resolverInterface(resolver, coinType),
      resolver,
      this.provider
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

  private async getTextRecord(domain, key): Promise<string | undefined> {
    const nodeHash = this.namehash(domain);
    const resolver = await this.getResolverContract(domain);
    return await this.callMethod(resolver, 'text', [nodeHash, key]);
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

  private async getResolverContract(
    domain: string,
    coinType?: string,
  ): Promise<Contract> {
    const resolverAddress = await this.resolver(domain);
    return new Contract(
      resolverInterface(resolverAddress, coinType),
      resolverAddress,
      this.provider
    );
  }

  private async callMethod(
    contract: Contract,
    method: string,
    params: (string | string[])[],
  ): Promise<any> {
    try {
      const result = await contract.call(method, params);
      return result[0];
    } catch (error) {
      const { message }: { message: string } = error;
      if (
        message.match(/Invalid JSON RPC response/) ||
        message.match(/legacy access request rate exceeded/)
      ) {
        throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
          method: this.name,
        });
      }

      throw error;
    }
  }
}
