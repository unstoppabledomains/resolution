import Resolution from '../index';
import ResolutionError, {ResolutionErrorCode} from '../errors/resolutionError';
import {NullAddress} from '../types';
import {
  CryptoDomainLayerOneWithNoResolver,
  CryptoDomainWithTwitterVerification,
  mockAsyncMethods,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
  getUnsProtocolLinkFromEnv,
  expectConfigurationErrorCode,
  CryptoDomainWithoutGunDbRecords,
  CryptoDomainWithAllRecords,
  WalletDomainLayerTwoWithAllRecords,
  skipItInLive,
  mockAPICalls,
  ProviderProtocol,
  mockAsyncMethod,
  ZilDomainWithAllRecords,
  ZilDomainWithNoResolver,
} from './helpers';
import FetchProvider from '../FetchProvider';
import {NamingServiceName, UnsLocation} from '../types/publicTypes';
import Uns from '../Uns';
import Networking from '../utils/Networking';
import {ConfigurationErrorCode} from '../errors/configurationError';
import {TokenUriMetadata} from '../types/publicTypes';
import liveData from './testData/liveData.json';
import UnsConfig from '../config/uns-config.json';
import {eip137Namehash, fromHexStringToDecimals} from '../utils/namehash';
import Zns from '../Zns';

