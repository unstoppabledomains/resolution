import UnsInternal from '../UnsInternal';
import {NullAddress} from '../types';
import {
  mockAsyncMethods,
  expectSpyToBeCalled,
  getUnsProtocolLinkFromEnv,
  CryptoDomainWithAllRecords,
  WalletDomainLayerTwoWithAllRecords,
  mockAPICalls,
  ProviderProtocol,
  WalletDomainOnBothLayers,
  skipItInLive,
} from './helpers';
import {BlockchainType, UnsLocation} from '../types/publicTypes';
import {
  ConfigurationErrorCode,
  ConfigurationError,
} from '../errors/configurationError';
import {ResolutionError, ResolutionErrorCode} from '../errors/resolutionError';
import {eip137Namehash, fromHexStringToDecimals} from '../utils/namehash';
import Networking from '../utils/Networking';

let unsInternalL1: UnsInternal;
let unsInternalL2: UnsInternal;

beforeEach(async () => {
  jest.restoreAllMocks();
  unsInternalL1 = new UnsInternal(
    UnsLocation.Layer1,
    {
      url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
      network: 'goerli',
    },
    BlockchainType.ETH,
  );
  unsInternalL2 = new UnsInternal(
    UnsLocation.Layer2,
    {
      url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
      network: 'polygon-mumbai',
    },
    BlockchainType.MATIC,
  );
});

