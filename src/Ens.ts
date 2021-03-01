import { default as ensInterface } from './contracts/ens/ens';
import { default as resolverInterface } from './contracts/ens/resolver';
import { formatsByCoinType } from '@ensdomains/address-encoder';
import { EthCoinIndex, Bip44Constants, BlockhanNetworkUrlMap, NetworkIdMap } from './types';
import { keccak_256 as sha3 } from 'js-sha3';
import {
  NamingServiceName,
  ResolutionError,
  ResolutionErrorCode,
} from './index';
import Contract from './utils/contract';
import contentHash from 'content-hash';
import EnsNetworkMap from 'ethereum-ens-network-map';
import { Provider, EnsConfig, EnsSupportedNetworks } from './publicTypes';
import { buildContract, constructRecords, ensureConfigured, invert, isNullAddress } from './utils';
import NamingService from './interfaces/NamingService';
import FetchProvider from './FetchProvider';

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

  static readonly NetworkIdMap: NetworkIdMap = invert(Ens.NetworkNameMap);

  readonly name = NamingServiceName.ENS;
  readonly network: number;
  readonly url: string | undefined;
  readonly registryAddress: string;
  readonly provider: Provider;
  readonly readerContract: Contract;

  constructor(source?: EnsConfig) {
    if (!source) {
      source = this.getDefaultSource();
    }
    this.network = Ens.NetworkNameMap[source.network];
    this.url = source?.url || Ens.UrlMap[this.network];
    this.provider = source?.provider || new FetchProvider(this.name, this.url!);
    ensureConfigured({
      network: source.network,
      url: this.url,
      provider: this.provider
    }, this.name);
    this.registryAddress = source.registryAddress || EnsNetworkMap[this.network];
    this.readerContract = buildContract(
      ensInterface,
      this.registryAddress,
      this.provider
    );
  }

  private getDefaultSource() {
    return {
      url: Ens.UrlMap[1]!,
      network: "mainnet" as EnsSupportedNetworks,
    }
  }

  serviceName(): NamingServiceName {
    return this.name;
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

  namehash(domain: string): string {
    const hashArray = this.hash(domain);
    return this.arrayToHex(hashArray);
  }

  private hash(domain: string): number[] {
    if (!domain) {
        return Array.from(new Uint8Array(32));
    }
    const [label, ...remainder] = domain.split('.');
    const labelHash = sha3.array(label);
    const remainderHash = this.hash(remainder.join('.'));
    return sha3.array(new Uint8Array([...remainderHash, ...labelHash]));
  }

  private arrayToHex(arr) {
    return '0x' + Array.prototype.map.call(arr, x => ('00' + x.toString(16)).slice(-2)).join('');
  }

  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'eth' ||
      (domain.includes('.') &&
        /^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain) &&
        domain.split('.').every(v => !!v.length))
    );
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

    const resolverContract = buildContract(
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
    const resolverContract = buildContract(
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
    return buildContract(
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
