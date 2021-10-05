import UnsInternal from '../UnsInternal';
import {NullAddress} from '../types';
import {
  mockAsyncMethods,
  expectSpyToBeCalled,
  protocolLink,
  CryptoDomainWithAllRecords,
  WalletDomainLayerTwoWithAllRecords,
  mockAPICalls,
  ProviderProtocol,
} from './helpers';
import {UnsLocation} from '../types/publicTypes';
import {
  ConfigurationError,
  ConfigurationErrorCode,
  ResolutionError,
  ResolutionErrorCode,
} from '..';
import {eip137Namehash} from '../utils/namehash';

let unsInternalL1: UnsInternal;
let unsInternalL2: UnsInternal;

beforeEach(async () => {
  jest.restoreAllMocks();
  unsInternalL1 = new UnsInternal(UnsLocation.Layer1, {
    url: protocolLink(ProviderProtocol.http, 'UNSL1'),
    network: 'rinkeby',
  });
  unsInternalL2 = new UnsInternal(UnsLocation.Layer2, {
    url: protocolLink(ProviderProtocol.http, 'UNSL2'),
    network: 'polygon-mumbai',
  });
});

describe('UnsInternal', () => {
  describe('constructor()', () => {
    it('should throw error on invalid network', async () => {
      expect(
        () =>
          new UnsInternal(UnsLocation.Layer1, {
            url: protocolLink(ProviderProtocol.http, 'UNSL1'),
          } as any),
      ).toThrow(
        new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
          method: UnsLocation.Layer1,
        }),
      );
    });
    it('should throw error on no proxyReaderAddress for custom network', async () => {
      expect(
        () =>
          new UnsInternal(UnsLocation.Layer1, {
            url: protocolLink(ProviderProtocol.http, 'UNSL1'),
            network: 'custom',
          }),
      ).toThrow(
        new ConfigurationError(
          ConfigurationErrorCode.CustomNetworkConfigMissing,
          {
            method: UnsLocation.Layer1,
            config: 'proxyReaderAddress',
          },
        ),
      );
    });
    it('should throw error on invalid proxyReaderAddress for custom network', async () => {
      expect(
        () =>
          new UnsInternal(UnsLocation.Layer1, {
            url: protocolLink(ProviderProtocol.http, 'UNSL1'),
            network: 'custom',
            proxyReaderAddress: '0xinvalid',
          }),
      ).toThrow(
        new ConfigurationError(
          ConfigurationErrorCode.InvalidConfigurationField,
          {
            method: UnsLocation.Layer1,
            field: 'proxyReaderAddress',
          },
        ),
      );
    });
    it('should throw error on missing url or provider for custom network', async () => {
      expect(
        () =>
          new UnsInternal(UnsLocation.Layer1, {
            network: 'custom',
            proxyReaderAddress: '0x7E9CC9e9120ccDE9038fD664fE82b1fC7d88e949',
          }),
      ).toThrow(
        new ConfigurationError(
          ConfigurationErrorCode.CustomNetworkConfigMissing,
          {
            method: UnsLocation.Layer1,
            config: 'url or provider',
          },
        ),
      );
    });
  });
  it('should return tokenURI for domain on L2', async () => {
    const tokenURI = `https://metadata.staging.unstoppabledomains.com/metadata/${WalletDomainLayerTwoWithAllRecords}`;
    const namehash = eip137Namehash(WalletDomainLayerTwoWithAllRecords);
    mockAsyncMethods(unsInternalL2.readerContract, {
      call: [tokenURI],
    });
    const result = await unsInternalL2.getTokenUri(namehash);
    expect(result).toEqual(tokenURI);
  });
  it('should return tokenURI for domain on L1', async () => {
    const tokenURI = `https://metadata.staging.unstoppabledomains.com/metadata/${CryptoDomainWithAllRecords}`;
    const namehash = eip137Namehash(CryptoDomainWithAllRecords);
    mockAsyncMethods(unsInternalL1.readerContract, {
      call: [tokenURI],
    });
    const result = await unsInternalL1.getTokenUri(namehash);
    expect(result).toEqual(tokenURI);
  });
  describe('.registryAddress()', () => {
    it('should throw error for invalid domain', async () => {
      const domain = 'invaliddomain.zil';
      expect(() => unsInternalL1.registryAddress(domain)).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
          domain,
        }),
      );
    });
    it('should throw error for unregistered domain', async () => {
      const domain = 'unregistered-domain.crypto';
      mockAsyncMethods(unsInternalL2.readerContract, {
        call: [NullAddress],
      });
      expect(() => unsInternalL2.registryAddress(domain)).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain,
        }),
      );
    });
    it('should return registry address', async () => {
      const registryAddress = '0x2a93C52E7B6E7054870758e15A1446E769EdfB93';
      mockAsyncMethods(unsInternalL2.readerContract, {
        call: [registryAddress],
      });
      expect(
        await unsInternalL2.registryAddress(WalletDomainLayerTwoWithAllRecords),
      ).toEqual(registryAddress);
    });
  });
  describe('.get()', () => {
    it('should get records for L1', async () => {
      const resolverAddress = '0x95AE1515367aa64C462c71e87157771165B1287A';
      const recordName = 'crypto.ETH.address';
      const records = {
        [recordName]: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
      };
      const owner = '0x499dD6D875787869670900a2130223D85d4F6Aa7';
      const tokenId = eip137Namehash(CryptoDomainWithAllRecords);
      mockAsyncMethods(unsInternalL1.readerContract, {
        call: [resolverAddress, owner, [records[recordName]]],
      });
      const data = await unsInternalL1.get(tokenId, [recordName]);
      expect(data.resolver).toEqual(resolverAddress);
      expect(data.location).toEqual(UnsLocation.Layer1);
      expect(data.records).toEqual(records);
      expect(data.owner).toEqual(owner);
    });
    it('should get records for L2', async () => {
      const resolverAddress = '0x2a93C52E7B6E7054870758e15A1446E769EdfB93';
      const recordName = 'crypto.ETH.address';
      const records = {
        [recordName]: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
      };
      const owner = '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2';
      const tokenId = eip137Namehash(WalletDomainLayerTwoWithAllRecords);
      mockAsyncMethods(unsInternalL2.readerContract, {
        call: [resolverAddress, owner, [records[recordName]]],
      });
      const data = await unsInternalL2.get(tokenId, [recordName]);
      expect(data.resolver).toEqual(resolverAddress);
      expect(data.location).toEqual(UnsLocation.Layer2);
      expect(data.records).toEqual(records);
      expect(data.owner).toEqual(owner);
    });
  });
  describe('.resolver()', () => {
    it('should throw on unspecified resolver on L2', async () => {
      const resolverAddress = NullAddress;
      const owner = '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2';
      mockAsyncMethods(unsInternalL2.readerContract, {
        call: [resolverAddress, owner, []],
      });
      expect(() =>
        unsInternalL2.resolver(WalletDomainLayerTwoWithAllRecords),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
          location: UnsLocation.Layer2,
          domain: WalletDomainLayerTwoWithAllRecords,
        }),
      );
    });
    it('should throw on unregistered domain on L2', async () => {
      const resolverAddress = NullAddress;
      const owner = NullAddress;
      mockAsyncMethods(unsInternalL2.readerContract, {
        call: [resolverAddress, owner, []],
      });
      expect(() =>
        unsInternalL2.resolver('unregistered-domain.wallet'),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain: 'unregistered-domain.wallet',
        }),
      );
    });
    it('should throw on unspecified resolver on L1', async () => {
      const resolverAddress = NullAddress;
      const owner = '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2';
      mockAsyncMethods(unsInternalL1.readerContract, {
        call: [resolverAddress, owner, []],
      });
      expect(() =>
        unsInternalL1.resolver(CryptoDomainWithAllRecords),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
          location: UnsLocation.Layer1,
          domain: CryptoDomainWithAllRecords,
        }),
      );
    });
    it('should throw on unregistered domain on L1', async () => {
      const resolverAddress = NullAddress;
      const owner = NullAddress;
      mockAsyncMethods(unsInternalL1.readerContract, {
        call: [resolverAddress, owner, []],
      });
      expect(() =>
        unsInternalL1.resolver('unregistered-domain.crypto'),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain: 'unregistered-domain.crypto',
        }),
      );
    });
    it('should return valid resolver on L1', async () => {
      const spies = mockAsyncMethods(unsInternalL1.readerContract, {
        call: ['0x95AE1515367aa64C462c71e87157771165B1287A', NullAddress, []],
      });
      const resolverAddress = await unsInternalL1.resolver(
        CryptoDomainWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0x95AE1515367aa64C462c71e87157771165B1287A',
      );
    });
    it('should return valid resolver on L2', async () => {
      const spies = mockAsyncMethods(unsInternalL2.readerContract, {
        call: ['0x2a93C52E7B6E7054870758e15A1446E769EdfB93', NullAddress, []],
      });
      const resolverAddress = await unsInternalL2.resolver(
        WalletDomainLayerTwoWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
      );
    });
  });

  describe('.allRecords()', () => {
    it('should return all records on L1', async () => {
      const records = {
        'crypto.ADA.address':
          'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
        'crypto.BCH.address': 'qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8',
        'crypto.BTC.address': '1MUFCFhhuApRqfbqNby6Jvvp6gbYx6yWhR',
        'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
        'crypto.LTC.address': 'ltc1qj03wgu07dqytxz4r9arc4taz2u7mzuz38xpuu4',
        'crypto.USDC.address': '0x666574cAdedEB4a0f282fF0C2B3588617E29e6A0',
        'crypto.USDT.version.EOS.address': 'letsminesome',
        'crypto.USDT.version.ERC20.address':
          '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
        'crypto.USDT.version.OMNI.address':
          '19o6LvAdCPkjLi83VsjrCsmvQZUirT4KXJ',
        'crypto.USDT.version.TRON.address':
          'TNemhXhpX7MwzZJa3oXvfCjo5pEeXrfN2h',
        'crypto.XRP.address': 'rMXToC1316oNyqwgQpWgSrzMUU9R6UDizW',
        'crypto.ZIL.address': 'zil1xftz4cd425mer6jxmtl29l28xr0zu8s5hnp9he',
        'dns.A': '["10.0.0.1","10.0.0.3"]',
        'dns.A.ttl': '98',
        'dns.AAAA': '[]',
        'dns.ttl': '128',
        'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
        'ipfs.redirect_domain.value': 'google.com',
        'whois.email.value': 'johnny@unstoppabledomains.com',
      };
      const spies = mockAsyncMethods(unsInternalL1, {
        resolver: '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
        getAllRecords: records,
      });
      const result = await unsInternalL1.allRecords(CryptoDomainWithAllRecords);
      expectSpyToBeCalled(spies);
      expect(result).toEqual(records);
    });
    it('should return all records on L2', async () => {
      const records = {
        'crypto.ADA.address':
          'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
        'crypto.BCH.address': 'qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8',
        'crypto.BTC.address': '1MUFCFhhuApRqfbqNby6Jvvp6gbYx6yWhR',
        'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
        'crypto.LTC.address': 'ltc1qj03wgu07dqytxz4r9arc4taz2u7mzuz38xpuu4',
        'crypto.USDC.address': '0x666574cAdedEB4a0f282fF0C2B3588617E29e6A0',
        'crypto.USDT.version.EOS.address': 'letsminesome',
        'crypto.USDT.version.ERC20.address':
          '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
        'crypto.USDT.version.OMNI.address':
          '19o6LvAdCPkjLi83VsjrCsmvQZUirT4KXJ',
        'crypto.USDT.version.TRON.address':
          'TNemhXhpX7MwzZJa3oXvfCjo5pEeXrfN2h',
        'crypto.XRP.address': 'rMXToC1316oNyqwgQpWgSrzMUU9R6UDizW',
        'crypto.ZIL.address': 'zil1xftz4cd425mer6jxmtl29l28xr0zu8s5hnp9he',
        'dns.A': '["10.0.0.1","10.0.0.3"]',
        'dns.A.ttl': '98',
        'dns.AAAA': '[]',
        'dns.ttl': '128',
        'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
        'ipfs.redirect_domain.value': 'google.com',
        'whois.email.value': 'johnny@unstoppabledomains.com',
      };
      const spies = mockAsyncMethods(unsInternalL2, {
        resolver: '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
        getAllRecords: records,
      });
      const result = await unsInternalL2.allRecords(
        WalletDomainLayerTwoWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expect(result).toBe(records);
    });
  });

  it('should return true for tld exists', async () => {
    mockAPICalls('uns_domain_exists_test', protocolLink());
    const exists = await unsInternalL1.exists(
      CryptoDomainWithAllRecords.split('.')[1],
    );
    expect(exists).toBe(true);
  });
  it('should return true for domain exists', async () => {
    mockAPICalls('uns_domain_exists_test', protocolLink());
    const exists = await unsInternalL1.exists(CryptoDomainWithAllRecords);
    expect(exists).toBe(true);
  });
  it('should return true for tld exists on L2', async () => {
    mockAPICalls(
      'uns_l2_domain_exists_test',
      protocolLink(ProviderProtocol.http, 'UNSL2'),
    );
    const exists = await unsInternalL2.exists(
      WalletDomainLayerTwoWithAllRecords.split('.')[1],
    );
    expect(exists).toBe(true);
  });
  it('should return true for domain exists on L2', async () => {
    mockAPICalls(
      'uns_l2_domain_exists_test',
      protocolLink(ProviderProtocol.http, 'UNSL2'),
    );
    const exists = await unsInternalL2.exists(
      WalletDomainLayerTwoWithAllRecords,
    );
    expect(exists).toBe(true);
  });
});