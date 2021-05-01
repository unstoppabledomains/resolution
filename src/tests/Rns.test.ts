import Resolution, { NamingServiceName, ResolutionErrorCode } from '../index';
import { NullAddress } from '../types';
import {
  expectConfigurationErrorCode,
  expectResolutionErrorCode,
  expectSpyToBeCalled,
  mockAsyncMethod,
  mockAsyncMethods,
  pendingInLive,
} from './helpers';
import { ConfigurationErrorCode } from '../errors/configurationError';
import { RnsSupportedNetworks } from '../types/publicTypes';
import Rns from '../Rns';

let resolution: Resolution;
let rns: Rns;

// https://developers.rsk.co/rif/rns/mainnet/
// https://developers.rsk.co/rif/rns/testnet/

describe('RNS', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    resolution = new Resolution();
    rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;
  });

  it('allows rns network specified as string', async () => {
    const resolution = new Resolution({
      sourceConfig: {
        rns: { network: 'mainnet' },
      },
    });
    const rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;
    expect(rns.url).toBe('https://public-node.rsk.co');
    expect(rns.network).toEqual(30);
  });

  it('resolves .rsk name using blockchain', async () => {
    expect(rns.url).toBe('https://public-node.rsk.co');
    expect(rns.network).toEqual(30);

    const eyes = mockAsyncMethods(rns, {
      resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
      fetchAddress: '0x9D4969d06411D3B319f7204b71000cF874165Bb0',
    });
    const spy = mockAsyncMethods(rns, {
      owner: '0x9D4969d06411D3B319f7204b71000cF874165Bb0',
    });
    expect(await resolution.addr('riverplate.rsk', 'RSK')).toEqual(
      '0x9D4969d06411D3B319f7204b71000cF874165Bb0',
    );
    expect(await resolution.owner('riverplate.rsk')).toEqual(
      '0x9D4969d06411D3B319f7204b71000cF874165Bb0',
    );
    expectSpyToBeCalled(eyes);
    expectSpyToBeCalled(spy, 1);
  });

  it('reverses address to RNS domain', async () => {
    expect(rns.url).toBe('https://public-node.rsk.co');
    expect(rns.network).toEqual(30);
    pendingInLive();
    const eyes = mockAsyncMethods(rns, {
      resolverCallToName: 'moneyonchain.rsk',
      resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
    });
    const result = await rns?.reverse(
      '0x135601C736ddB4C58a4b8fd3CD9F66dF244d28AA',
      'rsk',
    );
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('moneyonchain.rsk');
  });

  it('reverses address to RNS domain null', async () => {
    expect(rns.url).toBe('https://public-node.rsk.co');
    expect(rns.network).toEqual(30);
    const spy = mockAsyncMethod(rns, 'resolver', NullAddress);
    const result = await rns?.reverse(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
      'RSK',
    );
    expectSpyToBeCalled([spy]);
    expect(result).toEqual(null);
  });

  it('resolves name with resolver but without an owner', async () => {
    const eyes = mockAsyncMethods(rns, {
      resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
      callMethod: '0x76a914a3626daa1c5638131b8008112516c7e2835ab13d88ac',
    });
    const btc = await resolution.addr('multichain.testing.rsk', 'btc');
    expectSpyToBeCalled(eyes);
    expect(btc).toBe('1Ftu4C8VW18RkB8PZxXwwHocMLyEynLcrG');
  });

  it('checks normalizeSource rns (boolean)', async () => {
    const resolution = new Resolution();
    rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;
    expect(rns.network).toBe(30);
    expect(rns.url).toBe('https://public-node.rsk.co');
  });

  it('checks normalizeSource rns (object) #1', async () => {
    const resolution = new Resolution({
      sourceConfig: { rns: { network: 'testnet' } },
    });
    rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;
    expect(rns.network).toBe(31);
    expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    expect(rns.readerContract.address).toBe(
      '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
    );
  });

  it('checks normalizeSource rns (object) #2', async () => {
    expect(
      () =>
        new Resolution({
          sourceConfig: {
            rns: { network: 'notRealNetwork' as RnsSupportedNetworks },
          },
        }),
    ).toThrowError('Unspecified network in Resolution RNS configuration');
  });

  it('checks normalizeSource rns (object) #3', async () => {
    expect(
      () =>
        new Resolution({
          sourceConfig: { rns: { network: 'invalid' as RnsSupportedNetworks } },
        }),
    ).toThrowError('Unspecified network in Resolution RNS configuration');
  });

  it('checks normalizeSource rns (object) #4', async () => {
    const resolution = new Resolution({
      sourceConfig: { rns: { network: 'mainnet' } },
    });
    rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;
    expect(rns.network).toBe(30);
    expect(rns.url).toBe('https://public-node.rsk.co');
  });

  it('checks normalizeSource rns (object) #5', async () => {
    const resolution = new Resolution({
      sourceConfig: {
        rns: {
          registryAddress: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
          network: 'mainnet',
        },
      },
    });
    rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;
    expect(rns.network).toBe(30);
    expect(rns.url).toBe('https://public-node.rsk.co');
    expect(rns.readerContract.address).toBe(
      '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
    );
  });

  it('checks normalizeSource rns (object) #6', async () => {
    const resolution = new Resolution({
      sourceConfig: {
        rns: {
          network: 'testnet',
          registryAddress: '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
        },
      },
    });
    rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;
    expect(rns.network).toBe(31);
    expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    expect(rns.readerContract.address).toBe(
      '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
    );
  });

  it('checks normalizeSource rns (object) #7', async () => {
    const resolution = new Resolution({
      sourceConfig: {
        rns: {
          registryAddress: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
          network: 'mainnet',
        },
      },
    });
    rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;
    expect(rns.network).toBe(30);
    expect(rns.url).toBe('https://public-node.rsk.co');
    expect(rns.readerContract.address).toBe(
      '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
    );
  });

  it('checks normalizeSource rns (object) #8', async () => {
    expectConfigurationErrorCode(
      () =>
        new Resolution({
          sourceConfig: {
            rns: {
              network: 'custom' as RnsSupportedNetworks,
              url: 'https://custom.rsk.co',
            },
          },
        }),
      ConfigurationErrorCode.UnsupportedNetwork,
    );
  });

  it('checks rns multicoin support #1', async () => {
    const eyes = mockAsyncMethods(rns, {
      resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
      callMethod: '0x76a914a3626daa1c5638131b8008112516c7e2835ab13d88ac',
    });
    const btc = await resolution.addr('multichain.testing.rsk', 'btc');
    expectSpyToBeCalled(eyes);
    expect(btc).toBe('1Ftu4C8VW18RkB8PZxXwwHocMLyEynLcrG');
  });

  it('checks rns multicoin support #2', async () => {
    const eyes = mockAsyncMethods(rns, {
      resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
      callMethod: '0xe9a4e6fae8217E032A08848E227d2b57D3E1e0A5',
    });
    const eth = await resolution.addr('multichain.testing.rsk', 'eth');
    expectSpyToBeCalled(eyes);
    expect(eth).toBe('0xe9a4e6fae8217E032A08848E227d2b57D3E1e0A5');
  });

  describe('checks rns multicoin support on testnet', () => {
    const resolution = new Resolution({
      sourceConfig: {
        rns: { network: 'testnet' },
      },
    });
    const rns = resolution.serviceMap[NamingServiceName.RNS] as Rns;

    it('eth', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0x25C289ccCFFf700c6a38722F4913924fE504De0e',
        callMethod: '0xC42Ec4d9Cd53621D6925d67970dF07878928C007',
      });
      const eth = await resolution.addr('migoi.rsk', 'eth');
      expectSpyToBeCalled(eyes);
      expect(eth).toBe('0xC42Ec4d9Cd53621D6925d67970dF07878928C007');
    });

    it('btc', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0x25C289ccCFFf700c6a38722F4913924fE504De0e',
        callMethod: '0x76a9140c3e057f5a135442ff9054c5abd4944e432e54c988ac',
      });
      const btc = await resolution.addr('migoi.rsk', 'btc');
      expectSpyToBeCalled(eyes);
      expect(btc).toBe('127jQdWqgXPqWNqQN4QdpWEEvVodtN4EJN');
    });

    it('ltc', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0x25C289ccCFFf700c6a38722F4913924fE504De0e',
        callMethod: '0x76a914d9ab983e34e58fa098159208f80c01cb794d6d4988ac',
      });
      const ltc = await resolution.addr('migoi.rsk', 'ltc');
      expectSpyToBeCalled(eyes);
      expect(ltc).toBe('Lf4tTSzTeeEdbdgtevRQGvuCnckabZYVuC');
    });
  })

  it('checks UnsupportedCurrency error', async () => {
    const eyes = mockAsyncMethods(rns, {
      resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
    });
    await expectResolutionErrorCode(
      resolution.addr('multichain.testing.rsk', 'UNREALTICKER'),
      ResolutionErrorCode.UnsupportedCurrency,
    );
    expectSpyToBeCalled(eyes);
  });

  describe('.resolve', () => {
    it('should return correct resolver address', async () => {
      const spies = mockAsyncMethods(rns, {
        resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
      });
      const resolverAddress = await resolution.resolver('riverplate.rsk');
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
      );
    });

    it('should not find a resolver address', async () => {
      const spies = mockAsyncMethods(rns, {
        resolver: undefined,
      });
      await expectResolutionErrorCode(
        resolution.resolver('empty.rsk'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });
  });

  describe('.Hashing', () => {
    describe('.namehash', () => {
      it('supports root node', async () => {
        expect(resolution.isSupportedDomain('rsk')).toEqual(true);
        expect(resolution.namehash('rsk')).toEqual(
          '0x0cd5c10192478cd220936e91293afc15e3f6de4d419de5de7506b679cbdd8ec4',
        );
      });

      it('should hash appropriately', async () => {
        expect(resolution.namehash('riverplate.rsk')).toBe(
          '0xc12ff8ddc9bdb0772cf3929a2a12985859f886b638a519db6b383ee7617b8341',
        );
      });

      describe('.domain invalid format', () => {
        it('starts with -', async () => {
          expect(resolution.isSupportedDomain('-hello.rsk')).toEqual(false);
          await expectResolutionErrorCode(
            () => resolution.namehash('-hello.rsk'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });

        it('ends with -', async () => {
          expect(resolution.isSupportedDomain('hello-.rsk')).toEqual(false);
          await expectResolutionErrorCode(
            () => resolution.namehash('hello-.rsk'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });

        it('starts and ends with -', async () => {
          expect(resolution.isSupportedDomain('-hello-.rsk')).toEqual(false);
          await expectResolutionErrorCode(
            () => resolution.namehash('-hello-.rsk'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });
      });
    });
  });

  describe('.Metadata', () => {
    it('should return a valid ipfsHash', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
        callMethod:
          '0xe30101701220db1487b8e1e9bcd08cbb2dcef821b44a619d6f62b3be42441a52eb76dc0ea60a',
      });
      const ipfsHash = await resolution.ipfsHash('riverplate.rsk');
      expectSpyToBeCalled(eyes);
      expect(ipfsHash).toBe('Qmd5r9ngwWJhDT71EUUjp1Skbmt5DqXmTSt5vPHgZrWru7');
    });

    it('should not find an appropriate httpUrl', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
        callMethod: '',
      });
      await expectResolutionErrorCode(
        resolution.httpUrl('matthewgould.rsk'),
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(eyes);
    });

    it('should return resolution error for not finding the email', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
        callMethod: '',
      });
      const emailPromise = resolution.email('matthewgould.rsk');
      await expectResolutionErrorCode(
        emailPromise,
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(eyes);
    });

    it('should resolve gundb id and public key', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
        callMethod:
          '0x7e1d12f34e038a2bda3d5f6ee0809d72f668c357d9e64fd7f622513f06ea652146ab5fdee35dc4ce77f1c089fd74972691fccd48130306d9eafcc6e1437d1ab21b',
      });
      const chatId = await resolution
        .chatId('riverplate.rsk')
        .catch((err) => err.code);
      expectSpyToBeCalled(eyes);
      expect(chatId).toBe(
        '0x7e1d12f34e038a2bda3d5f6ee0809d72f668c357d9e64fd7f622513f06ea652146ab5fdee35dc4ce77f1c089fd74972691fccd48130306d9eafcc6e1437d1ab21b',
      );
    });

    it('should resolve gundb public key', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
        callMethod:
          'yxbMDgFrzemQEcDwJYccE_TDbGmRL_iqZ2JhQxYi2s8.nBEAyMfM2ZBtOf2C-GHe3zEn42Q1vrfPAVqNzgGhXvQ',
      });
      const publicKey = await resolution
        .chatPk('riverplate.rsk')
        .catch((err) => err.code);
      expectSpyToBeCalled(eyes);
      expect(publicKey).toBe(
        'yxbMDgFrzemQEcDwJYccE_TDbGmRL_iqZ2JhQxYi2s8.nBEAyMfM2ZBtOf2C-GHe3zEn42Q1vrfPAVqNzgGhXvQ',
      );
    });

    it('should return resolution error for not finding the gundb chat id', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
        callMethod: undefined,
      });
      const emailPromise = resolution.chatId('test.rsk');
      await expectResolutionErrorCode(
        emailPromise,
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(eyes);
    });

    it('should return resolution error for not finding the gundb publicKey', async () => {
      const eyes = mockAsyncMethods(rns, {
        resolver: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
        callMethod: undefined,
      });
      const emailPromise = resolution.chatPk('test.rsk');
      await expectResolutionErrorCode(
        emailPromise,
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(eyes);
    });
  });
});
