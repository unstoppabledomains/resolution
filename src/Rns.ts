import { default as rnsInterface } from './contracts/rns/rns';
import { default as resolverInterface } from './contracts/rns/resolver';
import { isNullAddress, constructRecords } from './utils';
import { RskCoinIndex, RnsSupportedNetwork  } from './types';
import { ResolutionError, ResolutionErrorCode } from './errors/resolutionError';
import EthereumContract from './contracts/EthereumContract';
import { Provider, RnsSource, NamingServiceName } from './types/publicTypes';
import FetchProvider from './FetchProvider';
import { eip137Namehash, eip137Childhash } from './utils/namehash';
import { NamingService } from './NamingService';
import ConfigurationError, { ConfigurationErrorCode } from './errors/configurationError';
import { requireOrFail } from "./utils/requireOrFail";
  
/**
 * @internal
 */
export default class Rns extends NamingService {
    static readonly UrlMap = {
      30: 'https://public-node.rsk.co',
      31: 'https://public-node.testnet.rsk.co',
    }
  
    static readonly NetworkNameMap = {
      mainnet: 30,
      testnet: 31,
    };
    
    static readonly RegistryMap = {
      30: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
      31: '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
    };
    
    readonly name: NamingServiceName = NamingServiceName.RNS;
    readonly network: number;
    readonly url: string | undefined;
    readonly provider: Provider;
    readonly readerContract: EthereumContract;

    constructor(source?: RnsSource) {
      super();
      if (!source) {
        source = {
          url: Rns.UrlMap[30],
          network: "mainnet"
        };
      }
      if (!source.network || !RnsSupportedNetwork.guard(source.network)) {
        throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
          method: NamingServiceName.RNS,
        });
      }
      this.network = Rns.NetworkNameMap[source.network];
      this.url = source['url'] || Rns.UrlMap[this.network];
      this.provider = source['provider'] || new FetchProvider(this.name, this.url!);
      const registryAddress: string = source['registryAddress'] || Rns.RegistryMap[this.network];
      this.readerContract = new EthereumContract(
        rnsInterface,
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
      return eip137Namehash(domain);
    }
  
    childhash(parentHash: string, label: string): string {
      return eip137Childhash(parentHash, label);
    }
  
    isSupportedDomain(domain: string): boolean {
      return (
        domain === 'rsk' ||
        (/^[^-]*[^-]*\.(rsk)$/.test(domain) &&
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
        const rnsRecordName = this.fromUDRecordNameToRNS(key);
        return await this.getTextRecord(domain, rnsRecordName);
      }));
      return constructRecords(keys, values);
    }
  
    async reverse(
      address: string,
      currencyTicker: string,
    ): Promise<string | null> {
      if (currencyTicker.toUpperCase() != 'RSK') {
        throw new Error(`Rns doesn't support any currency other than RSK`);
      }
  
      if (address.startsWith('0x')) {
        address = address.substr(2);
      }
  
      const reverseAddress = address + '.rsk';
      const nodeHash = this.namehash(reverseAddress);
      const resolverAddress = await this.resolver(reverseAddress).catch((err: ResolutionError) => {
        if (err.code === ResolutionErrorCode.UnspecifiedResolver) {
          return null;
        }
        throw err;
      });
  
      if (isNullAddress(resolverAddress)) {
        return null;
      }
  
      const resolverContract = new EthereumContract(
        resolverInterface(resolverAddress, RskCoinIndex),
        resolverAddress,
        this.provider
      );
  
      return await this.resolverCallToName(resolverContract, nodeHash);
    }
  
    /**
     * This was done to make automated tests more configurable
     */
    private resolverCallToName(resolverContract: EthereumContract, nodeHash) {
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
      const bip44constants = requireOrFail('bip44-constants', 'bip44-constants', '^8.0.5');
      const formatsByCoinType = requireOrFail('@ensdomains/address-encoder', '@ensdomains/address-encoder', '>= 0.1.x <= 0.2.x').formatsByCoinType;
      const coin = bip44constants.findIndex(
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
  
    private fromUDRecordNameToRNS(record: string): string {
      const mapper = {
        'ipfs.redirect_domain.value': 'url',
        'browser.redirect_url': 'url',
        'whois.email.value': 'email',
        'gundb.username.value': 'gundb_username',
        'gundb.public_key.value': 'gundb_public_key',
      };
      return mapper[record] || record;
    }
  
    private async addr(domain: string, currencyTicker: string): Promise<string | undefined> {
      const resolver = await this.resolver(domain).catch((err: ResolutionError) => {
        if (err.code !== ResolutionErrorCode.UnspecifiedResolver) {
          throw err;
        }
      });
      if (!resolver) {
        const owner = await this.owner(domain);
        if (isNullAddress(owner)) {
          throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {domain});
        }
        throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {domain});
      }
  
      const coinType = this.getCoinType(currencyTicker.toUpperCase());
      return await this.fetchAddress(resolver, domain, coinType);
    }
  
    private async fetchAddress(
      resolver: string,
      domain: string,
      coinType: string,
    ): Promise<string | undefined> {
      const formatsByCoinType = requireOrFail('@ensdomains/address-encoder', '@ensdomains/address-encoder', '>= 0.1.x <= 0.2.x').formatsByCoinType;
      const resolverContract = new EthereumContract(
        resolverInterface(resolver, coinType),
        resolver,
        this.provider
      );
      const nodeHash = this.namehash(domain);
      const addr: string =
        coinType !== RskCoinIndex
          ? await this.callMethod(resolverContract, 'addr', [nodeHash, coinType])
          : await this.callMethod(resolverContract, 'addr', [nodeHash]);
      if (isNullAddress(addr)) {
        return undefined;
      }
      const data = Buffer.from(addr.replace('0x', ''), 'hex');
      return formatsByCoinType[coinType].encoder(data);
    }
  
    private async getTextRecord(domain, key): Promise<string | undefined> {
      const nodeHash = this.namehash(domain);
      const resolver = await this.getResolverContract(domain);
      return await this.callMethod(resolver, 'text', [nodeHash, key]);
    }
  
    private async getContentHash(domain: string): Promise<string | undefined> {
      const contentHash = requireOrFail('content-hash', 'content-hash', '^2.5.2')
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
    ): Promise<EthereumContract> {
      const resolverAddress = await this.resolver(domain);
      return new EthereumContract(
        resolverInterface(resolverAddress, coinType),
        resolverAddress,
        this.provider
      );
    }
  
    private async callMethod(
      contract: EthereumContract,
      method: string,
      params: (string | string[])[],
    ): Promise<any> {
      const result = await contract.call(method, params);
      return result[0];
    }
}
  