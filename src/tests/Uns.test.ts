import Resolution from '../index';
import ResolutionError, {ResolutionErrorCode} from '../errors/resolutionError';
import {NullAddress} from '../types';
import {
  CryptoDomainWithoutResolver,
  CryptoDomainWithTwitterVerification,
  mockAsyncMethods,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
  protocolLink,
  expectConfigurationErrorCode,
  CryptoDomainWithoutGunDbRecords,
  CryptoDomainWithAllRecords,
  WalletDomainLayerTwoWithAllRecords,
  skipItInLive,
  mockAPICalls,
  ProviderProtocol,
  mockAsyncMethod,
} from './helpers';
import FetchProvider from '../FetchProvider';
import {NamingServiceName} from '../types/publicTypes';
import Uns from '../Uns';
import Networking from '../utils/Networking';
import {ConfigurationErrorCode} from '../errors/configurationError';
import {TokenUriMetadata} from '../types/publicTypes';
import liveData from './testData/liveData.json';
import UnsConfig from '../config/uns-config.json';
import nock from 'nock';

let resolution: Resolution;
let uns: Uns;

beforeEach(async () => {
  jest.restoreAllMocks();
  resolution = new Resolution({
    sourceConfig: {
      uns: {
        locations: {
          Layer1: {
            url: protocolLink(ProviderProtocol.http, 'UNSL1'),
            network: 'rinkeby',
          },
          Layer2: {
            url: protocolLink(ProviderProtocol.http, 'UNSL2'),
            network: 'polygon-mumbai',
          },
        },
      },
    },
  });
  uns = resolution.serviceMap[NamingServiceName.UNS] as Uns;
});

