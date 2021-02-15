import nock from 'nock';
import Resolution, { ResolutionErrorCode } from './index';
import Ens from './Ens';
import { NullAddress } from './types';
import {
  expectConfigurationErrorCode,
  expectResolutionErrorCode,
  expectSpyToBeCalled,
  mockAsyncMethod,
  mockAsyncMethods,
  pendingInLive,
  protocolLink,
  ProviderProtocol,
} from './tests/helpers';
import { ConfigurationErrorCode } from './errors/configurationError';
import { TickerVersion } from './publicTypes';
import { NamingServiceName } from './publicTypes';

let resolution: Resolution;

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
  resolution = new Resolution({
    blockchain: { ens: { url: protocolLink(ProviderProtocol.http, NamingServiceName.ENS) } },
  });
});

describe('ENS', () => {
  it('allows ens network specified as string', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { network: 'mainnet' } },
    });
    expect(resolution.ens?.url).toBe('https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee');
    expect(resolution.ens?.network).toEqual(1);
  });

  it('resolves .eth name using blockchain', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { url: protocolLink(ProviderProtocol.http, NamingServiceName.ENS) } },
    });
    expect(resolution.ens?.url).toBe(protocolLink(ProviderProtocol.http, NamingServiceName.ENS));
    expect(resolution.ens?.network).toEqual(1);

    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
      fetchAddress: '0x714ef33943d925731FBB89C99aF5780D888bD106',
    });
    const spy = mockAsyncMethods(resolution.ens, {
      getOwner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
    });
    expect(await resolution.addr('matthewgould.eth', 'ETH')).toEqual(
      '0x714ef33943d925731FBB89C99aF5780D888bD106',
    );
    expect(await resolution.owner('matthewgould.eth')).toEqual(
      '0x714ef33943d925731FBB89C99aF5780D888bD106',
    );
    expectSpyToBeCalled(eyes);
    expectSpyToBeCalled(spy, 1);
  });

  it('reverses address to ENS domain', async () => {
    pendingInLive();
    const eyes = mockAsyncMethods(resolution.ens, {
      resolverCallToName: 'adrian.argent.xyz',
      resolver: '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890',
    });
    const result = await resolution.ens?.reverse(
      '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
      'ETH',
    );
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('adrian.argent.xyz');
  });

  it('reverses address to ENS domain null', async () => {
    const spy = mockAsyncMethod(resolution.ens, 'resolver', NullAddress);
    const result = await resolution.ens?.reverse(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
      'ETH',
    );
    expectSpyToBeCalled([spy]);
    expect(result).toEqual(null);
  });

  it('resolves .xyz name using ENS blockchain', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890',
      fetchAddress: '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
    });

    const result = await resolution.addr('adrian.argent.xyz', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('0xb0E7a465D255aE83eb7F8a50504F3867B945164C');
  });

  it('resolves .luxe name using ENS blockchain', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      fetchAddress: '0xf3dE750A73C11a6a2863761E930BF5fE979d5663',
    });

    const result = await resolution.addr('john.luxe', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('0xf3dE750A73C11a6a2863761E930BF5fE979d5663');
  });

  it('resolves .kred name using ENS blockchain', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x96184444629F3489c4dE199871E6F99568229d8f',
      callMethod: '0x96184444629F3489c4dE199871E6F99568229d8f',
    });
    const result = await resolution.addr('brantly.kred', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('0x96184444629F3489c4dE199871E6F99568229d8f');
  });

  it('resolves .luxe name using ENS blockchain with thrown error', async () => {
    const spies = mockAsyncMethods(resolution.ens, {
      resolver: undefined,
      getOwner: undefined,
    });

    await expectResolutionErrorCode(
      resolution.addr('something.luxe', 'ETH'),
      ResolutionErrorCode.UnregisteredDomain,
    );
    expectSpyToBeCalled(spies);
  });

  // TODO remove this test once addressOrThrow is fully removed
  it('[Old test]resolves .luxe name using ENS blockchain with thrown error', async () => {
    const spies = mockAsyncMethods(resolution.ens, {
      resolver: undefined,
      getOwner: undefined,
    });

    await expectResolutionErrorCode(
      resolution.addressOrThrow('something.luxe', 'ETH'),
      ResolutionErrorCode.UnregisteredDomain,
    );
    expectSpyToBeCalled(spies);
  });

  it('resolves name with resolver but without an owner', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x76a9144620b70031f0e9437e374a2100934fba4911046088ac',
    });
    const doge = await resolution.addr('testthing.eth', 'DOGE');
    expectSpyToBeCalled(eyes);
    expect(doge).toBe('DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD');
  });

  it('checks if the network is supported(true)', async () => {
    const ens = new Ens({ network: 1 });
    const answer = ens.isSupportedNetwork();
    expect(answer).toBe(true);
  });

  it('checks if the network is supported(false)', async () => {
    expectConfigurationErrorCode(
      () => new Ens({ network: 42 }),
      ConfigurationErrorCode.UnspecifiedUrl,
    );
  });

  it('checks normalizeSource ens (boolean)', async () => {
    const resolution = new Resolution({ blockchain: { ens: true } });
    expect(resolution.ens?.network).toBe(1);
    expect(resolution.ens?.url).toBe('https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee');
  });

  it('checks normalizeSource ens (object) #1', async () => {
    expect(resolution.ens?.network).toBe(1);
    expect(resolution.ens?.url).toBe(protocolLink(ProviderProtocol.http, NamingServiceName.ENS));
  });

  it('checks normalizeSource ens (object) #2', async () => {
    const resolution = new Resolution({ blockchain: { ens: { network: 3 } } });
    expect(resolution.ens?.network).toBe(3);
    expect(resolution.ens?.url).toBe('https://ropsten.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee');
    expect(resolution.ens?.registryAddress).toBe(
      '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    );
  });

  it('checks normalizeSource ens (object) #3', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { url: 'https://rinkeby.infura.io' } },
    });
    expect(resolution.ens?.network).toBe(4);
    expect(resolution.ens?.url).toBe('https://rinkeby.infura.io');
  });

  it('checks normalizeSource ens (object) #4', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { url: 'https://goerli.infura.io', network: 5 } },
    });
    expect(resolution.ens?.network).toBe(5);
    expect(resolution.ens?.url).toBe('https://goerli.infura.io');
    expect(resolution.ens?.registryAddress).toBe(
      '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    );
  });

  it('checks normalizeSource ens (object) #6', async () => {
    expect(
      () => new Resolution({ blockchain: { ens: { network: 7543 } } }),
    ).toThrowError('Unspecified url in Resolution ENS configuration');
  });

  it('checks normalizeSource ens (object) #7', async () => {
    expect(
      () => new Resolution({ blockchain: { ens: { network: 'invalid' } } }),
    ).toThrowError('Unspecified network in Resolution ENS configuration');
  });

  it('checks normalizeSource ens (object) #8', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { network: 'mainnet' } },
    });
    expect(resolution.ens?.network).toBe(1);
    expect(resolution.ens?.url).toBe('https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee');
  });

  it('checks normalizeSource ens (object) #9', async () => {
    expectConfigurationErrorCode(
      () => new Resolution({ blockchain: { ens: { network: 'kovan' } } }),
      ConfigurationErrorCode.UnspecifiedUrl,
    );
  });

  it('checks normalizeSource ens (object) #10', async () => {
    const resolution = new Resolution({
      blockchain: {
        ens: { registry: '0x314159265dd8dbb310642f98f50c066173c1259b' },
      },
    });
    expect(resolution.ens?.network).toBe(1);
    expect(resolution.ens?.url).toBe('https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee');
    expect(resolution.ens?.registryAddress).toBe(
      '0x314159265dd8dbb310642f98f50c066173c1259b',
    );
  });

  it('1111 checks normalizeSource ens (object) #11', async () => {
    const resolution = new Resolution({
      blockchain: {
        ens: {
          network: 'ropsten',
          registry: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
        },
      },
    });
    expect(resolution.ens?.network).toBe(3);
    expect(resolution.ens?.url).toBe('https://ropsten.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee');
    expect(resolution.ens?.registryAddress).toBe(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    );
  });

  it('checks normalizeSource ens (object) #12', async () => {
    const resolution = new Resolution({
      blockchain: {
        ens: { registry: '0xabcffff1231586348194fcabbeff1231240234fc' },
      },
    });

    expect(resolution.ens?.network).toBe(1);
    expect(resolution.ens?.url).toBe('https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee');
    expect(resolution.ens?.registryAddress).toBe(
      '0xabcffff1231586348194fcabbeff1231240234fc',
    );
  });

  it('checks normalizeSource ens (object) #13', async () => {
    expectConfigurationErrorCode(
      () =>
        new Resolution({
          blockchain: {
            ens: { network: 'custom', url: 'https://custom.notinfura.io' },
          },
        }),
      ConfigurationErrorCode.UnspecifiedNetwork,
    );
  });

  it('checks ens multicoin support #1', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x76a9144620b70031f0e9437e374a2100934fba4911046088ac',
    });
    const doge = await resolution.addr('testthing.eth', 'DOGE');
    expectSpyToBeCalled(eyes);
    expect(doge).toBe('DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD');
  });

  it('checks ens multicoin support #2', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0xa914e8604d28ef5d2a7caafe8741e5dd4816b7cb19ea87',
    });
    const ltc = await resolution.addr('testthing.eth', 'LTC');
    expectSpyToBeCalled(eyes);
    expect(ltc).toBe('MV5rN5EcX1imDS2gEh5jPJXeiW5QN8YrK3');
  });

  it('checks ens multicoin support #3', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const eth = await resolution.addr('testthing.eth', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(eth).toBe('0x314159265dD8dbb310642f98f50C066173C1259b');
  });

  it('checks ens multicoin support #4', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const etc = await resolution.addr('testthing.eth', 'etc');
    expectSpyToBeCalled(eyes);
    expect(etc).toBe('0x314159265dD8dbb310642f98f50C066173C1259b');
  });

  it('checks ens multicoin support #5', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const rsk = await resolution.addr('testthing.eth', 'rsk');
    expectSpyToBeCalled(eyes);
    expect(rsk).toBe('0x314159265dD8DbB310642F98f50C066173c1259B');
  });

  it('checks ens multicoin support #6', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod:
        '0x05444b4e9c06f24296074f7bc48f92a97916c6dc5ea9000000000000000000',
    });
    const xrp = await resolution.addr('testthing.eth', 'xrp');
    expectSpyToBeCalled(eyes);
    expect(xrp).toBe('X7qvLs7gSnNoKvZzNWUT2e8st17QPY64PPe7zriLNuJszeg');
  });

  it('checks ens multicoin support #7', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x76a91476a04053bda0a88bda5177b86a15c3b29f55987388ac',
    });
    const bch = await resolution.addr('testthing.eth', 'bch');
    expectSpyToBeCalled(eyes);
    expect(bch).toBe('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a');
  });

  it('checks ens multicoin support #8', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod:
        '0x5128751e76e8199196d454941c45d1b3a323f1433bd6751e76e8199196d454941c45d1b3a323f1433bd6',
    });
    const btc = await resolution.addr('testthing.eth', 'BTC');
    expectSpyToBeCalled(eyes);
    expect(btc).toBe(
      'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7k7grplx',
    );
  });

  // This is correct since bnb is not a real ticker from bip-44constants.
  // It is useful whe someone made a typo in ticker spellwriting
  // TODO to be removed in 2.0.0
  it('[Old test] checks UnsupportedCurrency error', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
    });
    await expectResolutionErrorCode(
      resolution.addressOrThrow('testthing.eth', 'bnb'),
      ResolutionErrorCode.UnsupportedCurrency,
    );
    expectSpyToBeCalled(eyes);
  });

  // TODO to be removed in 2.0.0
  it('[Old test] checks Resolution#addressOrThrow error #2', async () => {
    const resolution = new Resolution();
    const eyes = mockAsyncMethods(resolution.zns, {
      getRecordsAddresses: [
        'zil194qcjskuuxh6qtg8xw3qqrr3kdc6dtq8ct6j9s',
        '0xdac22230adfe4601f00631eae92df6d77f054891'
      ],
      fetchSubState: {
        records: {
          'crypto.BCH.address': 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
          'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
          'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
          'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
          'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
          'crypto.XMR.address': '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
          'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
          'crypto.ZIL.address': 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
          'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
          'ipfs.redirect_domain.value': 'www.unstoppabledomains.com'
        }
      }
    });
    await expectResolutionErrorCode(
      resolution.addressOrThrow('brad.zil', 'INVALID_CURRENCY_SYMBOL'),
      ResolutionErrorCode.UnspecifiedCurrency,
    );
    expectSpyToBeCalled(eyes);
  });

  it('checks UnsupportedCurrency error', async () => {
    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
    });
    await expectResolutionErrorCode(
      resolution.addr('testthing.eth', 'UNREALTICKER'),
      ResolutionErrorCode.UnsupportedCurrency,
    );
    expectSpyToBeCalled(eyes);
  });

  // TODO to be removed in 2.0.0
  it('[Old test]resolve to null for empty .eth record', async () => {
    expect(resolution.ens?.url).toBe(protocolLink(ProviderProtocol.http, NamingServiceName.ENS));
    expect(resolution.ens?.network).toEqual(1);

    const eyes = mockAsyncMethods(resolution.ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x'
    });

    expect(await resolution.address('qwdqwd.eth', 'XRP')).toEqual(null);
    expectSpyToBeCalled(eyes);
  });

  describe('.resolve', () => {
    it('passes without any errors', async () => {
      const eyes = mockAsyncMethods(resolution.ens, {
        getOwner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
        resolver: '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
        getTTL: 0,
        callMethod: '0x714ef33943d925731FBB89C99aF5780D888bD106',
      });
      const resolutionObj = await resolution.resolve('matthewgould.eth');
      expectSpyToBeCalled(eyes);
      expect(resolutionObj).toStrictEqual({
        addresses: { ETH: '0x714ef33943d925731FBB89C99aF5780D888bD106' },
        meta: {
          namehash:
            '0x2b53e3f567989ee41b897998d89eb4d8cf0715fb2cfb41a64939a532c09e495e',
          resolver: '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
          owner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
          type: 'ENS',
          ttl: 0,
        },
        records: {},
      });
    });

    it('returns undefined address', async () => {
      pendingInLive();
      const eyes = mockAsyncMethods(resolution.ens, {
        getOwner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
        resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
        getTTL: 0,
        fetchAddress: undefined
      });
      const result = await resolution.resolve('matthewgould.eth');
      expectSpyToBeCalled(eyes);
      expect(result).toStrictEqual({
        addresses: {},
        meta: {
          namehash:
            '0x2b53e3f567989ee41b897998d89eb4d8cf0715fb2cfb41a64939a532c09e495e',
          resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
          owner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
          type: 'ENS',
          ttl: 0,
        },
        records: {},
      });
    });

    it('should return correct resolver address', async () => {
      const spies = mockAsyncMethods(resolution.ens, {
        resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      });
      const resolverAddress = await resolution.resolver('monkybrain.eth');
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      );
    });

    it('should not find a resolver address', async () => {
      const spies = mockAsyncMethods(resolution.ens, {
        resolver: undefined
      });
      await expectResolutionErrorCode(
        resolution.resolver('empty.eth'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });

    it('usdt method s not supported by ens', async () => {
      await expectResolutionErrorCode(
        resolution.usdt('anyensdomain.eth', TickerVersion.EOS),
        ResolutionErrorCode.UnsupportedMethod
      );
    })
  });

  describe('.Hashing', () => {
    describe('.namehash', () => {
      it('supports root node', async () => {
        expect(resolution.isSupportedDomain('eth')).toEqual(true);
        expect(resolution.namehash('eth')).toEqual(
          '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
        );
      });

      it('should hash appropriately', async () => {
        expect(resolution.namehash('alice.eth')).toBe(
          '0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec',
        );
      });

      describe('.domain invalid format', () => {
        it('starts with -', async () => {
          expect(resolution.isSupportedDomain('-hello.eth')).toEqual(
            false,
          );
          await expectResolutionErrorCode(
            () => resolution.namehash('-hello.eth'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });

        it('ends with -', async () => {
          expect(resolution.isSupportedDomain('hello-.eth')).toEqual(false);
          await expectResolutionErrorCode(
            () => resolution.namehash('hello-.eth'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });

        it('starts and ends with -', async () => {
          expect(resolution.isSupportedDomain('-hello-.eth')).toEqual(false);
          await expectResolutionErrorCode(
            () => resolution.namehash('-hello-.eth'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });
      });
    });

    describe('.childhash', () => {
      it('tests childhash functionality', () => {
        const domain = 'hello.world.eth';
        const namehash = resolution.namehash(domain);
        const childhash = resolution.childhash(
          resolution.namehash('world.eth'),
          'hello',
          NamingServiceName.ENS,
        );
        expect(childhash).toBe(namehash);
      });

      it('checks root eth domain', () => {
        const rootHash =
          '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae';
        expect(resolution.namehash('eth')).toBe(rootHash);
        expect(
          resolution.childhash(
            '0000000000000000000000000000000000000000000000000000000000000000',
            'eth',
            NamingServiceName.ENS,
          ),
        ).toBe(rootHash);
      });

      it('checks childhash multi level domain', () => {
        const domain = 'ich.ni.san.yon.hello.world.eth';
        const namehash = resolution.namehash(domain);
        const childhash = resolution.childhash(
          resolution.namehash('ni.san.yon.hello.world.eth'),
          'ich',
          NamingServiceName.ENS,
        );
        expect(childhash).toBe(namehash);
      });
    });
  });

  describe('.Metadata', () => {
    it('should return a valid ipfsHash', async () => {
      const eyes = mockAsyncMethods(resolution.ens, {
        resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
        callMethod:
          '0xe301017012208723b9b5834fe60801e19af3a3554a6f229dad9cfbb18ce4e80ffc2a457f83aa',
      });
      const ipfsHash = await resolution.ipfsHash('monkybrain.eth');
      expectSpyToBeCalled(eyes);
      expect(ipfsHash).toBe('QmXSBLw6VMegqkCHSDBPg7xzfLhUyuRBzTb927KVzKC1vq');
    });

    // todo(johny) find some domains with url property set
    it('should not find an appropriate httpUrl', async () => {
      const eyes = mockAsyncMethods(resolution.ens, {
        resolver: '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
        callMethod: '',
      });
      await expectResolutionErrorCode(
        resolution.httpUrl('matthewgould.eth'),
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(eyes);
    });

    it('should return resolution error for not finding the email', async () => {
      const eyes = mockAsyncMethods(resolution.ens, {
        resolver: '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
        callMethod: '',
      });
      const emailPromise = resolution.email('matthewgould.eth');
      await expectResolutionErrorCode(
        emailPromise,
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(eyes);
    });

    it('should resolve gundb id and public key', async () => {
      const eyes = mockAsyncMethods(resolution.ens, {
        resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
        callMethod:
          '0x7e1d12f34e038a2bda3d5f6ee0809d72f668c357d9e64fd7f622513f06ea652146ab5fdee35dc4ce77f1c089fd74972691fccd48130306d9eafcc6e1437d1ab21b',
      });
      const chatId = await resolution
        .chatId('crunk.eth')
        .catch(err => err.code);
      expectSpyToBeCalled(eyes);
      expect(chatId).toBe(
        '0x7e1d12f34e038a2bda3d5f6ee0809d72f668c357d9e64fd7f622513f06ea652146ab5fdee35dc4ce77f1c089fd74972691fccd48130306d9eafcc6e1437d1ab21b',
      );
    });

    it('should resolve gundb public key', async () => {
      const eyes = mockAsyncMethods(resolution.ens, {
        resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
        callMethod:
          'yxbMDgFrzemQEcDwJYccE_TDbGmRL_iqZ2JhQxYi2s8.nBEAyMfM2ZBtOf2C-GHe3zEn42Q1vrfPAVqNzgGhXvQ',
      });
      const publicKey = await resolution
        .chatPk('crunk.eth')
        .catch(err => err.code);
      expectSpyToBeCalled(eyes);
      expect(publicKey).toBe(
        'yxbMDgFrzemQEcDwJYccE_TDbGmRL_iqZ2JhQxYi2s8.nBEAyMfM2ZBtOf2C-GHe3zEn42Q1vrfPAVqNzgGhXvQ',
      );
    });

    it('should return resolution error for not finding the gundb chat id', async () => {
      const eyes = mockAsyncMethods(resolution.ens, {
        resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
        callMethod: undefined,
      });
      const emailPromise = resolution.chatId('test.eth');
      await expectResolutionErrorCode(
        emailPromise,
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(eyes);
    });

    it('should return resolution error for not finding the gundb publicKey', async () => {
      const eyes = mockAsyncMethods(resolution.ens, {
        resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
        callMethod: undefined,
      });
      const emailPromise = resolution.chatPk('test.eth');
      await expectResolutionErrorCode(
        emailPromise,
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(eyes);
    });
  });
});
