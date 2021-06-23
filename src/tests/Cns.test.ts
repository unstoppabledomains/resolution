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
  pendingInLive,
} from './helpers';
import FetchProvider from '../FetchProvider';
import {
  CnsSupportedNetworks,
  NamingServiceName,
  TokenUriMetadata,
} from '../types/publicTypes';
import Cns from '../Cns';
import Networking from '../utils/Networking';
import {ConfigurationErrorCode} from '../errors/configurationError';
import liveData from './testData/liveData.json';
import NetworkConfig from '../config/network-config.json';

let resolution: Resolution;
let cns: Cns;

beforeEach(async () => {
  jest.restoreAllMocks();
  resolution = new Resolution({
    sourceConfig: {cns: {url: protocolLink(), network: 'mainnet'}},
  });
  cns = resolution.serviceMap[NamingServiceName.CNS] as Cns;
});

describe('CNS', () => {
  it('should define the default cns contract', () => {
    expect(cns).toBeDefined();
    expect(cns.network).toBe(1);
    expect(cns.url).toBe(protocolLink());
  });

  it('should not allow ropsten as testnet', async () => {
    await expectConfigurationErrorCode(
      () =>
        new Resolution({
          sourceConfig: {
            cns: {network: 'ropsten' as CnsSupportedNetworks},
          },
        }),
      ConfigurationErrorCode.UnsupportedNetwork,
    );
  });

  it('checks the record by key', async () => {
    const eyes = mockAsyncMethods(cns, {
      get: {
        resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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
    const spies = mockAsyncMethods(cns, {
      get: {
        resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
        owner: '0x6ec0deed30605bcd19342f3c30201db263291589',
        records: {
          ['validation.social.twitter.username']:
            '0xcd2655d9557e5535313b47107fa8f943eb1fec4da6f348668062e66233dde21b413784c4060340f48da364311c6e2549416a6a23dc6fbb48885382802826b8111b',
          ['social.twitter.username']: 'derainberk',
        },
      },
    });
    const twitterHandle = await resolution.serviceMap[
      NamingServiceName.CNS
    ].twitter(CryptoDomainWithTwitterVerification);
    expectSpyToBeCalled(spies);
    expect(twitterHandle).toBe('derainberk');
  });

  it('should return NoRecord Resolution error', async () => {
    const spies = mockAsyncMethods(cns, {
      get: {
        resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
        records: {},
      },
    });
    await expectResolutionErrorCode(
      resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
      ResolutionErrorCode.RecordNotFound,
    );
    expectSpyToBeCalled(spies);
  }, 20000);

  it('should return a valid resolver address', async () => {
    const spies = mockAsyncMethods(cns, {
      get: {resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842'},
    });
    const resolverAddress = await resolution.resolver(
      CryptoDomainWithAllRecords,
    );
    expectSpyToBeCalled(spies);
    expect(resolverAddress).toBe('0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842');
  });

  it('should return true for supported domain', async () => {
    expect(cns.isSupportedDomain('example.test')).toBe(true);
    expect(cns.isSupportedDomain('example.tqwdest')).toBe(true);
    expect(cns.isSupportedDomain('example.qwdqwdq.wd.tqwdest')).toBe(true);
  });

  it('should return false for unsupported domain', async () => {
    expect(cns.isSupportedDomain('example.zil')).toBe(false);
  });

  it('should not find a resolver address', async () => {
    const spies = mockAsyncMethods(cns, {
      get: {
        owner: '0x0000000000000000000000000000000000000000',
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
    const spies = mockAsyncMethods(cns, {
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
      const eyes = mockAsyncMethods(cns, {
        get: {
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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
      const eyes = mockAsyncMethods(cns, {
        get: {
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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

    describe('.Metadata', () => {
      it('should resolve with ipfs stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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

      it('should resolve with email stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['whois.email.value']: 'johnny@unstoppabledomains.com',
            },
          },
        });
        const email = await resolution.email(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(email).toBe('johnny@unstoppabledomains.com');
      });

      it('should resolve with httpUrl stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['ipfs.redirect_domain.value']: 'google.com',
            },
          },
        });
        const httpUrl = await resolution.httpUrl(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(eyes);
        expect(httpUrl).toBe('google.com');
      });

      it('should resolve with the gundb chatId stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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
        mockAsyncMethods(cns, {
          get: {
            owner: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
          },
        });
        await expectResolutionErrorCode(
          resolution.chatId(CryptoDomainWithoutResolver),
          ResolutionErrorCode.UnspecifiedResolver,
        );
      });

      it('should resolve with the gundb public key stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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

      it('should error out for gundb public key stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
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

      it('should error out for gundb chatId stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
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
      const eyes = mockAsyncMethods(cns, {
        get: {
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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
      const spies = mockAsyncMethods(cns, {
        get: {
          resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
          records: {},
        },
      });
      await expectResolutionErrorCode(
        resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(spies);
    });

    it('should return a valid resolver address', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          records: {},
        },
      });
      const resolverAddress = await resolution.resolver(
        CryptoDomainWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
      );
    });

    it('should return UnregisteredDomain error when owner address not found', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {owner: NullAddress},
      });
      await expectResolutionErrorCode(
        resolution.resolver('unknown-unknown-938388383.crypto'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spies);
    });

    it('should return UnspecifiedResolver error when resolver address not found', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {owner: '0x000000000000000000000000000000000000dead'},
      });
      await expectResolutionErrorCode(
        resolution.resolver(CryptoDomainWithoutResolver),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });

    it('should work without any configs', async () => {
      resolution = new Resolution();
      const eyes = mockAsyncMethods(
        resolution.serviceMap[NamingServiceName.CNS],
        {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['crypto.ETH.address']:
                '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
            },
          },
        },
      );
      const address = await resolution.addr(CryptoDomainWithAllRecords, 'eth');
      expectSpyToBeCalled(eyes);
      expect(address).toBe('0xe7474D07fD2FA286e7e0aa23cd107F8379085037');
    });

    describe('.Metadata', () => {
      it('should resolve with ipfs stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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

      it('should resolve with email stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {['whois.email.value']: 'johnny@unstoppabledomains.com'},
          },
        });
        const email = await resolution.email(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(email).toBe('johnny@unstoppabledomains.com');
      });

      it.skip('should resolve with httpUrl stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['ipfs.redirect_domain.value']: 'https://unstoppabledomains.com/',
            },
          },
        });
        const httpUrl = await resolution.httpUrl(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(httpUrl).toBe('https://unstoppabledomains.com/');
      });

      it('should resolve with the gundb chatId stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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
        mockAsyncMethods(cns, {
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

      it('should resolve with the gundb public key stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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

      it('should error out for gundb public key stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {},
          },
        });
        await expectResolutionErrorCode(
          resolution.chatPk(CryptoDomainWithoutGunDbRecords),
          ResolutionErrorCode.RecordNotFound,
        );
        expectSpyToBeCalled(spies);
      });

      it('should error out for gundb chatId stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
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
        expect(resolution.isSupportedDomain('crypto')).toEqual(true);
        expect(resolution.namehash('crypto')).toEqual(
          '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
        );
      });

      it('starts with -', async () => {
        expect(resolution.isSupportedDomain('-hello.crypto')).toEqual(true);
        expect(resolution.namehash('-hello.crypto')).toBe(
          '0xc4ad028bcae9b201104e15f872d3e85b182939b06829f75a128275177f2ff9b2',
        );
      });

      it('ends with -', async () => {
        expect(resolution.isSupportedDomain('hello-.crypto')).toEqual(true);
        expect(resolution.namehash('hello-.crypto')).toBe(
          '0x82eaa6ef14e438940bfd7747e0e4c4fec42af20cee28ddd0a7d79f52b1c59b72',
        );
      });

      it('starts and ends with -', async () => {
        expect(resolution.isSupportedDomain('-hello-.crypto')).toEqual(true);
        expect(resolution.namehash('-hello-.crypto')).toBe(
          '0x90cc1963ff09ce95ee2dbb3830df4f2115da9756e087a50283b3e65f6ffe2a4e',
        );
      });

      it('should throw UnregisteredDomain', async () => {
        const eyes = mockAsyncMethods(cns, {
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
    it('should return mainnet registry address', async () => {
      const registryAddress = await cns.registryAddress('some-domaine.crypto');
      expect(registryAddress).toBe(
        NetworkConfig.networks[1].contracts.Registry.address,
      );
    });
  });

  describe('.isRegistered', () => {
    it('should return true', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          records: {
            ['ipfs.html.value']:
              'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          },
        },
      });
      const isRegistered = await cns.isRegistered('brad.crypto');
      expectSpyToBeCalled(spies);
      expect(isRegistered).toBe(true);
    });
    it('should return false', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {
          owner: '',
          resolver: '',
          records: {},
        },
      });
      const isRegistered = await cns.isRegistered(
        'thisdomainisdefinitelynotregistered123.crypto',
      );
      expectSpyToBeCalled(spies);
      expect(isRegistered).toBe(false);
    });
  });

  describe('.isAvailable', () => {
    it('should return false', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          records: {
            ['ipfs.html.value']:
              'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          },
        },
      });
      const isAvailable = await cns.isAvailable('ryan.crypto');
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(false);
    });
    it('should return true', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {
          owner: '',
          resolver: '',
          records: {},
        },
      });
      const isAvailable = await cns.isAvailable('ryan.crypto');
      expectSpyToBeCalled(spies);
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
    it('should throw error when FetchProvider throws Error', async () => {
      const url = protocolLink();
      const provider = new FetchProvider(NamingServiceName.CNS, url);
      resolution = new Resolution({
        sourceConfig: {cns: {url, provider, network: 'mainnet'}},
      });
      jest.spyOn(Networking, 'fetch').mockRejectedValue(new Error('error_up'));

      await expect(
        resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
      ).rejects.toEqual(new Error('error_up'));
    });
  });

  describe('.tokenURI', () => {
    it('should return token URI', async () => {
      const spies = mockAsyncMethods(cns.readerContract, {
        call: ['https://metadata.unstoppabledomains.com/metadata/brad.crypto'],
      });

      const uri = await resolution.tokenURI('brad.crypto');

      expectSpyToBeCalled(spies);
      expect(uri).toEqual(
        'https://metadata.unstoppabledomains.com/metadata/brad.crypto',
      );
    });

    it('should throw error if domain is not found', async () => {
      const spies = mockAsyncMethods(cns.readerContract, {
        call: new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: 'execution reverted',
        }),
      });

      await expectResolutionErrorCode(
        () => resolution.tokenURI('fakedomainthatdoesnotexist.crypto'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spies);
    });

    it('should throw the same internal error', async () => {
      pendingInLive();
      const spies = mockAsyncMethods(cns.readerContract, {
        call: new ResolutionError(ResolutionErrorCode.ServiceProviderError),
      });

      await expectResolutionErrorCode(
        () => resolution.tokenURI('fakedomainthatdoesnotexist.crypto'),
        ResolutionErrorCode.ServiceProviderError,
      );
      expectSpyToBeCalled(spies);
    });
  });

  describe('.tokenURIMetadata', () => {
    it('should return token metadata', async () => {
      const testMeta: TokenUriMetadata = liveData.bradCryptoMetadata;

      const cnsSpies = mockAsyncMethods(cns.readerContract, {
        call: ['https://metadata.unstoppabledomains.com/metadata/brad.crypto'],
      });
      const fetchSpies = mockAsyncMethods(Networking, {
        fetch: {
          ok: true,
          json: () => testMeta,
        },
      });

      const metadata = await resolution.tokenURIMetadata('brad.crypto');

      expectSpyToBeCalled(cnsSpies);
      expectSpyToBeCalled(fetchSpies);
      expect(metadata).toEqual(testMeta);
    });

    it('should throw error if domain is not found', async () => {
      const spies = mockAsyncMethods(cns.readerContract, {
        call: new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: 'execution reverted',
        }),
      });

      await expectResolutionErrorCode(
        () => resolution.tokenURIMetadata('fakedomainthatdoesnotexist.crypto'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spies);
    });
  });

  describe('.unhash', () => {
    it('should unhash token', async () => {
      const testMeta: TokenUriMetadata = liveData.bradCryptoMetadata;
      const provider = new FetchProvider(NamingServiceName.CNS, protocolLink());
      resolution = new Resolution({
        sourceConfig: {
          cns: {
            provider,
            network: 'mainnet',
          },
        },
      });
      const providerSpy = mockAsyncMethods(provider, {
        fetchJson: {
          jsonrpc: '2.0',
          id: '1',
          result: [
            {
              address: '0xd1e5b0ff1287aa9f9a268759062e4ab08b9dacbe',
              blockHash:
                '0xd716309f77e2ab9a089dd33765652c5a45adaf08cebda1497de462c9b2487e3e',
              blockNumber: '0x8b344c',
              data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000b627261642e63727970746f000000000000000000000000000000000000000000',
              logIndex: '0x56',
              removed: false,
              topics: [
                '0xc5beef08f693b11c316c0c8394a377a0033c9cf701b8cd8afd79cecef60c3952',
                '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
              ],
              transactionHash:
                '0x4ddc930c0d511de217d6ba7d6a7dd979ab3668f33ac2cd31f20147557ff9955b',
              transactionIndex: '0x30',
            },
          ],
        },
      });
      const domain = await resolution.unhash(
        '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
        NamingServiceName.CNS,
      );
      expectSpyToBeCalled(providerSpy);
      expect(domain).toEqual(testMeta.name);
    });

    it('should throw error if hash is wrong', async () => {
      const provider = new FetchProvider(NamingServiceName.CNS, protocolLink());
      resolution = new Resolution({
        sourceConfig: {
          cns: {
            provider,
            network: 'mainnet',
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

      await expectResolutionErrorCode(
        () => resolution.unhash('0xdeaddeaddead', NamingServiceName.CNS),
        ResolutionErrorCode.ServiceProviderError,
      );
      expectSpyToBeCalled(providerSpy);
    });

    it('should throw error if domain is not found', async () => {
      const unregisteredhash = resolution.namehash(
        'test34230131207328144694.crypto',
      );
      const spy = mockAsyncMethods(Networking, {
        fetch: {
          ok: true,
          json: () => ({jsonrpc: '2.0', id: '1', result: []}),
        },
      });
      await expectResolutionErrorCode(
        () => resolution.unhash(unregisteredhash, NamingServiceName.CNS),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spy);
    });
  });
});
