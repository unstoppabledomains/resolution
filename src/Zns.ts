import hash from 'hash.js';
import {
  fromBech32Address,
  toBech32Address,
  toChecksumAddress,
} from './zns/utils';
import { invert, set, isNullAddress } from './utils';
import { Dictionary, ZnsResolution, nodeHash } from './types';
import {
  NamingServiceName,
  ResolutionError,
  ResolutionErrorCode,
  ResolutionResponse,
  SourceDefinition,
  UnclaimedDomainResponse,
} from './index';
import NamingService from './NamingService';
import { CryptoRecords } from './publicTypes';

const NetworkIdMap = {
  mainnet: 1,
  testnet: 333,
  localnet: 111,
};

const RegistryMap = {
  1: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
};

const UrlMap = {
  1: 'https://api.zilliqa.com',
  333: 'https://dev-api.zilliqa.com',
  111: 'http://localhost:4201',
};

const UrlNetworkMap = (url: string) => invert(UrlMap)[url];

export default class Zns extends NamingService {
  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.ZNS);
  }

  async resolve(domain: string): Promise<ResolutionResponse | null> {
    const recordAddresses = await this.getRecordsAddresses(domain);
    if (!recordAddresses) {
      return UnclaimedDomainResponse;
    }
    const [ownerAddress, resolverAddress] = recordAddresses;
    const resolution = this.structureResolverRecords(
      await this.getResolverRecords(resolverAddress),
    );
    const addresses: Record<string, string> = {};
    if (resolution.crypto) {
      Object.entries(resolution.crypto).forEach(
        ([key, v]) => v.address && (addresses[key] = v.address),
      );
    }

    return {
      addresses,
      meta: {
        namehash: this.namehash(domain),
        resolver: resolverAddress,
        owner: ownerAddress || null,
        type: this.name,
        ttl: parseInt(resolution.ttl as string) || 0,
      },
      records: resolution.records,
    };
  }

  async owner(domain: string): Promise<string | null> {
    const data = await this.resolve(domain);
    return data ? data.meta.owner : null;
  }

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    const records = await this.allRecords(domain)
    return this.constructRecords(keys, records)
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    const resolverAddress = await this.resolver(domain);
    return await this.getResolverRecords(resolverAddress);
  }

  async twitter(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'twitter',
    });
  }

  isSupportedDomain(domain: string): boolean {
    const tokens = domain.split('.');
    return (
      !!tokens.length &&
      tokens[tokens.length - 1] === 'zil' &&
      tokens.every(v => !!v.length)
    );
  }

  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  childhash(
    parent: nodeHash,
    label: string,
  ): nodeHash {
    parent = parent.replace(/^0x/, '');
    return this.sha256(parent + this.sha256(label), 'hex',);
  }

  private sha256(message: string, inputEnc?: 'hex') {
    return hash.sha256()
      .update(message, inputEnc)
      .digest('hex');
  }

  async resolver(domain: string): Promise<string> {
    const recordsAddresses = await this.getRecordsAddresses(domain);
    if (!recordsAddresses || !recordsAddresses[0]) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: domain,
      });
    }

    const [, resolverAddress] = recordsAddresses;
    if (isNullAddress(resolverAddress)) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain: domain,
      });
    }

    return resolverAddress;
  }

  protected normalizeSource(
    source: SourceDefinition | undefined,
  ): SourceDefinition {
    source = { ...source };
    source.network =
      typeof source.network == 'string'
        ? NetworkIdMap[source.network]
        : source.network || (source.url && UrlNetworkMap[source.url]) || 1;

    if (!source.provider && !source.url) {
      source.url =
        typeof source.network === 'number' ? UrlMap[source.network] : undefined;
    }


    source.registry = source.registry || RegistryMap[source.network!];
    if (source.registry?.startsWith('0x')) {
      source.registry = toBech32Address(source.registry);
    }

    return source;
  }

  private async getRecordsAddresses(
    domain: string,
  ): Promise<[string, string] | undefined> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork()) {
      return undefined;
    }

    const registryRecord = await this.getContractMapValue(
      this.registryAddress!,
      'records',
      this.namehash(domain),
    );
    if (!registryRecord) {
      return undefined;
    }
    const [ownerAddress, resolverAddress] = registryRecord.arguments as [
      string,
      string,
    ];
    return [
      ownerAddress.startsWith('0x') ? toBech32Address(ownerAddress) : ownerAddress,
      resolverAddress,
    ];
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

  private async fetchSubState(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const params = [contractAddress.replace('0x', ''), field, keys];
    const method = 'GetSmartContractSubState';
    return await this.provider.request({ method, params });
  }

  private async getContractField(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const contractAddr = contractAddress.startsWith('zil1')
      ? fromBech32Address(contractAddress)
      : contractAddress;
    const result = (await this.fetchSubState(contractAddr, field, keys)) || {};
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