describe('UnsInternal', () => {
  describe('constructor()', () => {
    it('should throw error on invalid network', async () => {
      expect(
        () =>
          new UnsInternal(
            UnsLocation.Layer1,
            {
              url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
            } as any,
            BlockchainType.ETH,
          ),
      ).toThrow(
        new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
          method: UnsLocation.Layer1,
        }),
      );
    });
    it('should throw error on no proxyReaderAddress for custom network', async () => {
      expect(
        () =>
          new UnsInternal(
            UnsLocation.Layer1,
            {
              url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
              network: 'custom',
            },
            BlockchainType.ETH,
          ),
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
          new UnsInternal(
            UnsLocation.Layer1,
            {
              url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
              network: 'custom',
              proxyReaderAddress: '0xinvalid',
            },
            BlockchainType.ETH,
          ),
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
          new UnsInternal(
            UnsLocation.Layer1,
            {
              network: 'custom',
              proxyReaderAddress: '0x7E9CC9e9120ccDE9038fD664fE82b1fC7d88e949',
            },
            BlockchainType.ETH,
          ),
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

    it('should accept an api key', async () => {
      unsInternalL1 = new UnsInternal(
        UnsLocation.Layer1,
        {
          url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
          network: 'goerli',
          proxyServiceApiKey: 'some key',
        },
        BlockchainType.ETH,
      );

      expect(unsInternalL1.readerContract.apiKey).toEqual('some key');
    });
  });
  it('should return tokenURI for domain on L2', async () => {
    const namehash = eip137Namehash(WalletDomainLayerTwoWithAllRecords);
    const tokenId = fromHexStringToDecimals(namehash);

    const tokenURI = `https://metadata.staging.unstoppabledomains.com/metadata/${tokenId}`;
    mockAsyncMethods(unsInternalL2.readerContract, {
      call: [tokenURI],
    });
    const result = await unsInternalL2.getTokenUri(tokenId);
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
      const domain = '.crypto';
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
        [recordName]: '0x499dd6d875787869670900a2130223d85d4f6aa7',
      };
      const owner = '0x499dD6D875787869670900a2130223D85d4F6Aa7';
      const tokenId = eip137Namehash(WalletDomainOnBothLayers);
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
    skipItInLive('should throw on unspecified resolver on L2', async () => {
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
      const owner = '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2';
      mockAsyncMethods(unsInternalL1.readerContract, {
        call: [NullAddress, owner, []],
      });
      expect(() =>
        unsInternalL1.resolver('udtestdev-d0137c.crypto'),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
          location: UnsLocation.Layer1,
          domain: 'udtestdev-d0137c.crypto',
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

  it('should return true for tld exists', async () => {
    mockAPICalls(
      'uns_domain_exists_test',
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
    );
    const exists = await unsInternalL1.exists(
      CryptoDomainWithAllRecords.split('.')[1],
    );
    expect(exists).toBe(true);
  });
  it('should return true for domain exists', async () => {
    mockAPICalls(
      'uns_domain_exists_true_test',
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
    );
    const exists = await unsInternalL1.exists(CryptoDomainWithAllRecords);
    expect(exists).toBe(true);
  });
  it('should return true for tld exists on L2', async () => {
    mockAPICalls(
      'uns_l2_domain_exists_test',
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
    );
    const exists = await unsInternalL2.exists(
      WalletDomainLayerTwoWithAllRecords.split('.')[1],
    );
    expect(exists).toBe(true);
  });
  it('should return true for domain exists on L2', async () => {
    mockAPICalls(
      'uns_l2_domain_exists_test',
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
    );
    const exists = await unsInternalL2.exists(
      WalletDomainLayerTwoWithAllRecords,
    );
    expect(exists).toBe(true);
  });

  it('should return location for L1 domains', async () => {
    mockAPICalls(
      'uns_l1_location_test',
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
    );
    const location = await unsInternalL1.locations([
      'udtestdev-check.wallet',
      'brad.crypto',
      'testing-domain-doesnt-exist-12345abc.blockchain',
    ]);
    expect(location['udtestdev-check.wallet']).toEqual({
      registryAddress: '0x070e83FCed225184E67c86302493ffFCDB953f71',
      resolverAddress: '0x070e83FCed225184E67c86302493ffFCDB953f71',
      networkId: 5,
      blockchain: BlockchainType.ETH,
      ownerAddress: '0x0e43F36e4B986dfbE1a75cacfA60cA2bD44Ae962',
      blockchainProviderUrl: getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      ),
    });
    expect(location['brad.crypto']).toEqual({
      registryAddress: '0x801452cFAC27e79a11c6b185986fdE09e8637589',
      resolverAddress: '0x95AE1515367aa64C462c71e87157771165B1287A',
      networkId: 5,
      blockchain: BlockchainType.ETH,
      ownerAddress: '0x499dD6D875787869670900a2130223D85d4F6Aa7',
      blockchainProviderUrl: getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      ),
    });
    expect(
      location['testing-domain-doesnt-exist-12345abc.blockchain'],
    ).toBeNull();
  });

  it('should return location for L2 domains', async () => {
    mockAPICalls(
      'uns_l2_location_test',
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
    );
    const location = await unsInternalL2.locations([
      'udtestdev-test-l2-domain-784391.wallet',
      'testing-domain-doesnt-exist-12345abc.blockchain',
    ]);
    expect(location['udtestdev-test-l2-domain-784391.wallet']).toEqual({
      registryAddress: '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
      resolverAddress: '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
      networkId: 80001,
      blockchain: BlockchainType.MATIC,
      ownerAddress: '0x499dD6D875787869670900a2130223D85d4F6Aa7',
      blockchainProviderUrl: getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      ),
    });
    expect(
      location['testing-domain-doesnt-exist-12345abc.blockchain'],
    ).toBeNull();
  });

  it('should return location for domains starting with 0x', async () => {
    mockAPICalls(
      'uns_l2_0x_location_test',
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
    );
    const location = await unsInternalL2.locations([
      '0xtestdomain-dev-test.wallet',
    ]);
    expect(location['0xtestdomain-dev-test.wallet']).toEqual({
      registryAddress: '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
      resolverAddress: '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
      networkId: 80001,
      blockchain: BlockchainType.MATIC,
      ownerAddress: '0x499dD6D875787869670900a2130223D85d4F6Aa7',
      blockchainProviderUrl: getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      ),
    });
  });

  it('should pass api key as header to the rpc provider', async () => {
    const fetchSpy = jest.spyOn(Networking, 'fetch');

    unsInternalL1 = new UnsInternal(
      UnsLocation.Layer1,
      {
        url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
        network: 'goerli',
        proxyServiceApiKey: 'some key',
      },
      BlockchainType.ETH,
    );

    mockAPICalls(
      'uns_domain_exists_true_test',
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
    );
    const exists = await unsInternalL1.exists(CryptoDomainWithAllRecords);
    expect(exists).toBe(true);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer some key',
        }),
      }),
    );
  });
});
