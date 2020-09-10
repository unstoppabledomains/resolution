import { EthereumNamingService } from './EthereumNamingService';
import {
  NamingServiceName,
  ReaderMap,
  ResolutionResponse,
  SourceDefinition,
  isNullAddress,
  NullAddress,
} from './types';
import { default as proxyReaderAbi } from './cns/contract/proxyReader';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import ICnsReader, { Data } from './cns/ICnsReader';
import CnsProxyReader from './cns/CnsProxyReader';
import CnsRegistryReader from './cns/CnsRegistryReader';
import Contract from './utils/contract';

const ReaderMap: ReaderMap = {
  mainnet: '0x7ea9ee21077f84339eda9c80048ec6db678642b1',
  kovan: '0xcf4318918fd18aca9bdc11445c01fbada4b448e3', // for internal testing
};
/** @internal */
export default class Cns extends EthereumNamingService {
  readonly contract: Contract;
  reader: ICnsReader;

  constructor(source: SourceDefinition = {}) {
    super(source, NamingServiceName.CNS);
    this.contract = this.buildContract(proxyReaderAbi, this.registryAddress);
  }

  async getReader(): Promise<ICnsReader> {
    if (!this.reader) {
      this.reader = await this.isDataReaderSupported() ?
        new CnsProxyReader(this.contract) :
        new CnsRegistryReader(this.contract);
    }
    return this.reader;
  }

  protected defaultRegistry(network: string): string | undefined {
    return ReaderMap[network];
  }

  protected async isDataReaderSupported(): Promise<boolean> {
    if (ReaderMap[this.network] === this.contract.address) {
      return true;
    }

    try {
      const [isDataReaderSupported] = await this.contract.call('supportsInterface', ['0x6eabca0d']);
      if (!isDataReaderSupported) {
        throw new Error('Not supported DataReader');
      }

      return true;
    } catch { }

    return false;
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
    const tokenId = this.namehash(domain);

    const reader = await this.getReader();
    const data = await reader.resolver(tokenId);
    await this.verify(domain, data);

    return data.resolver || '';
  }

  async resolve(_: string): Promise<ResolutionResponse> {
    throw new Error('This method is unsupported for CNS');
  }

  async address(domain: string, currencyTicker: string): Promise<string> {
    const tokenId = this.namehash(domain);

    const reader = await this.getReader();
    const key = `crypto.${currencyTicker.toUpperCase()}.address`;
    const data = await reader.record(tokenId, key);
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
    const tokenId = this.namehash(domain);
    try {
      const [owner] = await this.contract.call('ownerOf', [tokenId]);
      return owner || '';
    } catch (error) {
      if (error.reason === 'ERC721: owner query for nonexistent token') {
        return NullAddress;
      }
      throw error;
    }
  }

  async ipfsHash(domain: string): Promise<string> {
    return await this.record(domain, 'ipfs.html.value');
  }

  async email(domain: string): Promise<string> {
    return await this.record(domain, 'whois.email.value');
  }

  async chatId(domain: string): Promise<string> {
    return await this.record(domain, 'gundb.username.value');
  }

  async chatpk(domain: string): Promise<string> {
    return await this.record(domain, 'gundb.public_key.value');
  }

  async httpUrl(domain: string): Promise<string> {
    return await this.record(domain, 'ipfs.redirect_domain.value');
  }

  async record(domain: string, key: string): Promise<string> {
    const tokenId = this.namehash(domain);

    const reader = await this.getReader();
    const data = await reader.record(tokenId, key);
    await this.verify(domain, data);

    const { values } = data;
    const value: string | null = values?.length ? values[0] : null;
    return this.ensureRecordPresence(domain, key, value);
  }

  protected async getResolver(tokenId: string): Promise<string> {
    return await this.ignoreResolutionError(
      ResolutionErrorCode.RecordNotFound,
      this.callMethod(this.registryContract, 'resolverOf', [tokenId]),
    );
  }

  protected async verify(domain: string, data: Data) {
    const { resolver } = data;
    if (!isNullAddress(resolver)) {
      return;
    }

    const owner = data.owner || await this.owner(domain);
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