describe('UNS', () => {
  describe('constructor', () => {
    it('should define the default uns contract', () => {
      const uns = new Uns({
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
      });
      expect(uns).toBeDefined();
      expect(uns.unsl1.network).toBe('goerli');
      expect(uns.unsl1.url).toBe(
        getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
      );
      expect(uns.unsl2.network).toBe('polygon-mumbai');
      expect(uns.unsl2.url).toBe(
        getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
      );
    });

    it('should not allow missing Layer1 config', async () => {
      await expectConfigurationErrorCode(
        () =>
          new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer2: {
                    url: 'https://someurl.com',
                    network: 'polygon-mainnet',
                  },
                } as any,
              },
            },
          }),
        ConfigurationErrorCode.NetworkConfigMissing,
      );
    });

    it('should not allow missing Layer2 config', async () => {
      await expectConfigurationErrorCode(
        () =>
          new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer1: {
                    url: 'https://someurl.com',
                    network: 'mainnet',
                  },
                } as any,
              },
            },
          }),
        ConfigurationErrorCode.NetworkConfigMissing,
      );
    });

    it('should not allow missing L1 url config for custom network', async () => {
      await expectConfigurationErrorCode(
        () =>
          new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer1: {network: 'goerli'},
                  Layer2: {
                    network: 'polygon-mumbai',
                    url: 'https://someurl.com',
                  },
                },
              },
            },
          }),
        ConfigurationErrorCode.NetworkConfigMissing,
      );
    });

    it('should not allow missing L2 url config for custom network', async () => {
      await expectConfigurationErrorCode(
        () =>
          new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer1: {network: 'goerli', url: 'https://someurl.com'},
                  Layer2: {
                    network: 'polygon-mumbai',
                  },
                },
              },
            },
          }),
        ConfigurationErrorCode.NetworkConfigMissing,
      );
    });
  });

  describe('resolving data', () => {
    let resolution: Resolution;
    let uns: Uns;
    let zns: Zns;

    beforeEach(() => {
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
        },
      });
      uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
      zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('checks the record by key', async () => {
      const eyes = mockAsyncMethods(uns, {
        get: {
          resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
          records: {
            'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          },
        },
      });
      const ipfsHash = await resolution.record(
        CryptoDomainWithAllRecords,
        'ipfs.html.value',
      );
      expectSpyToBeCalled(eyes);
      expect(ipfsHash).toBe('QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu');
    });

    it('should return verified twitter handle', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          resolver: '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842',
          owner: '0x499dd6d875787869670900a2130223d85d4f6aa7',
          records: {
            ['validation.social.twitter.username']:
              '0x01882395ce631866b76f43535843451444ef4a8ff44db0a9432d5d00658a510512c7519a87c78ba9cad7553e26262ada55c254434a1a3784cd98d06fb4946cfb1b',
            ['social.twitter.username']: 'Marlene12Bob',
          },
        },
      });
      const twitterHandle = await resolution.serviceMap[
        NamingServiceName.UNS
      ].native.twitter(CryptoDomainWithTwitterVerification);
      expectSpyToBeCalled(spies);
      expect(twitterHandle).toBe('Marlene12Bob');
    });

    skipItInLive(
      'should throw error if record not found for twitter handle',
      async () => {
        mockAsyncMethods(uns, {
          get: {
            resolver: '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842',
            owner: '0x499dd6d875787869670900a2130223d85d4f6aa7',
            records: {},
            location: UnsLocation.Layer2,
          },
        });
        expect(() =>
          resolution.serviceMap[NamingServiceName.UNS].native.twitter(
            WalletDomainLayerTwoWithAllRecords,
          ),
        ).rejects.toThrow(
          new ResolutionError(ResolutionErrorCode.RecordNotFound, {
            domain: WalletDomainLayerTwoWithAllRecords,
            location: UnsLocation.Layer2,
            recordName: 'validation.social.twitter.username',
          }),
        );
      },
    );
    it('should throw error if twitter validation signature is null', async () => {
      mockAsyncMethods(uns, {
        get: {
          resolver: '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842',
          owner: '0x499dd6d875787869670900a2130223d85d4f6aa7',
          records: {'validation.social.twitter.username': NullAddress},
          location: UnsLocation.Layer2,
        },
      });
      expect(() =>
        resolution.serviceMap[NamingServiceName.UNS].native.twitter(
          WalletDomainLayerTwoWithAllRecords,
        ),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.RecordNotFound, {
          domain: WalletDomainLayerTwoWithAllRecords,
          location: UnsLocation.Layer2,
          recordName: 'validation.social.twitter.username',
        }),
      );
    });
    skipItInLive(
      'should throw error if twitter handle is undefined',
      async () => {
        mockAsyncMethods(uns, {
          get: {
            resolver: '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842',
            owner: '0x499dd6d875787869670900a2130223d85d4f6aa7',
            records: {'validation.social.twitter.username': 'random-signuture'},
            location: UnsLocation.Layer2,
          },
        });
        expect(() =>
          resolution.serviceMap[NamingServiceName.UNS].native.twitter(
            WalletDomainLayerTwoWithAllRecords,
          ),
        ).rejects.toThrow(
          new ResolutionError(ResolutionErrorCode.RecordNotFound, {
            domain: WalletDomainLayerTwoWithAllRecords,
            location: UnsLocation.Layer2,
            recordName: 'social.twitter.username',
          }),
        );
      },
    );

    it('should return NoRecord Resolution error', async () => {
      const uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
      const spies = mockAsyncMethods(uns.unsl2.readerContract, {
        call: [NullAddress, NullAddress, []],
      });
      const spies2 = mockAsyncMethods(uns.unsl1.readerContract, {
        call: [
          '0x95AE1515367aa64C462c71e87157771165B1287A',
          '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
          [],
        ],
      });
      await expectResolutionErrorCode(
        resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(spies2);
    }, 20000);

    it('should return NoRecord Resolution error for L2', async () => {
      const uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
      const spies = mockAsyncMethods(uns.unsl2.readerContract, {
        call: [NullAddress, NullAddress, []],
      });
      const spies2 = mockAsyncMethods(uns.unsl1.readerContract, {
        call: [
          '0x95AE1515367aa64C462c71e87157771165B1287A',
          '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
          [],
        ],
      });
      await expectResolutionErrorCode(
        resolution.record(WalletDomainLayerTwoWithAllRecords, 'No.such.record'),
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(spies2);
    }, 20000);

    it('should return a valid resolver address', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {resolver: '0x95AE1515367aa64C462c71e87157771165B1287A'},
      });
      const resolverAddress = await resolution.resolver(
        CryptoDomainWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0x95AE1515367aa64C462c71e87157771165B1287A',
      );
    });

    it('should return true for supported domain', async () => {
      mockAPICalls(
        'uns_domain_exists_test_true',
        getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
      );
      const uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
      mockAsyncMethods(uns.unsl2.readerContract, {
        call: [false],
      });
      expect(await uns.isSupportedDomain('brad.crypto')).toBe(true);
      expect(await uns.isSupportedDomain('brad.blockchain')).toBe(true);
      expect(await uns.isSupportedDomain('brad.888')).toBe(true);
      expect(
        await uns.isSupportedDomain(WalletDomainLayerTwoWithAllRecords),
      ).toBe(true);
    });

    it('should return false for unsupported domain', async () => {
      mockAPICalls(
        'uns_domain_exists_test',
        getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
      );
      const uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
      mockAsyncMethods(uns.unsl2.readerContract, {
        call: [false],
      });
      expect(await uns.isSupportedDomain('.crypto')).toBe(false);
      expect(await uns.isSupportedDomain('brad.invalid')).toBe(false);
    });

    it('should not find a resolver address', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: NullAddress,
          resolver: undefined,
        },
      });

      await expectResolutionErrorCode(
        resolution.resolver('unknown-unknown-938388383.crypto'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spies);
    });

    it('should throw ResolutionError.UnspecifiedResolver', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {owner: 'someowneraddress', resolver: NullAddress},
      });
      await expectResolutionErrorCode(
        resolution.resolver(CryptoDomainLayerOneWithNoResolver),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });

    describe('.Crypto', () => {
      it(`checks the BCH address on ${CryptoDomainWithAllRecords}`, async () => {
        const eyes = mockAsyncMethods(uns, {
          get: {
            resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
            records: {
              ['crypto.BCH.address']:
                'qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8',
            },
          },
        });
        const addr = await resolution.addr(CryptoDomainWithAllRecords, 'BCH');
        expectSpyToBeCalled(eyes);
        expect(addr).toBe('qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8');
      });
      it(`checks the ADA address on ${CryptoDomainWithAllRecords}`, async () => {
        const eyes = mockAsyncMethods(uns, {
          get: {
            resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
            records: {
              ['crypto.ADA.address']:
                'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
            },
          },
        });
        const addr = await resolution.addr(CryptoDomainWithAllRecords, 'ADA');
        expectSpyToBeCalled(eyes);
        expect(addr).toBe(
          'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
        );
      });

      it(`checks the LINK address on ${WalletDomainLayerTwoWithAllRecords} L2`, async () => {
        mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const eyesL2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0xd1D5eb96f36A7605b0cED801fF497E81F6245106',
            ['0x6A1fd9a073256f14659fe59613bbf169Ed27CdcC'],
          ],
        });
        const addr = await resolution.addr(
          WalletDomainLayerTwoWithAllRecords,
          'LINK',
        );
        expectSpyToBeCalled(eyesL2);
        expect(addr).toBe('0x6A1fd9a073256f14659fe59613bbf169Ed27CdcC');
      });
      it(`checks the LINK address on ${WalletDomainLayerTwoWithAllRecords} L2 even if L1 exists`, async () => {
        const eyesL1 = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [
            'ignore-field',
            'ignore-this',
            ['0xd1D5eb96f36A7605b0cED801fF497E81F6245106'],
          ],
        });
        const eyesL2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0xd1D5eb96f36A7605b0cED801fF497E81F6245106',
            ['0x6A1fd9a073256f14659fe59613bbf169Ed27CdcC'],
          ],
        });
        const addr = await resolution.addr(
          WalletDomainLayerTwoWithAllRecords,
          'LINK',
        );
        expectSpyToBeCalled(eyesL1);
        expectSpyToBeCalled(eyesL2);
        expect(addr).toBe('0x6A1fd9a073256f14659fe59613bbf169Ed27CdcC');
      });

      skipItInLive(
        `reads an address on ${ZilDomainWithAllRecords}`,
        async () => {
          const unsSpy = mockAsyncMethod(uns, 'get', {
            resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
            records: {
              ['crypto.BCH.address']:
                'qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8',
            },
          });
          const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', undefined);
          const addr = await resolution.addr(ZilDomainWithAllRecords, 'BCH');
          expectSpyToBeCalled([unsSpy, znsSpy]);
          expect(addr).toBe('qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8');
        },
      );

      describe('.Metadata', () => {
        it('should resolve with ipfs stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['ipfs.html.value']:
                  'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
              },
            },
          });
          const ipfsHash = await resolution.ipfsHash(
            CryptoDomainWithAllRecords,
          );
          expectSpyToBeCalled(spies);
          expect(ipfsHash).toBe(
            'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          );
        });

        skipItInLive(
          `should resolve with ipfs stored on uns for a .zil domain`,
          async () => {
            const unsSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['ipfs.html.value']:
                  'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
              },
            });
            const znsSpy = mockAsyncMethod(
              zns,
              'getRecordsAddresses',
              undefined,
            );
            const ipfsHash = await resolution.ipfsHash(ZilDomainWithAllRecords);
            expectSpyToBeCalled([unsSpy, znsSpy]);
            expect(ipfsHash).toBe(
              'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
            );
          },
        );

        it('should resolve with email stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['whois.email.value']: 'johnny@unstoppabledomains.com',
              },
            },
          });
          const email = await resolution.email(CryptoDomainWithAllRecords);
          expectSpyToBeCalled(spies);
          expect(email).toBe('johnny@unstoppabledomains.com');
        });

        skipItInLive(
          `should resolve with ipfs stored on uns for a .zil domain`,
          async () => {
            const unsSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['whois.email.value']: 'johnny@unstoppabledomains.com',
              },
            });
            const znsSpy = mockAsyncMethod(
              zns,
              'getRecordsAddresses',
              undefined,
            );
            const email = await resolution.email(ZilDomainWithAllRecords);
            expectSpyToBeCalled([unsSpy, znsSpy]);
            expect(email).toBe('johnny@unstoppabledomains.com');
          },
        );

        it('should resolve with httpUrl stored on uns', async () => {
          const eyes = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['ipfs.redirect_domain.value']: 'google.com',
              },
            },
          });
          const httpUrl = await resolution.httpUrl(CryptoDomainWithAllRecords);
          expectSpyToBeCalled(eyes);
          expect(httpUrl).toBe('google.com');
        });

        skipItInLive(
          `should resolve with ipfs stored on uns for a .zil domain`,
          async () => {
            const unsSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['ipfs.redirect_domain.value']: 'google.com',
              },
            });
            const znsSpy = mockAsyncMethod(
              zns,
              'getRecordsAddresses',
              undefined,
            );
            const httpUrl = await resolution.httpUrl(ZilDomainWithAllRecords);
            expectSpyToBeCalled([unsSpy, znsSpy]);
            expect(httpUrl).toBe('google.com');
          },
        );

        it('should resolve with the gundb chatId stored on uns', async () => {
          const eyes = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['gundb.username.value']:
                  '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
              },
            },
          });
          const chatId = await resolution.chatId('brad.crypto');
          expectSpyToBeCalled(eyes);
          expect(chatId).toBe(
            '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
          );
        });

        it('should throw UnspecifiedResolver for chatId', async () => {
          mockAsyncMethods(uns, {
            get: {
              owner: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
            },
          });
          await expectResolutionErrorCode(
            resolution.chatId(CryptoDomainLayerOneWithNoResolver),
            ResolutionErrorCode.UnspecifiedResolver,
          );
        });

        it('should resolve with the gundb public key stored on uns', async () => {
          const eyes = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['gundb.public_key.value']:
                  'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
              },
            },
          });
          const publicKey = await resolution.chatPk('brad.crypto');
          expectSpyToBeCalled(eyes);
          expect(publicKey).toBe(
            'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
          );
        });

        it('should error out for gundb public key stored on uns', async () => {
          const eyes = mockAsyncMethods(uns, {
            get: {
              resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
              records: {},
            },
          });
          await expectResolutionErrorCode(
            resolution.chatPk(CryptoDomainWithoutGunDbRecords),
            ResolutionErrorCode.RecordNotFound,
          );
          expectSpyToBeCalled(eyes);
        });

        it('should error out for gundb chatId stored on uns', async () => {
          const eyes = mockAsyncMethods(uns, {
            get: {
              resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
              records: {},
            },
          });
          await expectResolutionErrorCode(
            resolution.chatId(CryptoDomainWithoutGunDbRecords),
            ResolutionErrorCode.RecordNotFound,
          );
          expectSpyToBeCalled(eyes);
        });
      });
    });

    describe('.Crypto ProxyReader', () => {
      it('should return record by key', async () => {
        const eyes = mockAsyncMethods(uns, {
          get: {
            resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
            records: {
              ['ipfs.html.value']:
                'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
            },
          },
        });
        const ipfsHash = await resolution.record(
          CryptoDomainWithAllRecords,
          'ipfs.html.value',
        );
        expectSpyToBeCalled(eyes);
        expect(ipfsHash).toBe('QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu');
      });

      skipItInLive(
        'should return record by key for a .zil domain',
        async () => {
          const unsSpy = mockAsyncMethod(uns, 'get', {
            resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
            records: {
              ['ipfs.html.value']:
                'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
            },
          });
          const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', undefined);
          const ipfsHash = await resolution.record(
            ZilDomainWithAllRecords,
            'ipfs.html.value',
          );
          expectSpyToBeCalled([unsSpy, znsSpy]);
          expect(ipfsHash).toBe(
            'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          );
        },
      );

      it('should return NoRecord Resolution error when value not found', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
            [],
          ],
        });

        await expectResolutionErrorCode(
          resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
          ResolutionErrorCode.RecordNotFound,
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
      });

      it('should return a valid resolver address', async () => {
        const spies = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const spies2 = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
            [],
          ],
        });

        const resolverAddress = await resolution.resolver(
          CryptoDomainWithAllRecords,
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(resolverAddress).toBe(
          '0x95AE1515367aa64C462c71e87157771165B1287A',
        );
      });

      it('should return a valid resolver address from L2', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
            '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
            [],
          ],
        });

        const resolverAddress = await resolution.resolver(
          WalletDomainLayerTwoWithAllRecords,
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(resolverAddress).toBe(
          '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
        );
      });

      skipItInLive(
        'should return a valid resolver address for an L2 .zil domain',
        async () => {
          const unsSpy = mockAsyncMethod(
            uns,
            'resolver',
            '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
          );
          const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', undefined);
          const resolverAddress = await resolution.resolver(
            ZilDomainWithAllRecords,
          );
          expect(resolverAddress).toBe(
            '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
          );
          expectSpyToBeCalled([unsSpy, znsSpy]);
        },
      );

      it('should return a valid resolver address from L2 and ignore L1', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [
            '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            [],
          ],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
            '0x8aad44321a86b170879d7a244c1e8d360c99dda8',
            [],
          ],
        });

        const resolverAddress = await resolution.resolver(
          WalletDomainLayerTwoWithAllRecords,
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(resolverAddress).toBe(
          '0x2a93C52E7B6E7054870758e15A1446E769EdfB93',
        );
      });

      it('should return UnregisteredDomain error when owner address not found', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        await expectResolutionErrorCode(
          resolution.resolver('unknown-unknown-938388383.crypto'),
          ResolutionErrorCode.UnregisteredDomain,
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
      });

      it('should return UnregisteredDomain error when owner address not found on L2', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: ['0x95AE1515367aa64C462c71e87157771165B1287A', NullAddress, []],
        });
        await expectResolutionErrorCode(
          resolution.resolver('unknown-unknown-938388383w.crypto'),
          ResolutionErrorCode.UnregisteredDomain,
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
      });

      it('should return UnspecifiedResolver error when resolver address not found', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, '0x000000000000000000000000000000000000dead', []],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [NullAddress, '0x000000000000000000000000000000000000dead', []],
        });
        await expectResolutionErrorCode(
          resolution.resolver(CryptoDomainLayerOneWithNoResolver),
          ResolutionErrorCode.UnspecifiedResolver,
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
      });

      skipItInLive('should resolve an l1 address', async () => {
        const uns = resolution.serviceMap['UNS'].native as Uns;

        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0x000000000000000000000000000000000000dead',
            ['0xe7474D07fD2FA286e7e0aa23cd107F8379085037'],
          ],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const address = await resolution.addr(
          CryptoDomainWithAllRecords,
          'eth',
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(address).toBe('0xe7474D07fD2FA286e7e0aa23cd107F8379085037');
      });

      skipItInLive('should resolve an L2 address', async () => {
        const uns = resolution.serviceMap['UNS'].native as Uns;

        const spies = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0x000000000000000000000000000000000000dead',
            ['0xe7474D07fD2FA286e7e0aa23cd107F8379085037'],
          ],
        });
        const spies2 = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const address = await resolution.addr(
          WalletDomainLayerTwoWithAllRecords,
          'eth',
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(address).toBe('0xe7474D07fD2FA286e7e0aa23cd107F8379085037');
      });

      describe('.Metadata', () => {
        it('should resolve with ipfs stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['ipfs.html.value']:
                  'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
              },
            },
          });
          const ipfsHash = await resolution.ipfsHash(
            CryptoDomainWithAllRecords,
          );
          expectSpyToBeCalled(spies);
          expect(ipfsHash).toBe(
            'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          );
        });

        it('should resolve with ipfs stored on l2', async () => {
          const spies = mockAsyncMethods(uns.unsl2.readerContract, {
            call: [
              '0x95AE1515367aa64C462c71e87157771165B1287A',
              '0x000000000000000000000000000000000000dead',
              ['QmfRXG3CcM1eWiCUA89uzimCvQUnw4HzTKLo6hRZ47PYsN'],
            ],
          });
          const spies2 = mockAsyncMethods(uns.unsl1.readerContract, {
            call: [NullAddress, NullAddress, []],
          });
          const ipfsHash = await resolution.ipfsHash(
            WalletDomainLayerTwoWithAllRecords,
          );
          expectSpyToBeCalled(spies);
          expectSpyToBeCalled(spies2);
          expect(ipfsHash).toBe(
            'QmfRXG3CcM1eWiCUA89uzimCvQUnw4HzTKLo6hRZ47PYsN',
          );
        });

        it('should resolve with email stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {['whois.email.value']: 'johnny@unstoppabledomains.com'},
            },
          });
          const email = await resolution.email(CryptoDomainWithAllRecords);
          expectSpyToBeCalled(spies);
          expect(email).toBe('johnny@unstoppabledomains.com');
        });

        it('should resolve with httpUrl stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['ipfs.redirect_domain.value']: 'google.com',
              },
            },
          });
          const httpUrl = await resolution.httpUrl(CryptoDomainWithAllRecords);
          expectSpyToBeCalled(spies);
          expect(httpUrl).toBe('google.com');
        });

        it('should resolve with the gundb chatId stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['gundb.username.value']:
                  '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
              },
            },
          });
          const chatId = await resolution.chatId('brad.crypto');
          expectSpyToBeCalled(spies);
          expect(chatId).toBe(
            '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
          );
        });

        it('should throw UnspecifiedResolver for chatId', async () => {
          mockAsyncMethods(uns, {
            get: {
              owner: '0x000000000000000000000000000000000000dead',
              records: {},
              resolver: NullAddress,
            },
          });
          await expectResolutionErrorCode(
            resolution.chatId(CryptoDomainLayerOneWithNoResolver),
            ResolutionErrorCode.UnspecifiedResolver,
          );
        });

        it('should resolve with the gundb public key stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {
                ['gundb.public_key.value']:
                  'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
              },
            },
          });
          const publicKey = await resolution.chatPk('brad.crypto');
          expectSpyToBeCalled(spies);
          expect(publicKey).toBe(
            'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
          );
        });

        it('should error out for gundb public key stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {},
            },
          });
          await expectResolutionErrorCode(
            resolution.chatPk(CryptoDomainWithoutGunDbRecords),
            ResolutionErrorCode.RecordNotFound,
          );
          expectSpyToBeCalled(spies);
        });

        it('should error out for gundb chatId stored on uns', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              records: {},
            },
          });
          await expectResolutionErrorCode(
            resolution.chatId(CryptoDomainWithoutGunDbRecords),
            ResolutionErrorCode.RecordNotFound,
          );
          expectSpyToBeCalled(spies);
        });
      });
    });

    describe('.Hashing', () => {
      describe('.Namehash', () => {
        it('supports root node', async () => {
          expect(resolution.namehash('crypto', NamingServiceName.UNS)).toEqual(
            '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
          );
        });

        it('starts with -', async () => {
          expect(
            resolution.namehash('-hello.crypto', NamingServiceName.UNS),
          ).toBe(
            '0xc4ad028bcae9b201104e15f872d3e85b182939b06829f75a128275177f2ff9b2',
          );
        });

        it('ends with -', async () => {
          expect(
            resolution.namehash('hello-.crypto', NamingServiceName.UNS),
          ).toBe(
            '0x82eaa6ef14e438940bfd7747e0e4c4fec42af20cee28ddd0a7d79f52b1c59b72',
          );
        });

        it('starts and ends with -', async () => {
          expect(
            resolution.namehash('-hello-.crypto', NamingServiceName.UNS),
          ).toBe(
            '0x90cc1963ff09ce95ee2dbb3830df4f2115da9756e087a50283b3e65f6ffe2a4e',
          );
        });

        it('should throw UnregisteredDomain', async () => {
          const eyes = mockAsyncMethods(uns, {
            get: {owner: NullAddress},
          });

          await expectResolutionErrorCode(
            resolution.record('unregistered.crypto', 'crypto.ETH.address'),
            ResolutionErrorCode.UnregisteredDomain,
          );
          expectSpyToBeCalled(eyes);
        });
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
        const unsl1 = uns.unsl1;
        const unsl2 = uns.unsl2;
        mockAsyncMethods(unsl1, {
          get: {
            owner: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            records: records,
            location: UnsLocation.Layer1,
          },
        });
        mockAsyncMethods(unsl2, {
          get: {
            owner: NullAddress,
            resolver: NullAddress,
            records: {},
            location: UnsLocation.Layer2,
          },
        });
        mockAsyncMethod(Networking, 'fetch', {
          ok: true,
          json: () => ({
            name: CryptoDomainWithAllRecords,
            properties: {records},
          }),
        });
        const endpoint = 'https://api.unstoppabledomains.com/metadata/';

        mockAsyncMethod(uns, 'getTokenUri', endpoint);
        const result = await uns.allRecords(CryptoDomainWithAllRecords);
        expect(result).toMatchObject(records);
      });
      it('should return all records on L1 with non standard records', async () => {
        const records = {
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
        const unsl1 = uns.unsl1;
        const unsl2 = uns.unsl2;
        mockAsyncMethods(unsl1, {
          get: {
            owner: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            records: records,
            location: UnsLocation.Layer1,
          },
        });
        mockAsyncMethods(unsl2, {
          get: {
            owner: NullAddress,
            resolver: NullAddress,
            records: {},
            location: UnsLocation.Layer2,
          },
        });
        mockAsyncMethod(Networking, 'fetch', {
          ok: true,
          json: () => ({
            name: CryptoDomainWithAllRecords,
            properties: {records},
          }),
        });
        const endpoint = 'https://api.unstoppabledomains.com/metadata/';

        mockAsyncMethod(uns, 'getTokenUri', endpoint);
        const result = await uns.allRecords(CryptoDomainWithAllRecords);
        expect(result).toMatchObject(records);
      });
    });

    describe('.registryAddress', () => {
      it('should return cns registry address', async () => {
        const unsl2 = uns.unsl2;
        mockAsyncMethod(unsl2.readerContract, 'call', (params) =>
          Promise.resolve([NullAddress]),
        );
        mockAPICalls(
          'uns_registry_address_tests',
          getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
        );
        const registryAddress = await uns.registryAddress(
          'udtestdev-265f8f.crypto',
        );
        expect(registryAddress).toBe(
          UnsConfig.networks[5].contracts.CNSRegistry.address,
        );
      });

      //todo Replace the domain with existed test domain ending on .888
      skipItInLive('should return uns registry address', async () => {
        const unsl2 = uns.unsl2;
        mockAsyncMethod(unsl2.readerContract, 'call', (params) =>
          Promise.resolve([NullAddress]),
        );
        mockAPICalls(
          'uns_registry_address_tests',
          getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
        );
        const registryAddress = await uns.registryAddress('some-domain.888');
        expect(registryAddress).toBe(
          UnsConfig.networks[5].contracts.UNSRegistry.address,
        );
      });

      it('should return uns l2 registry address', async () => {
        mockAsyncMethod(uns.unsl1.readerContract, 'call', (params) =>
          Promise.resolve(),
        );
        mockAsyncMethod(uns.unsl2.readerContract, 'call', (params) =>
          Promise.resolve([
            UnsConfig.networks[80001].contracts.UNSRegistry.address,
          ]),
        );
        const registryAddress = await uns.registryAddress(
          WalletDomainLayerTwoWithAllRecords,
        );
        expect(registryAddress).toBe(
          UnsConfig.networks[80001].contracts.UNSRegistry.address,
        );
      });

      skipItInLive(
        'should return uns l2 registry address for a .zil domain',
        async () => {
          const l1Spy = mockAsyncMethod(
            uns.unsl1.readerContract,
            'call',
            undefined,
          );
          const l2Spy = mockAsyncMethod(uns.unsl2.readerContract, 'call', [
            UnsConfig.networks[80001].contracts.UNSRegistry.address,
          ]);
          const registryAddress = await resolution.registryAddress(
            WalletDomainLayerTwoWithAllRecords,
          );
          expect(registryAddress).toBe(
            UnsConfig.networks[80001].contracts.UNSRegistry.address,
          );
          expectSpyToBeCalled([l1Spy, l2Spy]);
        },
      );

      it('should throw error if tld is not supported', async () => {
        mockAPICalls(
          'uns_registry_address_tests',
          getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
        );
        const unsl2 = uns.unsl2;
        mockAsyncMethod(unsl2.readerContract, 'call', (params) =>
          Promise.resolve([NullAddress]),
        );
        await expectResolutionErrorCode(
          () => uns.registryAddress('.crypto'),
          ResolutionErrorCode.UnsupportedDomain,
        );
      });

      it('should throw error if tld does not exist', async () => {
        const unsl2 = uns.unsl2;
        mockAsyncMethod(unsl2.readerContract, 'call', (params) =>
          Promise.resolve([NullAddress]),
        );
        mockAPICalls(
          'uns_registry_address_tests',
          getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
        );
        await expectResolutionErrorCode(
          () => uns.registryAddress('some-domain.unknown'),
          ResolutionErrorCode.UnregisteredDomain,
        );
      });
    });

    describe('.isRegistered', () => {
      it('should return true', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
            ['QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu'],
          ],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const isRegistered = await uns.isRegistered('brad.crypto');
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(isRegistered).toBe(true);
      });
      it('should return true if registered on L2', async () => {
        const spies = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
            ['QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu'],
          ],
        });
        const spies2 = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const isRegistered = await uns.isRegistered(
          WalletDomainLayerTwoWithAllRecords,
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(isRegistered).toBe(true);
      });
      skipItInLive('should return true for a .zil domain', async () => {
        const l1Spy = mockAsyncMethod(uns.unsl1.readerContract, 'call', [
          '0x95AE1515367aa64C462c71e87157771165B1287A',
          '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          ['QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu'],
        ]);
        const l2Spy = mockAsyncMethod(uns.unsl2.readerContract, 'call', [
          NullAddress,
          NullAddress,
          [],
        ]);
        const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', undefined);
        const isRegistered = await resolution.isRegistered(
          ZilDomainWithAllRecords,
        );
        expectSpyToBeCalled([l1Spy, l2Spy, znsSpy]);
        expect(isRegistered).toBe(true);
      });
      it('should return false', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const isRegistered = await uns.isRegistered(
          'thisdomainisdefinitelynotregistered123.crypto',
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(isRegistered).toBe(false);
      });
      skipItInLive('should return false for a .zil domain', async () => {
        const l1Spy = mockAsyncMethod(uns.unsl1.readerContract, 'call', [
          NullAddress,
          NullAddress,
          [],
        ]);
        const l2Spy = mockAsyncMethod(uns.unsl2.readerContract, 'call', [
          NullAddress,
          NullAddress,
          [],
        ]);
        const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', undefined);
        const isRegistered = await resolution.isRegistered(
          'thisdomainisdefinitelynotregistered123.zil',
        );
        expectSpyToBeCalled([l1Spy, l2Spy, znsSpy]);
        expect(isRegistered).toBe(false);
      });
    });

    describe('#owner', () => {
      it('should not throw when resolver is null', async () => {
        const spies = mockAsyncMethods(uns, {
          get: {
            owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
            resolver: null,
            records: {},
          },
        });
        const owner = await uns.owner(CryptoDomainLayerOneWithNoResolver);
        expectSpyToBeCalled(spies);
        expect(owner).toBe('0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2');
      });

      skipItInLive(
        'should not throw when resolver is null for a .zil domain',
        async () => {
          const unsSpy = mockAsyncMethod(uns, 'get', {
            owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
            resolver: null,
            records: {},
          });
          const owner = await resolution.owner(ZilDomainWithNoResolver);
          expectSpyToBeCalled([unsSpy]);
          expect(owner).toBe('0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2');
        },
      );
    });

    describe('.isAvailable', () => {
      it('should return false', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
            [],
          ],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const isAvailable = await uns.isAvailable('brad.crypto');
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(isAvailable).toBe(false);
      });
      it('should return false if exists on L2', async () => {
        const spies = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            '0x95AE1515367aa64C462c71e87157771165B1287A',
            '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
            [],
          ],
        });
        const spies2 = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const isAvailable = await uns.isAvailable('brad.crypto');
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(isAvailable).toBe(false);
      });
      skipItInLive('should return true for a .zil domain', async () => {
        const l1Spy = mockAsyncMethod(uns.unsl1.readerContract, 'call', [
          '0x95AE1515367aa64C462c71e87157771165B1287A',
          '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          ['QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu'],
        ]);
        const l2Spy = mockAsyncMethod(uns.unsl2.readerContract, 'call', [
          NullAddress,
          NullAddress,
          [],
        ]);
        const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', undefined);
        const isAvailable = await resolution.isAvailable(
          ZilDomainWithAllRecords,
        );
        expectSpyToBeCalled([l1Spy, l2Spy, znsSpy]);
        expect(isAvailable).toBe(false);
      });
      it('should return true', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [NullAddress, NullAddress, []],
        });
        const isAvailable = await uns.isAvailable(
          'thisdomainisdefinitelynotregistered123.crypto',
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(isAvailable).toBe(true);
      });
      skipItInLive('should return true for a .zil domain', async () => {
        const l1Spy = mockAsyncMethod(uns.unsl1.readerContract, 'call', [
          NullAddress,
          NullAddress,
          [],
        ]);
        const l2Spy = mockAsyncMethod(uns.unsl2.readerContract, 'call', [
          NullAddress,
          NullAddress,
          [],
        ]);
        const znsSpy = mockAsyncMethod(zns, 'getRecordsAddresses', undefined);
        const isAvailable = await resolution.isAvailable(
          ZilDomainWithAllRecords,
        );
        expectSpyToBeCalled([l1Spy, l2Spy, znsSpy]);
        expect(isAvailable).toBe(true);
      });
    });

    describe('#namehash', () => {
      it('supports options', async () => {
        expect(
          resolution.namehash('operadingo4.crypto', NamingServiceName.UNS),
        ).toEqual(
          '0x70f542f09763d3ab404a6d87f6a2fad7d49f01b09c44064b4227d165ead5cf25',
        );

        expect(
          resolution.namehash('operadingo4.crypto', NamingServiceName.UNS, {
            prefix: false,
          }),
        ).toEqual(
          '70f542f09763d3ab404a6d87f6a2fad7d49f01b09c44064b4227d165ead5cf25',
        );

        expect(
          resolution.namehash('operadingo4.crypto', NamingServiceName.UNS, {
            format: 'dec',
          }),
        ).toEqual(
          '51092378573785850370557709888128643877973998831507731627523713553233928900389',
        );
      });
    });

    describe('Providers', () => {
      skipItInLive(
        'should throw error when FetchProvider throws Error',
        async () => {
          const url = getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1');
          const provider = new FetchProvider(NamingServiceName.UNS, url);
          const polygonProvider = new FetchProvider(
            NamingServiceName.UNS,
            getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
          );
          resolution = new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer1: {url, provider, network: 'goerli'},
                  Layer2: {
                    network: 'polygon-mumbai',
                    provider: polygonProvider,
                  },
                },
              },
            },
          });
          const uns = resolution.serviceMap['UNS'].native as Uns;
          mockAsyncMethods(uns.unsl1.readerContract, {
            call: () => Promise.reject(new Error('error_up')),
          });
          mockAsyncMethods(uns.unsl2.readerContract, {
            call: () => Promise.reject(new Error('error_up')),
          });

          await expect(
            resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
          ).rejects.toThrow(new Error('error_up'));
        },
      );
    });

    describe('.tokenURI', () => {
      it('should return token URI', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [
            'https://metadata.staging.unstoppabledomains.com/metadata/brad.crypto',
          ],
        });
        mockAsyncMethod(uns.unsl2.readerContract, 'call', ['']);

        const uri = await resolution.tokenURI('brad.crypto');

        expectSpyToBeCalled(spies);
        expect(uri).toEqual(
          'https://metadata.staging.unstoppabledomains.com/metadata/brad.crypto',
        );
      });

      it('should return token URI from L2', async () => {
        const namehash = eip137Namehash(WalletDomainLayerTwoWithAllRecords);
        const tokenId = fromHexStringToDecimals(namehash);
        const spies = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [
            `https://metadata.staging.unstoppabledomains.com/metadata/${tokenId}`,
          ],
        });
        mockAsyncMethods(uns.unsl1.readerContract, {
          call: [],
        });

        const uri = await resolution.tokenURI(
          WalletDomainLayerTwoWithAllRecords,
        );

        expectSpyToBeCalled(spies);
        expect(uri).toEqual(
          `https://metadata.staging.unstoppabledomains.com/metadata/${tokenId}`,
        );
      });

      skipItInLive('should return token URI for a .zil domain', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [
            'https://metadata.staging.unstoppabledomains.com/metadata/brad.zil',
          ],
        });
        mockAsyncMethod(uns.unsl2.readerContract, 'call', ['']);

        const uri = await resolution.tokenURI('brad.zil');

        expectSpyToBeCalled(spies);
        expect(uri).toEqual(
          'https://metadata.staging.unstoppabledomains.com/metadata/brad.zil',
        );
      });

      it('should throw error', async () => {
        const domain = 'fakedomainthatdoesnotexist.crypto';
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [''],
        });
        const polygonSpies = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [''],
        });

        await expect(resolution.tokenURI(domain)).rejects.toThrow(
          new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
            domain,
          }),
        );
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(polygonSpies);
      });

      describe('.tokenURIMetadata', () => {
        it('should return token metadata', async () => {
          const testMeta: TokenUriMetadata = liveData.cryptoDomainMetadata;

          const unsSpies = mockAsyncMethods(uns.unsl1.readerContract, {
            call: [
              `https://metadata.unstoppabledomains.com/metadata/${CryptoDomainWithAllRecords}`,
            ],
          });
          mockAsyncMethods(uns.unsl2.readerContract, {
            call: [],
          });
          const fetchSpies = mockAsyncMethods(Networking, {
            fetch: {
              ok: true,
              json: () => testMeta,
            },
          });

          const metadata = await resolution.tokenURIMetadata(
            CryptoDomainWithAllRecords,
          );

          expectSpyToBeCalled(unsSpies);
          expectSpyToBeCalled(fetchSpies);
          expect(metadata).toEqual(testMeta);
        });
      });

      describe('.unhash', () => {
        it('should unhash token', async () => {
          const testMeta: TokenUriMetadata = liveData.cryptoDomainMetadata;
          mockAsyncMethod(Networking, 'fetch', {
            ok: true,
            json: () => ({
              name: testMeta.name,
            }),
          });
          const endpoint = 'https://api.unstoppabledomains.com/metadata/';

          mockAsyncMethod(uns, 'getTokenUri', endpoint);
          const domain = await resolution.unhash(
            '0x644d751c0e0112006e6d5d5d9234c9d3fae5a4646ff88a754d7fa1ed09794e94',
            NamingServiceName.UNS,
          );
          expect(domain).toEqual(testMeta.name);
        });
        skipItInLive('should unhash token for a .zil domain', async () => {
          const testMeta: TokenUriMetadata = liveData.zilDomainMetadata;
          mockAsyncMethod(Networking, 'fetch', {
            ok: true,
            json: () => ({
              name: testMeta.name,
            }),
          });
          const endpoint = 'https://api.unstoppabledomains.com/metadata/';

          mockAsyncMethod(uns, 'getTokenUri', endpoint);
          const domain = await resolution.unhash(
            '0xc9d9581adb94ee14d39f28b3a210d398d941c7914f978ab19dd974681ae0cba5',
            NamingServiceName.UNS,
          );
          expect(domain).toEqual(testMeta.name);
        });
        skipItInLive(
          'should throw error if metadata endpoint is undefined',
          async () => {
            mockAsyncMethod(uns, 'getTokenUri', '');
            await expect(
              resolution.unhash('0xdeaddeaddead', NamingServiceName.UNS),
            ).rejects.toThrow(
              new ResolutionError(ResolutionErrorCode.MetadataEndpointError, {
                tokenUri: 'undefined',
                errorMessage: 'Only absolute URLs are supported',
              }),
            );
          },
        );
        it('should throw if unable to unhash token', async () => {
          const tokenId =
            '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc8';
          const tokenUri =
            'https://metadata.staging.unstoppabledomains.com/metadata/';
          mockAsyncMethod(uns, 'getTokenUri', tokenUri);
          mockAsyncMethod(Networking, 'fetch', {
            ok: true,
            json: () => ({
              name: null,
            }),
          });
          expect(
            resolution.unhash(tokenId, NamingServiceName.UNS),
          ).rejects.toThrow(
            new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
              domain: `with tokenId ${tokenId}`,
            }),
          );
        });
        it('should throw if unable to query metadata endpoint token', async () => {
          const tokenId =
            '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc8';
          const tokenUri =
            'https://metadata.staging.unstoppabledomains.com/metadata/';

          const spy = jest.spyOn(uns, 'getTokenUri');
          spy.mockImplementation(() => Promise.resolve(tokenUri));

          mockAsyncMethod(Networking, 'fetch', {
            ok: false,
            json: () => null,
          });
          expect(
            resolution.unhash(tokenId, NamingServiceName.UNS),
          ).rejects.toThrow(
            new ResolutionError(ResolutionErrorCode.MetadataEndpointError, {
              tokenUri,
            }),
          );
          expectSpyToBeCalled([spy]);
        });
        it('should throw error if domain is not found', async () => {
          const unregisteredhash = resolution.namehash(
            'test34230131207328144694.crypto',
            NamingServiceName.UNS,
          );
          mockAsyncMethod(uns.unsl2, 'getTokenUri', '');
          mockAsyncMethod(uns.unsl1, 'getTokenUri', '');
          await expect(
            resolution.unhash(unregisteredhash, NamingServiceName.UNS),
          ).rejects.toThrow(
            new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
              domain: `with tokenId ${unregisteredhash}`,
            }),
          );
        });

        skipItInLive(
          'should throw error if returned domain is wrong',
          async () => {
            mockAsyncMethod(Networking, 'fetch', {
              ok: true,
              json: () => ({
                name: 'invalid-domain.crypto',
              }),
            });
            const endpoint = 'https://api.unstoppabledomains.com/metadata/';

            mockAsyncMethod(uns, 'getTokenUri', endpoint);
            await expect(
              resolution.unhash('0xdeaddeaddead', NamingServiceName.UNS),
            ).rejects.toThrow(
              new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
                providerMessage:
                  'Service provider returned an invalid domain name',
              }),
            );
          },
        );
        skipItInLive(
          'should throw an error if hash returned from the network is not equal to the hash provided',
          async () => {
            const someHash = resolution.namehash(
              'test34230131207328144693.crypto',
              NamingServiceName.UNS,
            );
            mockAsyncMethod(Networking, 'fetch', {
              json: () => ({
                name: 'invalid-domain.crypto',
                ok: true,
              }),
            });
            await expectResolutionErrorCode(
              () => resolution.unhash(someHash, NamingServiceName.UNS),
              ResolutionErrorCode.ServiceProviderError,
            );
          },
        );
      });
    });

    describe('.getAddress', () => {
      it('should return null', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [''],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [''],
        });
        const address = await uns.getAddress('brad.crypto', 'ETH', 'ETH');
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(address).toBe(null);
      });

      it('should return an address from L1', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: ['0x8aaD44321A86b170879d7A244c1e8d360c99DdA8'],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: [''],
        });
        const address = await uns.getAddress('brad.crypto', 'ETH', 'ETH');
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(address).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
      });

      it('should return an address from L2', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [''],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: ['0x8aaD44321A86b170879d7A244c1e8d360c99DdA8'],
        });
        const address = await uns.getAddress('brad.crypto', 'ETH', 'ETH');
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(address).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
      });

      it('should not throw error', async () => {
        const spies = mockAsyncMethods(uns.unsl1.readerContract, {
          call: [''],
        });
        const spies2 = mockAsyncMethods(uns.unsl2.readerContract, {
          call: ['0x8aaD44321A86b170879d7A244c1e8d360c99DdA8'],
        });
        const address = await uns.getAddress('brad.crypto', 'ETH', 'ETH');
        expectSpyToBeCalled(spies);
        expectSpyToBeCalled(spies2);
        expect(address).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
      });
    });
  });
});
