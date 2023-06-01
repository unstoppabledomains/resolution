import nock from 'nock';
import Resolution, {
  ResolutionError,
  ResolutionErrorCode,
  UnclaimedDomainResponse,
  UnsLocation,
} from '../index';
import {
  BlockchainType,
  DnsRecordType,
  JsonRpcPayload,
  NamingServiceName,
  Web3Version1Provider,
} from '../types/publicTypes';
import {JsonRpcProvider, InfuraProvider} from '@ethersproject/providers';
import Web3HttpProvider from 'web3-providers-http';
import Web3WsProvider from 'web3-providers-ws';
import {
  expectResolutionErrorCode,
  expectSpyToBeCalled,
  mockAsyncMethods,
  getUnsProtocolLinkFromEnv,
  ProviderProtocol,
  caseMock,
  mockAsyncMethod,
  CryptoDomainWithTwitterVerification,
  skipItInLive,
  isLive,
  CryptoDomainWithUsdtMultiChainRecords,
  expectConfigurationErrorCode,
  CryptoDomainWithAllRecords,
  WalletDomainLayerTwoWithAllRecords,
  WalletDomainOnBothLayers,
  SubdomainLayerTwo,
} from './helpers';
import {RpcProviderTestCases} from './providerMockData';
import fetch, {FetchError} from 'node-fetch';
import Uns from '../Uns';
import Zns from '../Zns';
import FetchProvider from '../FetchProvider';
import {
  ConfigurationErrorCode,
  ConfigurationError,
} from '../errors/configurationError';
import {HTTPProvider} from '@zilliqa-js/core';
import {Eip1993Factories as Eip1193Factories} from '../utils/Eip1993Factories';
import UnsConfig from '../config/uns-config.json';
import {NullAddress} from '../types';
import Networking from '../utils/Networking';

let resolution: Resolution;
let uns: Uns;
let zns: Zns;

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
  resolution = new Resolution({
    sourceConfig: {
      uns: {
        locations: {
          Layer1: {
            url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
            network: 'goerli',
          },
          Layer2: {
            url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
            network: 'polygon-mumbai',
          },
        },
      },
      zns: {network: 'testnet'},
    },
  });
  uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
  zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
});

