import { EthereumNamingService } from '../EthereumNamingService';
import ResolutionError, { ResolutionErrorCode } from './../errors/resolutionError';
import {
  SourceDefinition,
  NamingServiceName,
  ResolutionResponse,
  NullAddress,
  isNullAddress,
} from '../types';
import { default as proxyReaderAbi } from './contract/proxyReader';
import { default as hash } from './namehash';

type Data = {
  resolver?: string
  owner?: string,
  values?: string[]
};

/** @internal */
export default class CnsProxyReader extends EthereumNamingService {
  registryAddress?: string;

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.CNS);
    this.registryAddress = source.registry;
    if (this.registryAddress) {
      this.registryContract = this.buildContract(
        proxyReaderAbi,
        this.registryAddress,
      );
    }
  }

  protected getResolver(_: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'crypto' ||
      (domain.indexOf('.') > 0 &&
        /^.{1,}\.(crypto)$/.test(domain) &&
        domain.split('.').every((v) => !!v.length))
    );
  }

  async resolver(domain: string): Promise<string> {
    const data = await this.get(domain);
    await this.verify(domain, data);
    return data.resolver || '';
  }

  namehash(domain: string): string {
    this.ensureSupportedDomain(domain);
    return hash(domain);
  }

  async address(domain: string, currencyTicker: string): Promise<string> {
    const key = `crypto.${currencyTicker.toUpperCase()}.address`;
    const data = await this.get(domain, [key]);
    await this.verify(domain, data);

    const { values } = data;
    const value: string | null = values?.length ? values[0] : null;
    if (!value) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    }

    return value;
  }

  async owner(domain: string): Promise<string> {
    try {
      const owner = await this.getOwner(domain);
      return owner || '';
    } catch (error) {
      if (error.reason === 'ERC721: owner query for nonexistent token') {
        return NullAddress;
      }
      throw error;
    }
  }

  async record(domain: string, key: string): Promise<string> {
    const data = await this.get(domain, [key]);
    await this.verify(domain, data);

    const { values } = data;
    const value: string | null = values?.length ? values[0] : null;
    return this.ensureRecordPresence(domain, key, value);
  }

  resolve(_: string): Promise<ResolutionResponse> {
    throw new Error('Method not implemented.');
  }

  ipfsHash(domain: string): Promise<string> {
    return this.record(domain, 'ipfs.html.value');
  }

  email(domain: string): Promise<string> {
    return this.record(domain, 'whois.email.value');
  }

  httpUrl(domain: string): Promise<string> {
    return this.record(domain, 'ipfs.redirect_domain.value');
  }

  chatId(domain: string): Promise<string> {
    return this.record(domain, 'gundb.username.value');
  }

  chatpk(domain: string): Promise<string> {
    return this.record(domain, 'gundb.public_key.value');
  }

  childhash(_: string, __: string): string {
    throw new Error('Method not implemented.');
  }

  protected async get(domain: string, keys: string[] = []): Promise<Data> {
    const tokenId = this.namehash(domain);
    try {
      const [resolver, owner, values] =
        await this.registryContract.call('getData', [keys, tokenId]) || [];
      return { resolver, owner, values };
    } catch {
      return {};
    }
  }

  protected getOwner(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    return this.registryContract.call('ownerOf', [tokenId]);
  }

  protected async verify(domain: string, data: Data) {
    const { resolver } = data;
    if (!isNullAddress(resolver)) {
      return;
    }

    // TODO: temporary call, 'getData' returns empty object, in case of empty resolver.
    const owner = await this.owner(domain);
    if (isNullAddress(owner)) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
      domain,
    });
  }
}
