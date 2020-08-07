import {
  fromBech32Address,
  toBech32Address,
  toChecksumAddress,
} from './zns/utils';
import namehash, { childhash } from './zns/namehash';
import { invert, set } from './utils';
import {
  Dictionary,
  ResolutionResponse,
  SourceDefinition,
  UnclaimedDomainResponse,
  ZnsResolution,
  NamingServiceName,
  isNullAddress,
  nodeHash,
} from './types';
import { ResolutionError, ResolutionErrorCode } from './index';
import NamingService from './namingService';
import FetchProvider from './FetchProvider';

const DefaultSource = 'https://api.zilliqa.com';

const NetworkIdMap = {
  1: 'mainnet',
  333: 'testnet',
  111: 'localnet',
};

const RegistryMap = {
  mainnet: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
};

const UrlMap = {
  mainnet: 'https://api.zilliqa.com',
  testnet: 'https://dev-api.zilliqa.com',
  localnet: 'http://localhost:4201',
};

const UrlNetworkMap = (url: string) => invert(UrlMap)[url];

/** @internal */
export default class Zns extends NamingService {
  readonly registryAddress?: string;

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.ZNS);

    source = this.normalizeSource(source);
    this.registryAddress = source.registry
      ? source.registry
      : RegistryMap[this.network];
    if (this.registryAddress) {
      this.registryAddress = this.registryAddress.startsWith('0x')
        ? toBech32Address(this.registryAddress)
        : this.registryAddress;
    }
  }

  /**
   * Resolves the domain name
   * @param domain - domain name to be resolved
   * @returns A promise that resolves in a detailed crypto Resolution
   */
  async resolve(domain: string): Promise<ResolutionResponse | null> {
    const recordAddresses = await this.getRecordsAddresses(domain);
    if (!recordAddresses) return UnclaimedDomainResponse;
    const [ownerAddress, resolverAddress] = recordAddresses;
    const resolution = this.structureResolverRecords(
      await this.getResolverRecords(resolverAddress),
    );
    const addresses: Record<string, string> = {};
    if (resolution.crypto)
      Object.entries(resolution.crypto).map(
        ([key, v]) => v.address && (addresses[key] = v.address),
      );
    return {
      addresses,
      meta: {
        owner: ownerAddress || null,
        type: this.name,
        ttl: parseInt(resolution.ttl as string) || 0,
      },
    };
  }

  async address(domain: string, currencyTicker: string): Promise<string> {
    const data = await this.resolve(domain);
    if (isNullAddress(data?.meta?.owner))
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    const address = data!.addresses[currencyTicker.toUpperCase()];
    if (!address)
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    return address;
  }

  /**
   * Owner of the domain
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    const data = await this.resolve(domain);
    return data ? data.meta.owner : null;
  }

  /**
   * Resolves a domain
   * @param domain - domain name to be resolved
   * @returns Everything what is stored on specified domain
   */
  async Resolution(domain: string): Promise<ZnsResolution> {
    return this.structureResolverRecords(await this.records(domain));
  }

  async ipfsHash(domain: string): Promise<string> {
    return await this.getRecordOrThrow(domain, 'ipfs.html.value');
  }

  async httpUrl(domain: string): Promise<string> {
    return await this.getRecordOrThrow(domain, 'ipfs.redirect_domain.value');
  }

  async email(domain: string): Promise<string> {
    return await this.getRecordOrThrow(domain, 'whois.email.value');
  }

  async chatId(domain: string): Promise<string> {
    return await this.getRecordOrThrow(domain, 'gundb.username.value');
  }

  async chatpk(domain: string): Promise<string> {
    return await this.getRecordOrThrow(domain, 'gundb.public_key.value');
  }

  /**
   * Resolves a specific field from domain's record
   * @param domain - domain name
   * @param field - resolver record name to be queried
   * @returns Record field associated with the domain
   */
  async record(domain: string, field: string) {
    return await this.getRecordOrThrow(domain, field);
  }

  /**
   * Resolver Records
   * @param domain - domain name to be resolved
   * @returns ZNS resolver records in an plain key-value format
   */
  async records(domain: string): Promise<Dictionary<string>> {
    return await this.getResolverRecords((await this.resolverAddress(domain))!);
  }

  /**
   * Checks if domain is supported by zns
   */
  isSupportedDomain(domain: string): boolean {
    const tokens = domain.split('.');
    return (
      !!tokens.length &&
      tokens[tokens.length - 1] === 'zil' &&
      tokens.every(v => !!v.length)
    );
  }

  /**
   * Checks if zns is supported by current Resolution instance
   */
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  /**
   * Produces ZNS namehash of a domain
   * @param domain - domain name to be hashed
   * @returns ZNS namehash
   */
  namehash(domain: string): string {
    this.ensureSupportedDomain(domain);
    return namehash(domain);
  }

  childhash(parent: nodeHash, label: string): string {
    return childhash(parent, label);
  }

  async resolver(domain: string): Promise<string> {
    const recordsAddresses = await this.getRecordsAddresses(domain);
    if (!recordsAddresses || !recordsAddresses[0])
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: domain,
      });
    const [_, resolverAddress] = recordsAddresses;
    if (isNullAddress(resolverAddress))
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain: domain,
      });
    return resolverAddress;
  }

  async getAllKeys(domain: string): Promise<any> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {method: this.name});
  }

  protected normalizeSource(source: SourceDefinition | undefined): SourceDefinition {
    source = {...source};
    if (typeof source.network == 'number') {
      source.network = NetworkIdMap[source.network] || source.network;
    }
    source.network = source.network || (source.url && UrlNetworkMap[source.url]) || 'mainnet';
    if (!source.provider) {
      source.url = source.url || (typeof source.network === 'string' && UrlMap[source.network]);
    }
    return source;
  }

  private async getRecordOrThrow(
    domain: string,
    field: string,
  ): Promise<string> {
    const records = await this.records(domain);
    return this.ensureRecordPresence(domain, field, records[field]);
  }

  private async getRecordsAddresses(
    domain: string,
  ): Promise<[string, string] | undefined> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork())
      return undefined;
    const registryRecord = await this.getContractMapValue(
      this.registryAddress!,
      'records',
      namehash(domain),
    );
    if (!registryRecord) return undefined;
    let [ownerAddress, resolverAddress] = registryRecord.arguments as [
      string,
      string,
    ];
    if (ownerAddress.startsWith('0x')) {
      ownerAddress = toBech32Address(ownerAddress);
    }
    return [ownerAddress, resolverAddress];
  }

  private async getResolverRecords(
    resolverAddress: string,
  ): Promise<ZnsResolution> {
    if (isNullAddress(resolverAddress)) {
      return {};
    }
    const resolver = toChecksumAddress(resolverAddress);
    return ((await this.getContractField(resolver, 'records')) ||
      {}) as Dictionary<string>;
  }

  private structureResolverRecords(records: Dictionary<string>): ZnsResolution {
    const result = {};
    for (const [key, value] of Object.entries(records)) {
      set(result, key, value);
    }
    return result;
  }

  private async resolverAddress(domain: string): Promise<string | undefined> {
    return ((await this.getRecordsAddresses(domain)) || [])[1];
  }

  private async fetchSubState(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const params = [contractAddress.replace('0x', ''), field, keys];
    const method = 'GetSmartContractSubState';
    const provider = this.provider || new FetchProvider(this.name, this.url!);
    return await provider.request({method, params})
  }

  private async getContractField(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const contractAddr = contractAddress.startsWith('zil1')
    ? fromBech32Address(contractAddress)
    : contractAddress;
    let result = (await this.fetchSubState(contractAddr, field, keys)) || {};
    return result[field];
  }

  private async getContractMapValue(
    contractAddress: string,
    field: string,
    key: string,
  ): Promise<any> {
    const record = await this.getContractField(contractAddress, field, [key]);
    return (record && record[key]) || null;
  }
}