describe('Resolution', () => {
  describe('constructor', () => {
    it(`should allow to configure with api key`, () => {
      const resolution = new Resolution({
        apiKey: 'some key',
      });

      expect(
        resolution.serviceMap[NamingServiceName.UNS].native instanceof Uns,
      ).toBe(true);
    });
  });

  describe('.Basic setup', () => {
    it('should work with autonetwork url configuration', async () => {
      const polygonUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      );
      const goerliUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      );
      // mocking getNetworkConfigs because no access to inner provider.request
      const UnsGetNetworkOriginal = Uns.autoNetwork;
      if (!isLive()) {
        Uns.autoNetwork = jest.fn().mockReturnValue(
          new Uns({
            locations: {
              Layer1: {
                network: 'goerli',
                provider: new FetchProvider(UnsLocation.Layer1, goerliUrl),
              },
              Layer2: {
                network: 'polygon-mumbai',
                provider: new FetchProvider(UnsLocation.Layer2, polygonUrl),
              },
            },
          }),
        );
      }
      const resolution = await Resolution.autoNetwork({
        uns: {
          locations: {Layer1: {url: goerliUrl}, Layer2: {url: polygonUrl}},
        },
      });
      // We need to manually restore the function as jest.restoreAllMocks and simillar works only with spyOn
      Uns.autoNetwork = UnsGetNetworkOriginal;
      expect(
        (resolution.serviceMap[NamingServiceName.UNS].native as Uns).unsl1
          .network,
      ).toBe('goerli');
      expect(
        (resolution.serviceMap[NamingServiceName.UNS].native as Uns).unsl2
          .network,
      ).toBe('polygon-mumbai');
    });

    it('should not work with invalid proxyReader configuration #1', async () => {
      const goerliUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      );
      const customNetwork = 'goerli';
      const polygonUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      );
      await expectConfigurationErrorCode(() => {
        new Uns({
          locations: {
            Layer1: {
              network: customNetwork,
              url: goerliUrl,
              proxyReaderAddress: '0x012312931293',
            },
            Layer2: {
              network: 'polygon-mumbai',
              url: polygonUrl,
              proxyReaderAddress: '0x012312931293',
            },
          },
        });
      }, ConfigurationErrorCode.InvalidConfigurationField);
    });
    it('should not work with invalid proxyReader configuration #2', async () => {
      const goerliUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      );
      const customNetwork = 'goerli';
      const polygonUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      );
      await expect(() => {
        new Uns({
          locations: {
            Layer1: {
              network: customNetwork,
              url: goerliUrl,
              proxyReaderAddress: '0xe7474D07fD2FA286e7e0aa23cd107F8379025037',
            },
            Layer2: {
              network: 'polygon-mumbai',
              url: polygonUrl,
              proxyReaderAddress: '0x012312931293',
            },
          },
        });
      }).toThrow(
        new ConfigurationError(
          ConfigurationErrorCode.InvalidConfigurationField,
          {
            method: UnsLocation.Layer2,
            field: 'proxyReaderAddress',
          },
        ),
      );
    });

    it('should not work with invalid proxyReader configuration #3', async () => {
      const goerliUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      );
      const provider = new FetchProvider(NamingServiceName.UNS, goerliUrl);
      const polygonUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      );
      const polygonProvider = new FetchProvider(UnsLocation.Layer2, polygonUrl);
      const customNetwork = 'goerli';
      await expectConfigurationErrorCode(() => {
        new Uns({
          locations: {
            Layer1: {
              network: customNetwork,
              provider,
              proxyReaderAddress: '0xe7474D07fD2FA286e7e0aa23cd107F8379025037',
            },
            Layer2: {
              network: 'polygon-mumbai',
              provider: polygonProvider,
              proxyReaderAddress: '0x332a8191905fa8e6eea7350b5799f225b8ed',
            },
          },
        });
      }, ConfigurationErrorCode.InvalidConfigurationField);
    });

    it('should work with proxyReader configuration', async () => {
      const goerliUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      );
      const polygonUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      );
      const customNetwork = 'goerli';

      const uns = new Uns({
        locations: {
          Layer1: {
            network: customNetwork,
            url: goerliUrl,
            proxyReaderAddress: '0xe7474D07fD2FA286e7e0aa23cd107F8379025037',
          },
          Layer2: {
            network: 'polygon-mumbai',
            url: polygonUrl,
            proxyReaderAddress: '0x332a8191905fa8e6eea7350b5799f225b8ed30a9',
          },
        },
      });
      expect(uns).toBeDefined();
    });

    it('should work with custom network configuration with provider', async () => {
      const goerliUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      );
      const provider = new FetchProvider(NamingServiceName.UNS, goerliUrl);
      const polygonUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      );
      const polygonProvider = new FetchProvider(UnsLocation.Layer2, polygonUrl);
      const customNetwork = 'goerli';
      const uns = new Uns({
        locations: {
          Layer1: {
            network: customNetwork,
            provider,
            proxyReaderAddress: '0xe7447Fdd52FA286e7e0aa23cd107F83790250897',
          },
          Layer2: {
            network: 'polygon-mumbai',
            provider: polygonProvider,
            proxyReaderAddress: '0x332a8191905fa8e6eea7350b5799f225b8ed30a9',
          },
        },
      });
      expect(uns).toBeDefined();
    });

    it('should work with autonetwork provider configuration', async () => {
      const provider = new FetchProvider(
        'UDAPI',
        getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
      );

      const polygonUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      );
      const polygonProvider = new FetchProvider(UnsLocation.Layer2, polygonUrl);
      const spy = mockAsyncMethod(provider, 'request', '1');
      const spyTwo = mockAsyncMethod(polygonProvider, 'request', '80001');
      const resolution = await Resolution.autoNetwork({
        uns: {
          locations: {Layer1: {provider}, Layer2: {provider: polygonProvider}},
        },
      });
      expect(spy).toBeCalledTimes(1);
      expect(spyTwo).toBeCalledTimes(1);
      expect(
        (resolution.serviceMap[NamingServiceName.UNS].native as Uns).unsl1
          .network,
      ).toBe('mainnet');
      expect(
        (resolution.serviceMap[NamingServiceName.UNS].native as Uns).unsl2
          .network,
      ).toBe('polygon-mumbai');
    });

    it('should fail because provided url failled net_version call', async () => {
      const mockedProvider = new FetchProvider(
        NamingServiceName.UNS,
        'https://google.com',
      );
      const providerSpy = mockAsyncMethod(
        mockedProvider,
        'request',
        new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage:
            'Request to https://google.com failed with response status 405',
        }),
      );
      const factorySpy = mockAsyncMethod(
        FetchProvider,
        'factory',
        () => mockedProvider,
      );
      try {
        await Resolution.autoNetwork({
          uns: {
            locations: {
              Layer1: {url: 'https://google.com'},
              Layer2: {url: 'https://google.com'},
            },
          },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ResolutionError);
        expect(error.message).toBe(
          '< Request to https://google.com failed with response status 405 >',
        );
      }
      expectSpyToBeCalled([factorySpy, providerSpy]);
    });

    it('should fail because of unsupported test network for uns', async () => {
      const blockchainUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL1',
      );
      const polygonUrl = getUnsProtocolLinkFromEnv(
        ProviderProtocol.http,
        'UNSL2',
      );
      const mockedProvider = new FetchProvider(
        NamingServiceName.UNS,
        blockchainUrl,
      );
      mockAsyncMethod(mockedProvider, 'request', () => '3');
      mockAsyncMethod(FetchProvider, 'factory', () => mockedProvider);

      await expectConfigurationErrorCode(
        Resolution.autoNetwork({
          uns: {
            locations: {
              Layer1: {url: blockchainUrl},
              Layer2: {url: polygonUrl},
            },
          },
        }),
        ConfigurationErrorCode.UnsupportedNetwork,
      );
    });

    skipItInLive('should fail in test development', async () => {
      try {
        await fetch('https://pokeres.bastionbot.org/images/pokemon/10.png', {});
      } catch (err) {
        // nock should prevent all outgoing traffic
        expect(err).toBeInstanceOf(FetchError);
        return;
      }
      throw new Error('nock is not configured correctly!');
    });

    it('should get a valid resolution instance with .infura', async () => {
      const resolution = Resolution.infura('api-key', {
        uns: {
          locations: {
            Layer1: {network: 'goerli'},
            Layer2: {network: 'polygon-mumbai'},
          },
        },
      });
      uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
      expect(uns.unsl1.url).toBe(`https://goerli.infura.io/v3/api-key`);
      expect(uns.unsl2.url).toBe(`https://polygon-mumbai.infura.io/v3/api-key`);
    });

    it('should get a valid resolution instance with .alchemy', async () => {
      const resolution = Resolution.alchemy('api-key', {
        uns: {
          locations: {
            Layer1: {network: 'goerli'},
            Layer2: {network: 'polygon-mumbai'},
          },
        },
      });
      uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
      expect(uns.unsl1.url).toBe(`https://eth-goerli.alchemyapi.io/v2/api-key`);
      expect(uns.unsl2.url).toBe(
        `https://polygon-mumbai.g.alchemy.com/v2/api-key`,
      );
    });

    it('should throw on unspecified network', async () => {
      expect(() => Resolution.fromResolutionProvider({})).toThrowError(
        '< Must specify network for uns or zns >',
      );
    });

    it('should create resolution instance from Zilliqa provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      const resolutionFromZilliqaProvider =
        Resolution.fromZilliqaProvider(provider);
      const resolution = new Resolution({
        sourceConfig: {
          zns: {url: 'https://api.zilliqa.com', network: 'mainnet'},
        },
      });
      expect(
        (
          resolutionFromZilliqaProvider.serviceMap[NamingServiceName.ZNS]
            .native as Zns
        ).url,
      ).toEqual(
        (resolution.serviceMap[NamingServiceName.ZNS].native as Zns).url,
      );
      expect(
        (
          resolutionFromZilliqaProvider.serviceMap[NamingServiceName.ZNS]
            .native as Zns
        ).network,
      ).toEqual(
        (resolution.serviceMap[NamingServiceName.ZNS].native as Zns).network,
      );
      expect(
        (
          resolutionFromZilliqaProvider.serviceMap[NamingServiceName.ZNS]
            .native as Zns
        ).registryAddr,
      ).toEqual(
        (resolution.serviceMap[NamingServiceName.ZNS].native as Zns)
          .registryAddr,
      );
    });

    it('should retrieve record using resolution instance created from Zilliqa provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      const resolution = Resolution.fromZilliqaProvider(provider);
      uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
      zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;

      const unsSpy = mockAsyncMethod(uns, 'record', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const znsSpy = mockAsyncMethod(zns, 'allRecords', {
        'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
      });
      const ethAddress = await resolution.addr('brad.zil', 'ETH');
      expectSpyToBeCalled([unsSpy, znsSpy]);
      expect(ethAddress).toBe('0x45b31e01AA6f42F0549aD482BE81635ED3149abb');
    });

    it('should retrieve subdomain records', async () => {
      mockAsyncMethods(uns, {
        get: {
          resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
          records: {
            ['crypto.ETH.address']:
              '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
          },
        },
      });
      const ethAddress = await resolution.addr(SubdomainLayerTwo, 'ETH');
      expect(ethAddress).toBe('0x45b31e01AA6f42F0549aD482BE81635ED3149abb');
      expect(resolution.addr(SubdomainLayerTwo, 'ABC')).rejects.toThrowError(
        'No crypto.ABC.address record found for subdomain.resolution-test.wallet',
      );
    });

    it('provides empty response constant', async () => {
      const response = UnclaimedDomainResponse;
      expect(response.addresses).toEqual({});
      expect(response.meta.owner).toEqual(null);
    });

    describe('.ServiceName', () => {
      it('should resolve gundb chat id', async () => {
        const eyes = mockAsyncMethods(uns, {
          get: {
            resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            records: {
              ['gundb.username.value']:
                '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
            },
          },
        });
        const gundb = await resolution.chatId('homecakes.crypto');
        expectSpyToBeCalled(eyes);
        expect(gundb).toBe(
          '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
        );
      });

      it('should resolve gundb chat id for subdomain', async () => {
        const eyes = mockAsyncMethods(uns, {
          get: {
            resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            records: {
              ['gundb.username.value']:
                '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
            },
          },
        });
        const gundb = await resolution.chatId(SubdomainLayerTwo);
        expectSpyToBeCalled(eyes);
        expect(gundb).toBe(
          '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
        );
      });

      describe('.ipfsHash', () => {
        skipItInLive(
          'should prioritize new keys over depricated ones',
          async () => {
            const spies = mockAsyncMethods(uns, {
              get: {
                resolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
                records: {
                  ['dweb.ipfs.hash']: 'new record Ipfs hash',
                  ['ipfs.html.value']: 'old record Ipfs hash',
                },
              },
            });
            const hash = await resolution.ipfsHash(CryptoDomainWithAllRecords);
            expectSpyToBeCalled(spies);
            expect(hash).toBe('new record Ipfs hash');
          },
        );

        skipItInLive(
          'should prioritize browser record key over ipfs.redirect_url one',
          async () => {
            const spies = mockAsyncMethods(uns, {
              get: {
                resolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
                records: {
                  ['browser.redirect_url']: 'new record redirect url',
                  ['ipfs.redirect_domain.value']: 'old record redirect url',
                },
              },
            });
            const redirectUrl = await resolution.httpUrl(
              CryptoDomainWithAllRecords,
            );
            expectSpyToBeCalled(spies);
            expect(redirectUrl).toBe('new record redirect url');
          },
        );
      });
    });

    describe('.Errors', () => {
      it('checks Resolution#addr error #1', async () => {
        const resolution = new Resolution();
        uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
        zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
        const unsSpy = mockAsyncMethod(uns, 'record', async () => {
          throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
        });
        const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', undefined);
        await expectResolutionErrorCode(
          resolution.addr('sdncdoncvdinvcsdncs.zil', 'ZIL'),
          ResolutionErrorCode.UnregisteredDomain,
        );
        expectSpyToBeCalled([unsSpy, znsSpy]);
      });
      it('checks Resolution#addr error #2', async () => {
        const resolution = new Resolution({
          sourceConfig: {
            uns: {
              locations: {
                Layer1: {
                  url: getUnsProtocolLinkFromEnv(
                    ProviderProtocol.http,
                    'UNSL1',
                  ),
                  network: 'goerli',
                },
                Layer2: {
                  url: getUnsProtocolLinkFromEnv(
                    ProviderProtocol.http,
                    'UNSL2',
                  ),
                  network: 'polygon-mumbai',
                },
              },
            },
          },
        });
        uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
        const spy = mockAsyncMethods(uns, {
          get: {},
        });
        await expectResolutionErrorCode(
          resolution.addr('sdncdoncvdinvcsdncs.crypto', 'ETH'),
          ResolutionErrorCode.UnregisteredDomain,
        );
        expectSpyToBeCalled(spy);
      });

      it('should throw error for unsupported domain', async () => {
        await expectResolutionErrorCode(
          resolution.addr('sdncdoncvdinvcsdncs.eth', 'ETH'),
          ResolutionErrorCode.UnsupportedDomain,
        );
      });

      it('checks error for email on ryan-testing.zil', async () => {
        const unsSpy = mockAsyncMethod(uns, 'record', async () => {
          throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
        });
        const znsSpy = mockAsyncMethod(zns, 'allRecords', async () => ({
          'crypto.ETH.address': '0xc101679df8e2d6092da6d7ca9bced5bfeeb5abd8',
          'crypto.ZIL.address': 'zil1k78e8zkh79lc47mrpcwqyhdrdkz7ptumk7ud90',
        }));
        await expectResolutionErrorCode(
          resolution.email('ryan-testing.zil'),
          ResolutionErrorCode.RecordNotFound,
        );
        expectSpyToBeCalled([unsSpy, znsSpy]);
      });

      describe('.Namehash errors', () => {
        it('should be invalid domain', async () => {
          const unsInvalidDomain = 'hello..crypto';
          const znsInvalidDomain = 'hello..zil';
          await expectResolutionErrorCode(
            () => resolution.namehash(unsInvalidDomain, NamingServiceName.UNS),
            ResolutionErrorCode.UnsupportedDomain,
          );
          await expectResolutionErrorCode(
            () => resolution.namehash(znsInvalidDomain, NamingServiceName.UNS),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });
      });
    });

    describe('.Records', () => {
      describe('.DNS', () => {
        skipItInLive('getting dns get', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
              records: {
                'dns.ttl': '128',
                'dns.A': '["10.0.0.1","10.0.0.2"]',
                'dns.A.ttl': '90',
                'dns.AAAA': '["10.0.0.120"]',
              },
            },
          });
          const dnsRecords = await resolution.dns('someTestDomain.crypto', [
            DnsRecordType.A,
            DnsRecordType.AAAA,
          ]);
          expectSpyToBeCalled(spies);
          expect(dnsRecords).toStrictEqual([
            {TTL: 90, data: '10.0.0.1', type: 'A'},
            {TTL: 90, data: '10.0.0.2', type: 'A'},
            {TTL: 128, data: '10.0.0.120', type: 'AAAA'},
          ]);
        });

        skipItInLive('getting dns records for subdomains', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
              records: {
                'dns.ttl': '128',
                'dns.A': '["10.0.0.1","10.0.0.2"]',
                'dns.A.ttl': '90',
                'dns.AAAA': '["10.0.0.120"]',
              },
            },
          });
          const dnsRecords = await resolution.dns(SubdomainLayerTwo, [
            DnsRecordType.A,
            DnsRecordType.AAAA,
          ]);
          expectSpyToBeCalled(spies);
          expect(dnsRecords).toStrictEqual([
            {TTL: 90, data: '10.0.0.1', type: 'A'},
            {TTL: 90, data: '10.0.0.2', type: 'A'},
            {TTL: 128, data: '10.0.0.120', type: 'AAAA'},
          ]);
        });

        skipItInLive('should work with others records', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
              records: {
                'dns.ttl': '128',
                'dns.A': '["10.0.0.1","10.0.0.2"]',
                'dns.A.ttl': '90',
                'dns.AAAA': '["10.0.0.120"]',
                ['crypto.ETH.address']:
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
                ['crypto.ADA.address']:
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
                ['crypto.ARK.address']:
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
              },
            },
          });
          const dnsRecords = await resolution.dns('someTestDomain.crypto', [
            DnsRecordType.A,
            DnsRecordType.AAAA,
          ]);
          expectSpyToBeCalled(spies);
          expect(dnsRecords).toStrictEqual([
            {TTL: 90, data: '10.0.0.1', type: 'A'},
            {TTL: 90, data: '10.0.0.2', type: 'A'},
            {TTL: 128, data: '10.0.0.120', type: 'AAAA'},
          ]);
        });
      });

      describe('.Metadata', () => {
        it('checks return of email for testing.zil', async () => {
          const unsSpy = mockAsyncMethod(uns, 'record', async () => {
            throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
          });
          const znsSpy = mockAsyncMethod(zns, 'allRecords', async () => ({
            'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
            'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
            'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
            'whois.email.value': 'derainberk@gmail.com',
            'whois.for_sale.value': 'true',
          }));
          const email = await resolution.email('testing.zil');
          expectSpyToBeCalled([unsSpy, znsSpy]);
          expect(email).toBe('derainberk@gmail.com');
        });

        it('should return IPFS value for subdomain', async () => {
          mockAsyncMethod(uns, 'records', async () => ({
            'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
            'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
          }));
          const ipfsHash = await resolution.ipfsHash(SubdomainLayerTwo);
          expect(ipfsHash).toBe(
            'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
          );
        });
      });

      describe('.Crypto', () => {
        it(`domains "brad.crypto" and "Brad.crypto" should return the same results`, async () => {
          const eyes = mockAsyncMethods(uns, {
            get: {
              resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
              records: {
                ['crypto.ETH.address']:
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
              },
            },
          });
          const capital = await resolution.addr('Brad.crypto', 'eth');
          const lower = await resolution.addr('brad.crypto', 'eth');
          expectSpyToBeCalled(eyes, 2);
          expect(capital).toStrictEqual(lower);
        });
        describe('.multichain', () => {
          it('should work with usdt on different erc20', async () => {
            const erc20Spy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.USDT.version.ERC20.address']:
                  '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              },
            });
            const erc20 = await resolution.multiChainAddr(
              CryptoDomainWithUsdtMultiChainRecords,
              'usdt',
              'erc20',
            );
            expect(erc20).toBe('0xe7474D07fD2FA286e7e0aa23cd107F8379085037');
            expect(erc20Spy).toBeCalled();
          });

          it('should work with usdt tron chain', async () => {
            const tronSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.USDT.version.TRON.address']:
                  'TNemhXhpX7MwzZJa3oXvfCjo5pEeXrfN2h',
              },
            });
            const tron = await resolution.multiChainAddr(
              CryptoDomainWithUsdtMultiChainRecords,
              'usdt',
              'tron',
            );
            expect(tron).toBe('TNemhXhpX7MwzZJa3oXvfCjo5pEeXrfN2h');
            expect(tronSpy).toBeCalled();
          });

          it('should work with usdt omni chain', async () => {
            const omniSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.USDT.version.OMNI.address']:
                  '19o6LvAdCPkjLi83VsjrCsmvQZUirT4KXJ',
              },
            });
            const omni = await resolution.multiChainAddr(
              CryptoDomainWithUsdtMultiChainRecords,
              'usdt',
              'omni',
            );
            expect(omni).toBe('19o6LvAdCPkjLi83VsjrCsmvQZUirT4KXJ');
            expect(omniSpy).toBeCalled();
          });

          it('should work with usdt eos chain', async () => {
            const eosSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.USDT.version.EOS.address']: 'letsminesome',
              },
            });
            const eos = await resolution.multiChainAddr(
              CryptoDomainWithUsdtMultiChainRecords,
              'usdt',
              'eos',
            );
            expect(eosSpy).toBeCalled();
            expect(eos).toBe('letsminesome');
          });

          it('should work with subdomain', async () => {
            mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.AAVE.version.MATIC.address']: 'abcabc',
              },
            });
            const matic = await resolution.multiChainAddr(
              SubdomainLayerTwo,
              'aave',
              'matic',
            );
            expect(matic).toBe('abcabc');
          });
        });
      });

      describe('.Providers', () => {
        it('should work with web3HttpProvider', async () => {
          // web3-providers-http has problems with type definitions
          const provider = new (Web3HttpProvider as any)(
            getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
          );
          const polygonProvider = new (Web3HttpProvider as any)(
            getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
          );
          // mock the send function with different implementations (each should call callback right away with different answers)
          const eye = mockAsyncMethod(
            provider,
            'send',
            (payload: JsonRpcPayload, callback) => {
              const result = caseMock(
                payload.params?.[0],
                RpcProviderTestCases,
              );
              callback &&
                callback(null, {
                  jsonrpc: '2.0',
                  id: 1,
                  result,
                });
            },
          );
          const resolution = Resolution.fromWeb3Version1Provider({
            uns: {
              locations: {
                Layer1: {
                  network: 'goerli',
                  provider: provider as unknown as Web3Version1Provider,
                },
                Layer2: {
                  network: 'polygon-mumbai',
                  provider: polygonProvider as unknown as Web3Version1Provider,
                },
              },
            },
          });
          const uns = resolution.serviceMap['UNS'].native as Uns;
          mockAsyncMethod(uns.unsl2.readerContract, 'call', () =>
            Promise.resolve([NullAddress, NullAddress, {}]),
          );
          const ethAddress = await resolution.addr('brad.crypto', 'ETH');

          // expect each mock to be called at least once.
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });

        it('should work with webSocketProvider', async () => {
          // web3-providers-ws has problems with type definitions
          const provider = new (Web3WsProvider as any)(
            getUnsProtocolLinkFromEnv(ProviderProtocol.wss, 'UNSL1'),
          );
          const polygonProvider = new (Web3WsProvider as any)(
            getUnsProtocolLinkFromEnv(ProviderProtocol.wss, 'UNSL2'),
          );
          const eye = mockAsyncMethod(provider, 'send', (payload, callback) => {
            const result = caseMock(payload.params?.[0], RpcProviderTestCases);
            callback(null, {
              jsonrpc: '2.0',
              id: 1,
              result,
            });
          });

          const resolution = Resolution.fromWeb3Version1Provider({
            uns: {
              locations: {
                Layer1: {
                  network: 'goerli',
                  provider: provider as unknown as Web3Version1Provider,
                },
                Layer2: {
                  network: 'polygon-mumbai',
                  provider: polygonProvider as unknown as Web3Version1Provider,
                },
              },
            },
          });
          const uns = resolution.serviceMap['UNS'].native as Uns;
          mockAsyncMethod(uns.unsl2.readerContract, 'call', (params) =>
            Promise.resolve([NullAddress, NullAddress, {}]),
          );
          const ethAddress = await resolution.addr('brad.crypto', 'ETH');
          provider.disconnect(1000, 'end of test');
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });

        it('should work for ethers jsonrpc provider', async () => {
          const provider = new JsonRpcProvider(
            getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
            'goerli',
          );
          const polygonProvider = new JsonRpcProvider(
            getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
            'maticmum',
          );
          const resolution = Resolution.fromEthersProvider({
            uns: {
              locations: {
                Layer1: {network: 'goerli', provider},
                Layer2: {network: 'polygon-mumbai', provider: polygonProvider},
              },
            },
          });
          const uns = resolution.serviceMap['UNS'].native as Uns;
          mockAsyncMethod(uns.unsl2.readerContract, 'call', (params) =>
            Promise.resolve([NullAddress, NullAddress, {}]),
          );
          const eye = mockAsyncMethod(provider, 'call', (params) =>
            Promise.resolve(caseMock(params, RpcProviderTestCases)),
          );
          const ethAddress = await resolution.addr('brad.crypto', 'ETH');
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });

        it('should work with ethers default provider', async () => {
          const provider = new InfuraProvider(
            'mainnet',
            '213fff28936343858ca9c5115eff1419',
          );
          const polygonProvider = new InfuraProvider(
            'maticmum',
            'c4bb906ed6904c42b19c95825fe55f39',
          );

          const eye = mockAsyncMethod(provider, 'call', (params) =>
            Promise.resolve(caseMock(params, RpcProviderTestCases)),
          );
          const resolution = Resolution.fromEthersProvider({
            uns: {
              locations: {
                Layer1: {network: 'goerli', provider},
                Layer2: {network: 'polygon-mumbai', provider: polygonProvider},
              },
            },
          });
          const uns = resolution.serviceMap['UNS'].native as Uns;
          mockAsyncMethod(uns.unsl2.readerContract, 'call', (params) =>
            Promise.resolve([NullAddress, NullAddress, {}]),
          );
          const ethAddress = await resolution.addr('brad.crypto', 'eth');
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });
      });

      describe('.Dweb', () => {
        describe('.IPFS', () => {
          it('checks return of IPFS hash for brad.zil', async () => {
            const unsSpy = mockAsyncMethod(uns, 'records', async () => {
              throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
            });
            const znsSpy = mockAsyncMethod(zns, 'allRecords', async () => ({
              'ipfs.html.value':
                'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
              'whois.email.value': 'derainberk@gmail.com',
              'crypto.BCH.address':
                'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
              'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
              'crypto.ETH.address':
                '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
              'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
              'crypto.XMR.address':
                '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
              'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
              'crypto.ZIL.address':
                'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
              'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
              'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
              'crypto.USDT.version.ERC20.address':
                '0x8aaD44321A86b170879d7A244c1e8d360c99DdA8',
            }));
            const hash = await resolution.ipfsHash('testing.zil');
            expectSpyToBeCalled([unsSpy, znsSpy]);
            expect(hash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
          });
        });

        describe('.Gundb', () => {
          it('should resolve gundb chat id', async () => {
            const eyes = mockAsyncMethods(uns, {
              get: {
                resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
                records: {
                  ['gundb.username.value']:
                    '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
                },
              },
            });
            const gundb = await resolution.chatId('homecakes.crypto');
            expectSpyToBeCalled(eyes);
            expect(gundb).toBe(
              '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
            );
          });
        });
      });

      describe('.Verifications', () => {
        describe('.Twitter', () => {
          it('should return verified twitter handle', async () => {
            const readerSpies = mockAsyncMethods(uns, {
              get: {
                resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
                owner: '0x499dd6d875787869670900a2130223d85d4f6aa7',
                records: {
                  ['validation.social.twitter.username']:
                    '0x01882395ce631866b76f43535843451444ef4a8ff44db0a9432d5d00658a510512c7519a87c78ba9cad7553e26262ada55c254434a1a3784cd98d06fb4946cfb1b',
                  ['social.twitter.username']: 'Marlene12Bob',
                },
              },
            });
            const twitterHandle = await resolution.twitter(
              CryptoDomainWithTwitterVerification,
            );
            expectSpyToBeCalled(readerSpies);
            expect(twitterHandle).toBe('Marlene12Bob');
          });

          it('should throw unsupported method', async () => {
            const resolution = new Resolution();
            const unsSpy = mockAsyncMethod(
              resolution.serviceMap.UNS.native,
              'twitter',
              async () => {
                throw new ResolutionError(
                  ResolutionErrorCode.UnregisteredDomain,
                );
              },
            );
            await expectResolutionErrorCode(
              resolution.twitter('ryan.zil'),
              ResolutionErrorCode.UnsupportedMethod,
            );
            expectSpyToBeCalled([unsSpy]);
          });
        });
      });
    });
  });

  describe('.registryAddress', () => {
    it('should return zns mainnet registry address', async () => {
      const unsSpy = mockAsyncMethod(
        resolution.serviceMap.UNS.native,
        'registryAddress',
        async () => {
          throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
        },
      );
      const registryAddress = await resolution.registryAddress('testi.zil');
      expect(registryAddress).toBe(
        'zil1hyj6m5w4atcn7s806s69r0uh5g4t84e8gp6nps',
      );
      expectSpyToBeCalled([unsSpy]);
    });

    it('should return cns mainnet registry address #1', async () => {
      const spies = mockAsyncMethods(uns, {
        registryAddress: UnsConfig.networks[5].contracts.CNSRegistry.address,
      });
      const registryAddress = await resolution.registryAddress(
        'udtestdev-crewe.crypto',
      );
      expectSpyToBeCalled(spies);
      expect(registryAddress).toBe(
        UnsConfig.networks[5].contracts.CNSRegistry.address,
      );
    });

    it('should return uns mainnet registry address', async () => {
      const spies = mockAsyncMethods(uns, {
        registryAddress: UnsConfig.networks[5].contracts.UNSRegistry.address,
      });
      const registryAddress = await resolution.registryAddress(
        'udtestdev-check.wallet',
      );
      expectSpyToBeCalled(spies);
      expect(registryAddress).toBe(
        UnsConfig.networks[5].contracts.UNSRegistry.address,
      );
    });
    it('should return uns l2 mainnet registry address if domain exists on both', async () => {
      const spies = mockAsyncMethods(uns.unsl1, {
        registryAddress: UnsConfig.networks[5].contracts.UNSRegistry.address,
      });
      const spies2 = mockAsyncMethods(uns.unsl2, {
        registryAddress:
          UnsConfig.networks[80001].contracts.UNSRegistry.address,
      });
      const registryAddress = await resolution.registryAddress(
        WalletDomainOnBothLayers,
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(spies2);
      expect(registryAddress).toBe(
        UnsConfig.networks[80001].contracts.UNSRegistry.address,
      );
    });
  });

  describe('.records', () => {
    it('returns l2 records if domain exists on both', async () => {
      const eyes = mockAsyncMethods(uns.unsl1, {
        get: {
          owner: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
          resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
          records: {
            'crypto.ADA.address': 'blahblah-dont-care-about-these-records',
            'crypto.ETH.address': 'blahblah-dont-care-about-these-records',
          },
        },
      });
      const eyes2 = mockAsyncMethods(uns.unsl2, {
        get: {
          owner: '0x6EC0DEeD30605Bcd19342f3c30201DB263291589',
          resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
          records: {
            'crypto.ADA.address':
              'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
            'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
          },
        },
      });
      expect(
        await resolution.records(CryptoDomainWithAllRecords, [
          'crypto.ADA.address',
          'crypto.ETH.address',
        ]),
      ).toEqual({
        'crypto.ADA.address':
          'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
        'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
      });
      expectSpyToBeCalled([...eyes, ...eyes2]);
    });
    it('works', async () => {
      const eyes = mockAsyncMethods(uns, {
        get: {
          owner: '0x6EC0DEeD30605Bcd19342f3c30201DB263291589',
          resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
          records: {
            'crypto.ADA.address':
              'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
            'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
          },
        },
      });
      expect(
        await resolution.records(CryptoDomainWithAllRecords, [
          'crypto.ADA.address',
          'crypto.ETH.address',
        ]),
      ).toEqual({
        'crypto.ADA.address':
          'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
        'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
      });
      expectSpyToBeCalled([...eyes]);
    });
  });

  describe('.isRegistered', () => {
    it('should return true', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
          records: {
            ['ipfs.html.value']:
              'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          },
        },
      });
      const isRegistered = await resolution.isRegistered('brad.crypto');
      expectSpyToBeCalled(spies);
      expect(isRegistered).toBe(true);
    });

    it('should return false', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: '',
          resolver: '',
          records: {},
        },
      });
      const isRegistered = await resolution.isRegistered(
        'thisdomainisdefinitelynotregistered123.crypto',
      );
      expectSpyToBeCalled(spies);
      expect(isRegistered).toBe(false);
    });

    it('should return true for a .zil domain', async () => {
      const unsSpy = mockAsyncMethod(uns, 'isRegistered', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', [
        'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
      ]);
      const isRegistered = await resolution.isRegistered('testing.zil');
      expectSpyToBeCalled([unsSpy, znsSpy]);
      expect(isRegistered).toBe(true);
    });

    skipItInLive('should return false for a .zil domain', async () => {
      const unsSpy = mockAsyncMethod(uns, 'isRegistered', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', ['']);
      const isRegistered = await resolution.isRegistered(
        'thisdomainisdefinitelynotregistered123.zil',
      );
      expectSpyToBeCalled([unsSpy, znsSpy]);
      expect(isRegistered).toBe(false);
    });

    it('should return true if registered on l2 but not l1', async () => {
      const spies = mockAsyncMethods(uns.unsl1, {
        get: {
          owner: '',
          resolver: '',
          records: {},
          location: UnsLocation.Layer1,
        },
      });
      const spies2 = mockAsyncMethods(uns.unsl2, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
          records: {},
          location: UnsLocation.Layer2,
        },
      });
      const isRegistered = await resolution.isRegistered(
        WalletDomainLayerTwoWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(spies2);
      expect(isRegistered).toBe(true);
    });

    it('should return true if registered on l1 but not l2', async () => {
      const spies = mockAsyncMethods(uns.unsl1, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
          records: {},
        },
      });
      const spies2 = mockAsyncMethods(uns.unsl2, {
        get: {
          owner: '',
          resolver: '',
          records: {},
        },
      });
      const isRegistered = await resolution.isRegistered(
        CryptoDomainWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(spies2);
      expect(isRegistered).toBe(true);
    });
  });

  describe('.isAvailable', () => {
    it('should return false', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
          records: {
            ['ipfs.html.value']:
              'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          },
        },
      });
      const isAvailable = await resolution.isAvailable('brad.crypto');
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(false);
    });

    it('should return true', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: '',
          resolver: '',
          records: {},
        },
      });
      const isAvailable = await resolution.isAvailable(
        'qwdqwdjkqhdkqdqwjd.crypto',
      );
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(true);
    });

    it('should return false is available on l1 but not l2', async () => {
      const spies = mockAsyncMethods(uns.unsl1, {
        get: {
          owner: '',
          resolver: '',
          records: {},
        },
      });
      const spies2 = mockAsyncMethods(uns.unsl2, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
          records: {},
        },
      });
      const isAvailable = await resolution.isAvailable(
        CryptoDomainWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(spies2);
      expect(isAvailable).toBe(false);
    });

    skipItInLive('should return false for a .zil domain', async () => {
      const unsSpy = mockAsyncMethod(uns, 'isAvailable', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', [
        'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
      ]);
      const isAvailable = await resolution.isAvailable('testing.zil');
      expectSpyToBeCalled([unsSpy, znsSpy]);
      expect(isAvailable).toBe(false);
    });

    it('should return true', async () => {
      const unsSpy = mockAsyncMethod(uns, 'isAvailable', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', ['']);
      const isAvailable = await resolution.isAvailable('ryan.zil');
      expectSpyToBeCalled([unsSpy, znsSpy]);
      expect(isAvailable).toBe(true);
    });
  });

  describe('.namehash', () => {
    it('brad.crypto', () => {
      const expectedNamehash =
        '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9';
      const namehash = resolution.namehash(
        'brad.crypto',
        NamingServiceName.UNS,
      );
      expect(namehash).toEqual(expectedNamehash);
    });

    it('brad.zil (UNS)', () => {
      const expectedNamehash =
        '0x88e6867a2a7c3884e6565d03a9baf909232426adb433d908f9ae9541a66db9ac';
      const namehash = resolution.namehash('brad.zil', NamingServiceName.UNS);
      expect(namehash).toEqual(expectedNamehash);
    });

    it('brad.zil (ZNS)', () => {
      const expectedNamehash =
        '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787';
      const namehash = resolution.namehash('brad.zil', NamingServiceName.ZNS);
      expect(namehash).toEqual(expectedNamehash);
    });
  });

  describe('.childhash', () => {
    it('brad.crypto', () => {
      const expectedNamehash =
        '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9';
      const namehash = resolution.childhash(
        '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
        'brad',
        NamingServiceName.UNS,
      );
      expect(namehash).toEqual(expectedNamehash);
    });

    it('brad.zil (UNS)', () => {
      const expectedNamehash =
        '0x88e6867a2a7c3884e6565d03a9baf909232426adb433d908f9ae9541a66db9ac';
      const namehash = resolution.childhash(
        '0xd81bbfcee722494b885e891546eeac23d0eedcd44038d7a2f6ef9ec2f9e0d239',
        'brad',
        NamingServiceName.UNS,
      );
      expect(namehash).toEqual(expectedNamehash);
    });

    it('brad.zil', () => {
      const expectedNamehash =
        '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787';
      const namehash = resolution.childhash(
        '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
        'brad',
        NamingServiceName.ZNS,
      );
      expect(namehash).toEqual(expectedNamehash);
    });

    it('should throw error if service is not supported', () => {
      expect(() =>
        resolution.childhash(
          '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
          'beresnev',
          'COM' as NamingServiceName,
        ),
      ).toThrowError('Naming service COM is not supported');
    });
  });

  describe('.location', () => {
    skipItInLive(
      'should get location for uns l1, uns l2 and zns domains',
      async () => {
        // https://github.com/rust-ethereum/ethabi
        //
        // # getDataForMany return data
        // ethabi encode params -v 'address[]' '[070e83FCed225184E67c86302493ffFCDB953f71,95ae1515367aa64c462c71e87157771165b1287a,0000000000000000000000000000000000000000,0000000000000000000000000000000000000000,0000000000000000000000000000000000000000,0000000000000000000000000000000000000000,0000000000000000000000000000000000000000]' -v 'address[]' '[0e43f36e4b986dfbe1a75cacfa60ca2bd44ae962,499dd6d875787869670900a2130223d85d4f6aa7,0000000000000000000000000000000000000000,0000000000000000000000000000000000000000,0000000000000000000000000000000000000000,0000000000000000000000000000000000000000,0000000000000000000000000000000000000000]' -v 'string[][]' '[[],[],[],[],[],[],[]]'
        // # registryOf return data
        // ethabi encode params -v address 070e83FCed225184E67c86302493ffFCDB953f71
        // ethabi encode params -v address 801452cFAC27e79a11c6b185986fdE09e8637589
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // # multicall return data
        // ethabi encode params -v 'bytes[]' '[...]' # put the output of the commands above into the array
        const mockValuesL1 = {
          callEth:
            '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000056000000000000000000000000000000000000000000000000000000000000005a000000000000000000000000000000000000000000000000000000000000005e00000000000000000000000000000000000000000000000000000000000000620000000000000000000000000000000000000000000000000000000000000066000000000000000000000000000000000000000000000000000000000000006a000000000000000000000000000000000000000000000000000000000000006e000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000007000000000000000000000000070e83FCed225184E67c86302493ffFCDB953f7100000000000000000000000095ae1515367aa64c462c71e87157771165b1287a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000e43f36e4b986dfbe1a75cacfa60ca2bd44ae962000000000000000000000000499dd6d875787869670900a2130223d85d4f6aa700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000070e83FCed225184E67c86302493ffFCDB953f710000000000000000000000000000000000000000000000000000000000000020000000000000000000000000801452cFAC27e79a11c6b185986fdE09e86375890000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
        };
        // # getDataForMany return data
        // ethabi encode params -v 'address[]' '[0000000000000000000000000000000000000000,0000000000000000000000000000000000000000,2a93c52e7b6e7054870758e15a1446e769edfb93,2a93c52e7b6e7054870758e15a1446e769edfb93,0000000000000000000000000000000000000000,2a93c52e7b6e7054870758e15a1446e769edfb93,0000000000000000000000000000000000000000]' -v 'address[]' '[0000000000000000000000000000000000000000,0000000000000000000000000000000000000000,499dd6d875787869670900a2130223d85d4f6aa7,499dd6d875787869670900a2130223d85d4f6aa7,0000000000000000000000000000000000000000,499dd6d875787869670900a2130223d85d4f6aa7,0000000000000000000000000000000000000000]' -v 'string[][]' '[[],[],[],[],[],[],[]]'
        // # registryOf return data
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // ethabi encode params -v address 2a93c52e7b6e7054870758e15a1446e769edfb93
        // ethabi encode params -v address 2a93c52e7b6e7054870758e15a1446e769edfb93
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // ethabi encode params -v address 2a93c52e7b6e7054870758e15a1446e769edfb93
        // ethabi encode params -v address 0000000000000000000000000000000000000000
        // # multicall return data
        // ethabi encode params -v 'bytes[]' '[...]' # put the output of the commands above into the array
        const mockValuesL2 = {
          callEth:
            '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000056000000000000000000000000000000000000000000000000000000000000005a000000000000000000000000000000000000000000000000000000000000005e00000000000000000000000000000000000000000000000000000000000000620000000000000000000000000000000000000000000000000000000000000066000000000000000000000000000000000000000000000000000000000000006a000000000000000000000000000000000000000000000000000000000000006e000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000007000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a93c52e7b6e7054870758e15a1446e769edfb930000000000000000000000002a93c52e7b6e7054870758e15a1446e769edfb9300000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a93c52e7b6e7054870758e15a1446e769edfb930000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000499dd6d875787869670900a2130223d85d4f6aa7000000000000000000000000499dd6d875787869670900a2130223d85d4f6aa70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000499dd6d875787869670900a2130223d85d4f6aa70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000002a93c52e7b6e7054870758e15a1446e769edfb9300000000000000000000000000000000000000000000000000000000000000200000000000000000000000002a93c52e7b6e7054870758e15a1446e769edfb930000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000002a93c52e7b6e7054870758e15a1446e769edfb9300000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
        };

        mockAsyncMethods(uns.unsl1.readerContract, mockValuesL1);
        mockAsyncMethods(uns.unsl2.readerContract, mockValuesL2);
        mockAsyncMethods(uns, {isSupportedDomain: true});
        mockAsyncMethod(zns, 'getRecordsAddresses', [
          'zil1xftz4cd425mer6jxmtl29l28xr0zu8s5hnp9he',
          'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
        ]);

        const location = await resolution.locations([
          'udtestdev-check.wallet',
          'brad.crypto',
          'udtestdev-test-l2-domain-784391.wallet',
          'udtestdev-test-l1-and-l2-ownership.wallet',
          'testing-domain-doesnt-exist-12345abc.blockchain',
          'uns-devtest-testnet-domain.zil',
          'zns-devtest-testnet-domain.zil',
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
        expect(location['udtestdev-test-l1-and-l2-ownership.wallet']).toEqual({
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
        // TODO! mint a domain that will be owned by the devtools team for the LIVE tests.
        expect(location['uns-devtest-testnet-domain.zil']).toEqual({
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
        expect(location['zns-devtest-testnet-domain.zil']).toEqual({
          registryAddress: 'zil1hyj6m5w4atcn7s806s69r0uh5g4t84e8gp6nps',
          resolverAddress: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
          networkId: 333,
          blockchain: BlockchainType.ZIL,
          ownerAddress: 'zil1xftz4cd425mer6jxmtl29l28xr0zu8s5hnp9he',
          blockchainProviderUrl: 'https://dev-api.zilliqa.com',
        });
      },
    );

    it('should check all methods for domain validation', async () => {
      await expectResolutionErrorCode(
        () => resolution.twitter('hello#blockchain'),
        ResolutionErrorCode.InvalidDomainAddress,
      );
      await expectResolutionErrorCode(
        () => resolution.ipfsHash('hello#blockchain'),
        ResolutionErrorCode.InvalidDomainAddress,
      );
      await expectResolutionErrorCode(
        () => resolution.httpUrl('hello#blockchain'),
        ResolutionErrorCode.InvalidDomainAddress,
      );
      await expectResolutionErrorCode(
        () => resolution.resolver('hello#blockchain'),
        ResolutionErrorCode.InvalidDomainAddress,
      );
      await expectResolutionErrorCode(
        () => resolution.owner('hello#blockchain'),
        ResolutionErrorCode.InvalidDomainAddress,
      );
      await expectResolutionErrorCode(
        () => resolution.isRegistered('hello#blockchain'),
        ResolutionErrorCode.InvalidDomainAddress,
      );
      await expectResolutionErrorCode(
        () => resolution.isAvailable('hello#blockchain'),
        ResolutionErrorCode.InvalidDomainAddress,
      );
      await expectResolutionErrorCode(
        () => resolution.namehash('hello#blockchain', NamingServiceName.UNS),
        ResolutionErrorCode.InvalidDomainAddress,
      );
      await expectResolutionErrorCode(
        () => resolution.isSupportedDomain('hello#blockchain'),
        ResolutionErrorCode.InvalidDomainAddress,
      );
    });
  });

  describe('.Unhash token by UdApi', () => {
    it('should unhash token', async () => {
      resolution = new Resolution({
        sourceConfig: {
          zns: {api: true},
          uns: {api: true},
        },
      });
      mockAsyncMethod(Networking, 'fetch', {
        json: () => ({
          meta: {
            domain: 'brad.crypto',
            namehash:
              '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
            tokenId:
              '53115498937382692782103703677178119840631903773202805882273058578308100329417',
          },
        }),
      });
      expect(
        await resolution.unhash(
          '53115498937382692782103703677178119840631903773202805882273058578308100329417',
          NamingServiceName.UNS,
        ),
      ).toEqual('brad.crypto');
    });

    it('should throw exception for empty response', async () => {
      resolution = new Resolution({
        sourceConfig: {
          zns: {api: true},
          uns: {api: true},
        },
      });
      mockAsyncMethod(Networking, 'fetch', {
        json: () => ({
          meta: {
            domain: '',
            namehash:
              '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
            tokenId:
              '53115498937382692782103703677178119840631903773202805882273058578308100329417',
          },
        }),
      });
      await expectResolutionErrorCode(
        () =>
          resolution.unhash(
            '53115498937382692782103703677178119840631903773202805882273058578308100329417',
            NamingServiceName.UNS,
          ),
        ResolutionErrorCode.UnregisteredDomain,
      );
    });

    it('should unhash token for ZNS', async () => {
      resolution = new Resolution({
        sourceConfig: {
          zns: {api: true},
          uns: {api: true},
        },
      });
      mockAsyncMethod(Networking, 'fetch', {
        json: () => ({
          meta: {
            domain: 'brad.zil',
            namehash:
              '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787',
            tokenId:
              '43319589818590979333002700458407583892978809980702780436022141697532225718151',
            blockchain: 'ZIL',
          },
        }),
      });
      expect(
        await resolution.unhash(
          '43319589818590979333002700458407583892978809980702780436022141697532225718151',
          NamingServiceName.ZNS,
        ),
      ).toEqual('brad.zil');
    });
  });

  describe('Reverse resolution', () => {
    it('should reverse resolve', async () => {
      mockAsyncMethods(uns, {
        reverseOf:
          '53115498937382692782103703677178119840631903773202805882273058578308100329417',
        getTokenUri:
          'https://metadata.staging.unstoppabledomains.com/metadata/',
      });
      mockAsyncMethod(Networking, 'fetch', {
        ok: true,
        json: () => ({
          name: 'brad.crypto',
        }),
      });
      const reverseDomain = await resolution.reverse(
        '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
      );
      expect(reverseDomain).toBe('brad.crypto');
    });

    it('should reverse resolve for a subdomain', async () => {
      mockAsyncMethods(uns, {
        reverseOf:
          '44924347734549711771487655536240923593575753005984062220276294864587632017879',
        getTokenUri:
          'https://metadata.staging.unstoppabledomains.com/metadata/',
      });
      mockAsyncMethod(Networking, 'fetch', {
        ok: true,
        json: () => ({
          name: SubdomainLayerTwo,
        }),
      });
      const reverseDomain = await resolution.reverse(
        '0xA0a92d77D92934951F07E7CEb96a7f0ec387ebc1',
      );
      expect(reverseDomain).toBe(SubdomainLayerTwo);
    });
  });
});