describe('UNS', () => {
  it('should define the default uns contract', () => {
    expect(uns).toBeDefined();
    expect(uns.unsl1.network).toBe('rinkeby');
    expect(uns.unsl1.url).toBe(protocolLink());
    expect(uns.unsl2.network).toBe('polygon-mumbai');
    expect(uns.unsl2.url).toBe(protocolLink(ProviderProtocol.http, 'UNSL2'));
  });

  it('should not allow missing config for custom network', async () => {
    await expectConfigurationErrorCode(
      () =>
        new Resolution({
          sourceConfig: {
            uns: {
              locations: {
                Layer1: {network: 'ropsten'},
                Layer2: {network: 'polygon-mumbai'},
              },
            },
          },
        }),
      ConfigurationErrorCode.CustomNetworkConfigMissing,
    );
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
    ].twitter(CryptoDomainWithTwitterVerification);
    expectSpyToBeCalled(spies);
    expect(twitterHandle).toBe('Marlene12Bob');
  });

  it('should return NoRecord Resolution error', async () => {
    const uns = resolution.serviceMap[NamingServiceName.UNS] as Uns;
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
    const uns = resolution.serviceMap[NamingServiceName.UNS] as Uns;
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
    expect(resolverAddress).toBe('0x95AE1515367aa64C462c71e87157771165B1287A');
  });

  it('should return true for supported domain', async () => {
    mockAPICalls('uns_domain_exists_test', protocolLink());
    const uns = resolution.serviceMap[NamingServiceName.UNS] as Uns;
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
    mockAPICalls('uns_domain_exists_test', protocolLink());
    const uns = resolution.serviceMap[NamingServiceName.UNS] as Uns;
    mockAsyncMethods(uns.unsl2.readerContract, {
      call: [false],
    });
    expect(await uns.isSupportedDomain('brad.zil')).toBe(false);
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
      resolution.resolver(CryptoDomainWithoutResolver),
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
        const ipfsHash = await resolution.ipfsHash(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(ipfsHash).toBe('QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu');
      });

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
          resolution.chatId(CryptoDomainWithoutResolver),
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
          '0xecb7AaC995C284970A347342F5d04dB81fdB436F',
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
        '0xecb7AaC995C284970A347342F5d04dB81fdB436F',
      );
    });

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
          '0xecb7AaC995C284970A347342F5d04dB81fdB436F',
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
        '0xecb7AaC995C284970A347342F5d04dB81fdB436F',
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
        resolution.resolver(CryptoDomainWithoutResolver),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(spies2);
    });

    skipItInLive('should work without any configs', async () => {
      resolution = new Resolution();

      const uns = resolution.serviceMap['UNS'] as unknown as Uns;

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
      const address = await resolution.addr(CryptoDomainWithAllRecords, 'eth');
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(spies2);
      expect(address).toBe('0xe7474D07fD2FA286e7e0aa23cd107F8379085037');
    });

    skipItInLive('should work without any configs for L2', async () => {
      resolution = new Resolution();

      const uns = resolution.serviceMap['UNS'] as unknown as Uns;

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
        const ipfsHash = await resolution.ipfsHash(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(ipfsHash).toBe('QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu');
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
        expect(ipfsHash).toBe('QmfRXG3CcM1eWiCUA89uzimCvQUnw4HzTKLo6hRZ47PYsN');
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

      it.skip('should resolve with httpUrl stored on uns', async () => {
        const spies = mockAsyncMethods(uns, {
          get: {
            resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
            records: {
              ['ipfs.redirect_domain.value']: 'https://unstoppabledomains.com/',
            },
          },
        });
        const httpUrl = await resolution.httpUrl(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(httpUrl).toBe('https://unstoppabledomains.com/');
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
          resolution.chatId(CryptoDomainWithoutResolver),
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
        expect(resolution.namehash('crypto')).toEqual(
          '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
        );
      });

      it('starts with -', async () => {
        expect(resolution.namehash('-hello.crypto')).toBe(
          '0xc4ad028bcae9b201104e15f872d3e85b182939b06829f75a128275177f2ff9b2',
        );
      });

      it('ends with -', async () => {
        expect(resolution.namehash('hello-.crypto')).toBe(
          '0x82eaa6ef14e438940bfd7747e0e4c4fec42af20cee28ddd0a7d79f52b1c59b72',
        );
      });

      it('starts and ends with -', async () => {
        expect(resolution.namehash('-hello-.crypto')).toBe(
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

  describe('.registryAddress', () => {
    it('should return cns registry address', async () => {
      const unsl2 = uns.unsl2;
      mockAsyncMethod(unsl2.readerContract, 'call', (params) =>
        Promise.resolve([NullAddress]),
      );
      mockAPICalls('uns_registry_address_tests', protocolLink());
      const registryAddress = await uns.registryAddress(
        'udtestdev-265f8f.crypto',
      );
      expect(registryAddress).toBe(
        UnsConfig.networks[4].contracts.CNSRegistry.address,
      );
    });

    //todo Replace the domain with existed test domain ending on .888
    skipItInLive('should return uns registry address', async () => {
      const unsl2 = uns.unsl2;
      mockAsyncMethod(unsl2.readerContract, 'call', (params) =>
        Promise.resolve([NullAddress]),
      );
      mockAPICalls('uns_registry_address_tests', protocolLink());
      const registryAddress = await uns.registryAddress('some-domain.888');
      expect(registryAddress).toBe(
        UnsConfig.networks[4].contracts.UNSRegistry.address,
      );
    });

    skipItInLive('should return uns l2 registry address', async () => {
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

    it('should throw error if tld is not supported', async () => {
      mockAPICalls('uns_registry_address_tests', protocolLink());
      const unsl2 = uns.unsl2;
      mockAsyncMethod(unsl2.readerContract, 'call', (params) =>
        Promise.resolve([NullAddress]),
      );
      await expectResolutionErrorCode(
        () => uns.registryAddress('some-domain.zil'),
        ResolutionErrorCode.UnsupportedDomain,
      );
    });

    it('should throw error if tld does not exist', async () => {
      const unsl2 = uns.unsl2;
      mockAsyncMethod(unsl2.readerContract, 'call', (params) =>
        Promise.resolve([NullAddress]),
      );
      mockAPICalls('uns_registry_address_tests', protocolLink());
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
  });

  describe('#namehash', () => {
    it('supports options', async () => {
      expect(resolution.namehash('operadingo4.crypto')).toEqual(
        '0x70f542f09763d3ab404a6d87f6a2fad7d49f01b09c44064b4227d165ead5cf25',
      );

      expect(
        resolution.namehash('operadingo4.crypto', {prefix: false}),
      ).toEqual(
        '70f542f09763d3ab404a6d87f6a2fad7d49f01b09c44064b4227d165ead5cf25',
      );

      expect(
        resolution.namehash('operadingo4.crypto', {format: 'dec'}),
      ).toEqual(
        '51092378573785850370557709888128643877973998831507731627523713553233928900389',
      );
    });
  });

  describe('Providers', () => {
    skipItInLive(
      'should throw error when FetchProvider throws Error',
      async () => {
        const url = protocolLink();
        const provider = new FetchProvider(NamingServiceName.UNS, url);
        const polygonProvider = new FetchProvider(
          NamingServiceName.UNS,
          protocolLink(ProviderProtocol.http, 'UNSL2'),
        );
        resolution = new Resolution({
          sourceConfig: {
            uns: {
              locations: {
                Layer1: {url, provider, network: 'rinkeby'},
                Layer2: {network: 'polygon-mumbai', provider: polygonProvider},
              },
            },
          },
        });
        const uns = resolution.serviceMap['UNS'] as unknown as Uns;
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
      const polygonSpies = mockAsyncMethods(uns.unsl2.readerContract, {
        call: [],
      });

      const uri = await resolution.tokenURI('brad.crypto');

      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(polygonSpies);
      expect(uri).toEqual(
        'https://metadata.staging.unstoppabledomains.com/metadata/brad.crypto',
      );
    });

    it('should return token URI from L2', async () => {
      const spies = mockAsyncMethods(uns.unsl2.readerContract, {
        call: [
          'https://metadata.staging.unstoppabledomains.com/metadata/brad.crypto',
        ],
      });
      mockAsyncMethods(uns.unsl1.readerContract, {
        call: [],
      });

      const uri = await resolution.tokenURI('brad.crypto');

      expectSpyToBeCalled(spies);
      expect(uri).toEqual(
        'https://metadata.staging.unstoppabledomains.com/metadata/brad.crypto',
      );
    });

    it('should throw error', async () => {
      const spies = mockAsyncMethods(uns.unsl1.readerContract, {
        call: new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: 'execution reverted',
        }),
      });
      const polygonSpies = mockAsyncMethods(uns.unsl2.readerContract, {
        call: new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: 'execution reverted',
        }),
      });

      await expect(
        resolution.tokenURI('fakedomainthatdoesnotexist.crypto'),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnregisteredDomain),
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(polygonSpies);
    });

    skipItInLive('should throw the same internal error', async () => {
      const spies = mockAsyncMethods(uns.unsl1.readerContract, {
        call: new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: 'execution reverted',
        }),
      });
      const polygonSpies = mockAsyncMethods(uns.unsl2.readerContract, {
        call: [],
      });

      await expectResolutionErrorCode(
        () => resolution.tokenURI('fakedomainthatdoesnotexist.crypto'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spies);
      expectSpyToBeCalled(polygonSpies);
    });
  });

  describe('.tokenURIMetadata', () => {
    it('should return token metadata', async () => {
      const testMeta: TokenUriMetadata = liveData.bradCryptoMetadata;

      const unsSpies = mockAsyncMethods(uns.unsl1.readerContract, {
        call: ['https://metadata.unstoppabledomains.com/metadata/brad.crypto'],
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

      const metadata = await resolution.tokenURIMetadata('brad.crypto');

      expectSpyToBeCalled(unsSpies);
      expectSpyToBeCalled(fetchSpies);
      expect(metadata).toEqual(testMeta);
    });
  });

  describe('.unhash', () => {
    it('should unhash token', async () => {
      const testMeta: TokenUriMetadata = liveData.bradCryptoMetadata;
      mockAPICalls('unhash', protocolLink());
      mockAsyncMethod(uns.unsl2, 'getDomainFromTokenId', (params) =>
        Promise.reject(
          new ResolutionError(ResolutionErrorCode.UnregisteredDomain),
        ),
      );
      const domain = await resolution.unhash(
        '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
        NamingServiceName.UNS,
      );
      expect(domain).toEqual(testMeta.name);
    });

    skipItInLive('should throw error if hash is wrong', async () => {
      const provider = new FetchProvider(NamingServiceName.UNS, protocolLink());
      const polygonProvider = new FetchProvider(
        NamingServiceName.UNS,
        protocolLink(ProviderProtocol.http, 'UNSL2'),
      );
      resolution = new Resolution({
        sourceConfig: {
          uns: {
            locations: {
              Layer1: {
                provider,
                network: 'mainnet',
              },
              Layer2: {
                provider: polygonProvider,
                network: 'polygon-mainnet',
              },
            },
          },
        },
      });
      const providerSpy = mockAsyncMethods(provider, {
        fetchJson: {
          jsonrpc: '2.0',
          id: '1',
          error: {
            code: -32600,
            message: 'data type size mismatch, expected 32 got 6',
          },
        },
      });
      const polygonProviderSpy = mockAsyncMethods(polygonProvider, {
        fetchJson: {},
      });
      await expect(
        resolution.unhash('0xdeaddeaddead', NamingServiceName.UNS),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: 'data type size mismatch, expected 32 got 6',
        }),
      );
      expectSpyToBeCalled(providerSpy);
      expectSpyToBeCalled(polygonProviderSpy);
    });

    it('should throw error if domain is not found', async () => {
      const unregisteredhash = resolution.namehash(
        'test34230131207328144694.crypto',
      );
      mockAPICalls('unhash', protocolLink());
      mockAsyncMethod(uns.unsl2, 'getDomainFromTokenId', (params) =>
        Promise.reject(
          new ResolutionError(ResolutionErrorCode.UnregisteredDomain),
        ),
      );
      await expect(
        resolution.unhash(unregisteredhash, NamingServiceName.UNS),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain: unregisteredhash,
        }),
      );
    });

    skipItInLive(
      'should throw an error if hash returned from the network is not equal to the hash provided',
      async () => {
        const someHash = resolution.namehash('test34230131207328144693.crypto');
        mockAPICalls('unhash', protocolLink());
        mockAsyncMethod(uns.unsl2, 'getDomainFromTokenId', (params) =>
          Promise.reject(
            new ResolutionError(ResolutionErrorCode.UnregisteredDomain),
          ),
        );
        await expectResolutionErrorCode(
          () => resolution.unhash(someHash, NamingServiceName.UNS),
          ResolutionErrorCode.ServiceProviderError,
        );
      },
    );

    skipItInLive(
      'getStartingBlockFromRegistry should return earliest for custom network',
      async () => {
        resolution = new Resolution({
          sourceConfig: {
            uns: {
              locations: {
                Layer1: {
                  network: 'custom',
                  url: protocolLink(),
                  proxyReaderAddress:
                    UnsConfig.networks[4].contracts.ProxyReader.address,
                },
                Layer2: {
                  network: 'polygon-mumbai',
                },
              },
            },
          },
        });
        const someHash = resolution.namehash('test.coin');
        // We need to make sure there is no mocks in the queque before we create new ones
        nock.cleanAll();
        mockAPICalls('unhashGetStartingBlockTest', protocolLink());
        const uns = resolution.serviceMap['UNS'] as unknown as Uns;
        const unsl2 = uns.unsl2;
        mockAsyncMethod(unsl2, 'getDomainFromTokenId', (params) =>
          Promise.reject(
            new ResolutionError(ResolutionErrorCode.UnregisteredDomain),
          ),
        );
        await expectResolutionErrorCode(
          () => resolution.unhash(someHash, NamingServiceName.UNS),
          ResolutionErrorCode.UnregisteredDomain,
        );
        // If the getStartingBlockFromRegistry function won't return "earliest" then one of the mocks will not be fired
        // Giving us an indicator that something has changed in the function output
        if (!nock.isDone()) {
          throw new Error(
            'Not all mocks have been called, getStartingBlockFromRegistry is misbehaving?',
          );
        }
      },
    );

    it('should return a .wallet domain', async () => {
      const walletDomain = 'udtestdev-johnnywallet.wallet';
      const hash = resolution.namehash(walletDomain);
      mockAPICalls('unhash', protocolLink());
      mockAPICalls('unhash', protocolLink(ProviderProtocol.http, 'UNSL2'));
      const uns = resolution.serviceMap['UNS'] as unknown as Uns;
      const unsl2 = uns.unsl2;
      mockAsyncMethod(unsl2, 'getDomainFromTokenId', (params) =>
        Promise.reject(
          new ResolutionError(ResolutionErrorCode.UnregisteredDomain),
        ),
      );
      const result = await resolution.unhash(hash, NamingServiceName.UNS);
      expect(result).toBe(walletDomain);
    });

    it('should return a .coin domain', async () => {
      const walletDomain = 'udtestdev-johnnycoin.coin';
      const hash = resolution.namehash(walletDomain);
      mockAPICalls('unhash', protocolLink());
      const uns = resolution.serviceMap['UNS'] as unknown as Uns;
      const unsl2 = uns.unsl2;
      mockAsyncMethod(unsl2, 'getDomainFromTokenId', (params) =>
        Promise.reject(
          new ResolutionError(ResolutionErrorCode.UnregisteredDomain),
        ),
      );
      const result = await resolution.unhash(hash, NamingServiceName.UNS);
      expect(result).toBe(walletDomain);
    });
  });
});
