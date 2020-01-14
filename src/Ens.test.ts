import nock from 'nock';
import Resolution, { ResolutionErrorCode, ResolutionError } from '.';
import Ens from './ens';
import { NullAddress } from './types';
import {
  mockAsyncMethod,
  mockAsyncMethods,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
  MainnetUrl,
  secretInfuraLink,
} from './utils/testHelpers';
import dotenv from 'dotenv';

dotenv.config();
beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

describe('ENS', () => {
  it('allows ens network specified as string', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { network: 'mainnet' } },
    });
    expect(resolution.ens.url).toBe('https://mainnet.infura.io');
    expect(resolution.ens.network).toEqual('mainnet');
  });

  it('resolves .eth name using blockchain', async () => {
    const resolution = new Resolution({
      blockchain: { ens: true },
    });
    expect(resolution.ens.url).toBe('https://mainnet.infura.io');
    expect(resolution.ens.network).toEqual('mainnet');

    const eyes = mockAsyncMethods(resolution.ens, {
      getOwner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
      getResolver: '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
      fetchAddressOrThrow: '0x714ef33943d925731FBB89C99aF5780D888bD106',
    });

    expect(await resolution.address('matthewgould.eth', 'ETH')).toEqual(
      '0x714ef33943d925731FBB89C99aF5780D888bD106',
    );
    expect(await resolution.owner('matthewgould.eth')).toEqual(
      '0x714ef33943d925731FBB89C99aF5780D888bD106',
    );
    expectSpyToBeCalled(eyes);
  });

  it('reverses address to ENS domain', async () => {
    const ens = new Ens(MainnetUrl);
    const eyes = mockAsyncMethods(ens, {
      resolverCallToName: 'adrian.argent.xyz',
      getResolver: '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890',
    });
    const result = await ens.reverse(
      '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
      'ETH',
    );
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('adrian.argent.xyz');
  });

  it('reverses address to ENS domain null', async () => {
    const ens = new Ens(MainnetUrl);
    const spy = mockAsyncMethod(ens, 'getResolver', NullAddress[1]);
    const result = await ens.reverse(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
      'ETH',
    );
    expectSpyToBeCalled([spy]);
    expect(result).toEqual(null);
  });

  it('resolves .xyz name using ENS blockchain', async () => {
    const resolution = new Resolution({
      blockchain: { ens: MainnetUrl },
    });

    const eyes = mockAsyncMethods(resolution.ens, {
      getOwner: '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
      getResolver: '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890',
      fetchAddressOrThrow: '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
    });

    const result = await resolution.address('adrian.argent.xyz', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('0xb0E7a465D255aE83eb7F8a50504F3867B945164C');
  });

  it('resolves .luxe name using ENS blockchain', async () => {
    const resolution = new Resolution({
      blockchain: { ens: MainnetUrl },
    });

    const eyes = mockAsyncMethods(resolution.ens, {
      getOwner: '0xf3dE750A73C11a6a2863761E930BF5fE979d5663',
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      fetchAddressOrThrow: '0xf3dE750A73C11a6a2863761E930BF5fE979d5663',
    });

    const result = await resolution.address('john.luxe', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('0xf3dE750A73C11a6a2863761E930BF5fE979d5663');
  });

  it('resolves .luxe name using ENS blockchain with safe null return', async () => {
    const resolution = new Resolution({
      blockchain: { ens: MainnetUrl },
    });

    const ownerEye = mockAsyncMethod(
      resolution.ens,
      'getOwner',
      NullAddress[1],
    );
    const result = await resolution.address('something.luxe', 'ETH');
    expectSpyToBeCalled([ownerEye]);
    expect(result).toEqual(null);
  });

  it('resolves .luxe name using ENS blockchain with thrown error', async () => {
    const resolution = new Resolution({
      blockchain: { ens: MainnetUrl },
    });
    await expectResolutionErrorCode(
      resolution.addressOrThrow('something.luxe', 'ETH'),
      ResolutionErrorCode.UnregisteredDomain,
    );
  });

  it('resolves name with resolver but without an owner', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: NullAddress[1],
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x76a9144620b70031f0e9437e374a2100934fba4911046088ac',
    });
    const doge = await ens.address('testthing.eth', 'DOGE');
    expectSpyToBeCalled(eyes);
    expect(doge).toBe('DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD');
  });

  it('checks if the network is supported(true)', async () => {
    const ens = new Ens({ network: 1 });
    const answer = ens.isSupportedNetwork();
    expect(answer).toBe(true);
  });

  it('checks if the network is supported(false)', async () => {
    const ens = new Ens({ network: 5 });
    const answer = ens.isSupportedNetwork();
    expect(answer).toBe(false);
  });

  it('checks normalizeSource ens (boolean)', async () => {
    const resolution = new Resolution({ blockchain: { ens: true } });
    expect(resolution.ens.network).toBe('mainnet');
    expect(resolution.ens.url).toBe('https://mainnet.infura.io');
  });

  it('checks normalizeSource ens (boolean - false)', async () => {
    const ens = new Ens({ network: 5 });
    expect(ens.network).toBe('goerli');
    expect(ens.url).toBe('https://goerli.infura.io');
    expect(ens.isSupportedNetwork()).toBeFalsy();
  });

  it('checks normalizeSource ens (object) #1', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { url: 'https://mainnet.infura.io' } },
    });
    expect(resolution.ens.network).toBe('mainnet');
    expect(resolution.ens.url).toBe('https://mainnet.infura.io');
  });

  it('checks normalizeSource ens (object) #2', async () => {
    const resolution = new Resolution({ blockchain: { ens: { network: 3 } } });
    expect(resolution.ens.network).toBe('ropsten');
    expect(resolution.ens.url).toBe('https://ropsten.infura.io');
    expect(resolution.ens.registryAddress).toBe(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    );
  });

  it('checks normalizeSource ens (object) #3', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { url: 'https://rinkeby.infura.io' } },
    });
    expect(resolution.ens.network).toBe('rinkeby');
    expect(resolution.ens.url).toBe('https://rinkeby.infura.io');
  });

  it('checks normalizeSource ens (object) #4', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { url: 'https://goerli.infura.io', network: 5 } },
    });
    expect(resolution.ens.network).toBe('goerli');
    expect(resolution.ens.url).toBe('https://goerli.infura.io');
    expect(resolution.ens.registryAddress).toBeUndefined();
  });

  it('checks normalizeSource ens (object) #6', async () => {
    expect(
      () => new Resolution({ blockchain: { ens: { network: 7543 } } }),
    ).toThrowError('Unspecified network in Resolution ENS configuration');
  });

  it('checks normalizeSource ens (object) #7', async () => {
    expect(
      () => new Resolution({ blockchain: { ens: { network: 'invalid' } } }),
    ).toThrowError('Unspecified url in Resolution ENS configuration');
  });

  it('checks normalizeSource ens (object) #8', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { network: 'mainnet' } },
    });
    expect(resolution.ens.network).toBe('mainnet');
    expect(resolution.ens.url).toBe('https://mainnet.infura.io');
  });

  it('checks normalizeSource ens (object) #9', async () => {
    const resolution = new Resolution({
      blockchain: { ens: { network: 'kovan' } },
    });
    expect(resolution.ens.network).toBe('kovan');
    expect(resolution.ens.url).toBe('https://kovan.infura.io');
  });

  it('checks normalizeSource ens (object) #10', async () => {
    const resolution = new Resolution({
      blockchain: {
        ens: { registry: '0x314159265dd8dbb310642f98f50c066173c1259b' },
      },
    });
    expect(resolution.ens.network).toBe('mainnet');
    expect(resolution.ens.url).toBe('https://mainnet.infura.io');
    expect(resolution.ens.registryAddress).toBe(
      '0x314159265dd8dbb310642f98f50c066173c1259b',
    );
  });

  it('checks normalizeSource ens (object) #11', async () => {
    const resolution = new Resolution({
      blockchain: {
        ens: {
          network: 'ropsten',
          registry: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
        },
      },
    });
    expect(resolution.ens.network).toBe('ropsten');
    expect(resolution.ens.url).toBe('https://ropsten.infura.io');
    expect(resolution.ens.registryAddress).toBe(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    );
  });

  it('checks normalizeSource ens (object) #12', async () => {
    const resolution = new Resolution({
      blockchain: {
        ens: { registry: '0xabcffff1231586348194fcabbeff1231240234fc' },
      },
    });

    expect(resolution.ens.network).toBe('mainnet');
    expect(resolution.ens.url).toBe('https://mainnet.infura.io');
    expect(resolution.ens.registryAddress).toBe(
      '0xabcffff1231586348194fcabbeff1231240234fc',
    );
  });

  it('checks normalizeSource ens (object) #13', async () => {
    const resolution = new Resolution({
      blockchain: {
        ens: { network: 'custom', url: 'https://custom.notinfura.io' },
      },
    });
    expect(resolution.ens.network).toBe('custom');
    expect(resolution.ens.url).toBe('https://custom.notinfura.io');
    expect(resolution.ens.registryAddress).toBeUndefined();
  });

  it('checks ens multicoin support #1', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x76a9144620b70031f0e9437e374a2100934fba4911046088ac',
    });
    const doge = await ens.address('testthing.eth', 'DOGE');
    expectSpyToBeCalled(eyes);
    expect(doge).toBe('DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD');
  });

  it('checks ens multicoin support #2', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0xa914e8604d28ef5d2a7caafe8741e5dd4816b7cb19ea87',
    });
    const ltc = await ens.address('testthing.eth', 'LTC');
    expectSpyToBeCalled(eyes);
    expect(ltc).toBe('MV5rN5EcX1imDS2gEh5jPJXeiW5QN8YrK3');
  });

  it('checks ens multicoin support #3', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const eth = await ens.address('testthing.eth', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(eth).toBe('0x314159265dD8dbb310642f98f50C066173C1259b');
  });

  it('checks ens multicoin support #4', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const etc = await ens.address('testthing.eth', 'etc');
    expectSpyToBeCalled(eyes);
    expect(etc).toBe('0x314159265dD8dbb310642f98f50C066173C1259b');
  });

  it('checks ens multicoin support #5', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const rsk = await ens.address('testthing.eth', 'rsk');
    expectSpyToBeCalled(eyes);
    expect(rsk).toBe('0x314159265dD8DbB310642F98f50C066173c1259B');
  });

  it('checks ens multicoin support #6', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod:
        '0x05444b4e9c06f24296074f7bc48f92a97916c6dc5ea9000000000000000000',
    });
    const xrp = await ens.address('testthing.eth', 'xrp');
    expectSpyToBeCalled(eyes);
    expect(xrp).toBe('X7qvLs7gSnNoKvZzNWUT2e8st17QPY64PPe7zriLNuJszeg');
  });

  it('checks ens multicoin support #7', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod: '0x76a91476a04053bda0a88bda5177b86a15c3b29f55987388ac',
    });
    const bch = await ens.address('testthing.eth', 'bch');
    expectSpyToBeCalled(eyes);
    expect(bch).toBe('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a');
  });

  it('checks ens multicoin support #8', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      callMethod:
        '0x5128751e76e8199196d454941c45d1b3a323f1433bd6751e76e8199196d454941c45d1b3a323f1433bd6',
    });
    const btc = await ens.address('testthing.eth', 'BTC');
    expectSpyToBeCalled(eyes);
    expect(btc).toBe(
      'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7k7grplx',
    );
  });

  it('checks UnsupportedCurrency error', async () => {
    await expectResolutionErrorCode(
      new Resolution({blockchain: {ens: {url: secretInfuraLink()}}}).addressOrThrow('testthing.eth', 'bnb'),
      ResolutionErrorCode.UnsupportedCurrency,
    );
  });

  it('checks UnsupportedCurrency error', async () => {
    await expectResolutionErrorCode(
      new Resolution({blockchain: {ens: {url: secretInfuraLink()}}}).addressOrThrow('testthing.eth', 'UNREALTICKER'),
      ResolutionErrorCode.UnsupportedCurrency,
    );
  });

  describe('.resolve', () => {
    it('passes without any errors', async () => {
      const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}});
      const eyes = mockAsyncMethods(resolution.ens, {
        getOwner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
        getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
        getTTL: 0,
        callMethod: '0x714ef33943d925731FBB89C99aF5780D888bD106',
      });
      const resolutionObj = await resolution.resolve('matthewgould.eth');
      expectSpyToBeCalled(eyes);
      expect(resolutionObj).toStrictEqual({
        addresses: { ETH: '0x714ef33943d925731FBB89C99aF5780D888bD106' },
        meta: {
          owner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
          type: 'ENS',
          ttl: 0,
        },
      });
    });

    it('returns undefined address', async () => {
      const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}})
      const eyes = mockAsyncMethods(resolution.ens, {
        getOwner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
        getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
        getTTL: 0,
        fetchAddressOrThrow: new ResolutionError(
          ResolutionErrorCode.RecordNotFound,
        ),
      });
      const result = await resolution.resolve('matthewgould.eth');
      expectSpyToBeCalled(eyes);
      expect(result).toStrictEqual({
        addresses: { ETH: null },
        meta: {
          owner: '0x714ef33943d925731FBB89C99aF5780D888bD106',
          type: 'ENS',
          ttl: 0,
        },
      });
    });
  });

  describe('.Hashing', () => {
    describe('.namehash', () => {
      it('supports root node', async () => {
        const ens = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}}).ens;
        expect(ens.isSupportedDomain('eth')).toEqual(true);
        expect(ens.namehash('eth')).toEqual(
          '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
        );
      });

      it('should hash appropriately', async () => {
        const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}});
        expect(resolution.ens.namehash('alice.eth')).toBe(
          '0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec',
        );
      });

      describe('.domain invalid format', () => {
        it('starts with -', async () => {
          const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}});
          expect(resolution.ens.isSupportedDomain('-hello.eth')).toEqual(false);
          expectResolutionErrorCode(
            () => resolution.namehash('-hello.eth'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });

        it('ends with -', async () => {
          const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}});
          expect(resolution.isSupportedDomain('hello-.eth')).toEqual(false);
          expectResolutionErrorCode(
            () => resolution.namehash('hello-.eth'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });

        it('starts and ends with -', async () => {
          const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}});
          expect(resolution.isSupportedDomain('-hello-.eth')).toEqual(false);
          expectResolutionErrorCode(
            () => resolution.namehash('-hello-.eth'),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });
      });
    });

    describe('.childhash', () => {
      it('tests childhash functionality', () => {
        const ens = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}}).ens;
        const domain = 'hello.world.eth';
        const namehash = ens.namehash(domain);
        const childhash = ens.childhash(ens.namehash('world.eth'), 'hello');
        expect(childhash).toBe(namehash);
      });

      it('checks root eth domain', () => {
        const ens = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}}).ens;
        const rootHash =
          '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae';
        expect(ens.namehash('eth')).toBe(rootHash);
        expect(
          ens.childhash(
            '0000000000000000000000000000000000000000000000000000000000000000',
            'eth',
          ),
        ).toBe(rootHash);
      });

      it('checks childhash multi level domain', () => {
        const ens = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}}).ens;
        const domain = 'ich.ni.san.yon.hello.world.eth';
        const namehash = ens.namehash(domain);
        const childhash = ens.childhash(
          ens.namehash('ni.san.yon.hello.world.eth'),
          'ich',
        );
        expect(childhash).toBe(namehash);
      });
    });
  });

  describe('metadata', () => {
    it('should return a valid ipfsHash', async () => {
      const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}});
      const eyes = mockAsyncMethods(resolution.ens, {
        getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
        callMethod:
          '0xe3010170122058cf8d62a59dff0d7aa81492b66d262f27a8a684767238209243ad0309ecff5e',
      });
      const ipfsHash = await resolution.ipfsHash('almonit.eth');
      expectSpyToBeCalled(eyes);
      expect(ipfsHash).toBe('QmUKL9VYzSvM9bSZQPgExtALCrRhK2VLFNjzsXLNRcbaGM');
    });

    //todo(johny) find some domains with url property set
    it('should return appropriate httpUrl', async () => {
      const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}});
      const httpUrlPromise = resolution.httpUrl('matthewgould.eth');
      await expectResolutionErrorCode(
        httpUrlPromise,
        ResolutionErrorCode.RecordNotFound,
      );
    });

    it('should return resolution error for not finding the email', async () => {
      const resolution = new Resolution({blockchain: {ens: {url: secretInfuraLink()}}});
      const eyes = mockAsyncMethods(resolution.ens, {getResolver:'0x5FfC014343cd971B7eb70732021E26C35B744cc4', callMethod: '' });
      const emailPromise = resolution.email('matthewgould.eth');
      expectSpyToBeCalled(eyes);
      await expectResolutionErrorCode(
        emailPromise,
        ResolutionErrorCode.RecordNotFound,
      );
    });
  });
});
