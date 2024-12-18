import nock from 'nock';
import Resolution, {NamingServiceName, ResolutionErrorCode} from '../index';
import {NullAddress} from '../types';
import {
  expectResolutionErrorCode,
  expectSpyToBeCalled,
  mockAsyncMethods,
  getProtocolLinkFromEnv,
  ProviderProtocol,
  skipItInLive,
  ETH_L1_TESTNET_NAME,
} from './helpers';
import Ens from '../Ens';
import {EthereumNetworks} from '../utils';

describe('ENS', () => {
  let resolution: Resolution;
  let ens: Ens;

  beforeEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();

    resolution = new Resolution({
      sourceConfig: {
        ens: {
          url: getProtocolLinkFromEnv(
            ProviderProtocol.http,
            NamingServiceName.ENS,
          ),
          network: ETH_L1_TESTNET_NAME,
        },
      },
    });
    ens = resolution.serviceMap[NamingServiceName.ENS].native as Ens;
  });

  it('allows ens network specified as string', async () => {
    expect(ens.url).toBe(
      getProtocolLinkFromEnv(ProviderProtocol.http, NamingServiceName.ENS),
    );
    expect(ens.network).toEqual(EthereumNetworks[ETH_L1_TESTNET_NAME]);
  });

  it('resolves .eth name using blockchain', async () => {
    expect(ens.url).toBe(
      getProtocolLinkFromEnv(ProviderProtocol.http, NamingServiceName.ENS),
    );
    expect(ens.network).toEqual(EthereumNetworks[ETH_L1_TESTNET_NAME]);

    const eyes = mockAsyncMethods(ens, {
      resolver: '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
      fetchAddress: '0xa59C818Ddb801f1253edEbf0Cf08c9E481EA2fE5',
    });
    const spy = mockAsyncMethods(ens, {
      owner: '0xa59C818Ddb801f1253edEbf0Cf08c9E481EA2fE5',
    });
    expect(await resolution.addr('matthewgould.eth', 'ETH')).toEqual(
      '0xa59C818Ddb801f1253edEbf0Cf08c9E481EA2fE5',
    );
    expect(await resolution.owner('matthewgould.eth')).toEqual(
      '0xa59C818Ddb801f1253edEbf0Cf08c9E481EA2fE5',
    );
    expectSpyToBeCalled(eyes);
    expectSpyToBeCalled(spy, 1);
  });

  skipItInLive('reverses address to ENS domain', async () => {
    const eyes = mockAsyncMethods(ens, {
      reverseRegistrarCallToNode:
        '0x4da70a332a7a98a58486f551a455b1398ce309d9bd3a4f0800da4eec299829a4',
      callMethod: '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890',
      resolverCallToAddr: '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
      resolverCallToName: 'adrian.argent.eth',
    });
    const result = await ens?.reverseOf(
      '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
    );
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('adrian.argent.eth');
  });

  it('reverses address to ENS domain null', async () => {
    const spy = mockAsyncMethods(ens, {
      reverseRegistrarCallToNode:
        '0x4da70a332a7a98a58486f551a455b1398ce309d9bd3a4f0800da4eec299829a4',
      callMethod: NullAddress,
    });
    const result = await ens?.reverseOf(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    );
    expectSpyToBeCalled(spy);
    expect(result).toEqual(null);
  });

  it('resolves name with resolver but without an owner', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress: 'DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD',
    });
    const doge = await resolution.addr('testthing.eth', 'DOGE');
    expectSpyToBeCalled(eyes);
    expect(doge).toBe('DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD');
  });

  it('checks normalizeSource ens (object)', async () => {
    expect(ens.network).toBe(EthereumNetworks[ETH_L1_TESTNET_NAME]);
    expect(ens.url).toBe(
      getProtocolLinkFromEnv(ProviderProtocol.http, NamingServiceName.ENS),
    );
    expect(ens.registryContract.address).toBe(
      '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    );
  });

  it('normalizeSource ens (object) should throw error', async () => {
    expect(
      () =>
        new Resolution({
          sourceConfig: {
            ens: {network: 'notRealNetwork'},
          },
        }),
    ).toThrowError(
      'Missing configuration in Resolution ENS. Please specify registryAddress when using a custom network',
    );
  });

  it('checks normalizeSource ens (object) #13', async () => {
    expect(
      () =>
        new Resolution({
          sourceConfig: {
            ens: {network: 'custom', url: 'https://custom.notinfura.io'},
          },
        }),
    ).toThrowError(
      'Missing configuration in Resolution ENS. Please specify registryAddress when using a custom network',
    );
  });

  it('checks ens multicoin support #1', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress: 'DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD',
    });
    const doge = await resolution.addr('testthing.eth', 'DOGE');
    expectSpyToBeCalled(eyes);
    expect(doge).toBe('DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD');
  });

  it('checks ens multicoin support #2', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress: 'MV5rN5EcX1imDS2gEh5jPJXeiW5QN8YrK3',
    });
    const ltc = await resolution.addr('testthing.eth', 'LTC');
    expectSpyToBeCalled(eyes);
    expect(ltc).toBe('MV5rN5EcX1imDS2gEh5jPJXeiW5QN8YrK3');
  });

  it('checks ens multicoin support #3', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress: '0x314159265dD8dbb310642f98f50C066173C1259b',
    });
    const eth = await resolution.addr('testthing.eth', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(eth).toBe('0x314159265dD8dbb310642f98f50C066173C1259b');
  });

  it('checks ens multicoin support #4', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress: '0x314159265dD8dbb310642f98f50C066173C1259b',
    });
    const etc = await resolution.addr('testthing.eth', 'etc');
    expectSpyToBeCalled(eyes);
    expect(etc).toBe('0x314159265dD8dbb310642f98f50C066173C1259b');
  });

  it('checks ens multicoin support #5', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress: '0x314159265dD8DbB310642F98f50C066173c1259B',
    });
    const rsk = await resolution.addr('testthing.eth', 'rsk');
    expectSpyToBeCalled(eyes);
    expect(rsk).toBe('0x314159265dD8DbB310642F98f50C066173c1259B');
  });

  it('checks ens multicoin support #6', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress: 'X7qvLs7gSnNoKvZzNWUT2e8st17QPY64PPe7zriLNuJszeg',
    });
    const xrp = await resolution.addr('testthing.eth', 'xrp');
    expectSpyToBeCalled(eyes);
    expect(xrp).toBe('X7qvLs7gSnNoKvZzNWUT2e8st17QPY64PPe7zriLNuJszeg');
  });

  it('checks ens multicoin support #7', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress: 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a',
    });
    const bch = await resolution.addr('testthing.eth', 'bch');
    expectSpyToBeCalled(eyes);
    expect(bch).toBe('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a');
  });

  it('checks ens multicoin support #8', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      fetchAddress:
        'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7k7grplx',
    });
    const btc = await resolution.addr('testthing.eth', 'BTC');
    expectSpyToBeCalled(eyes);
    expect(btc).toBe(
      'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7k7grplx',
    );
  });

  it('checks UnsupportedCurrency error', async () => {
    const eyes = mockAsyncMethods(ens, {
      resolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
    });
    await expectResolutionErrorCode(
      resolution.addr('testthing.eth', 'UNREALTICKER'),
      ResolutionErrorCode.UnsupportedCurrency,
    );
    expectSpyToBeCalled(eyes);
  });

  describe('.resolve', () => {
    it('should return correct resolver address', async () => {
      const spies = mockAsyncMethods(ens, {
        resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      });
      const resolverAddress = await resolution.resolver('monkybrain.eth');
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      );
    });

    it('should not find a resolver address', async () => {
      const spies = mockAsyncMethods(ens, {
        resolver: undefined,
      });
      await expectResolutionErrorCode(
        resolution.resolver('empty.eth'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });
  });

  describe('.Hashing', () => {
    describe('.namehash', () => {
      it('supports root node', async () => {
        expect(await resolution.isSupportedDomain('eth')).toEqual(true);
        expect(resolution.namehash('eth', NamingServiceName.ENS)).toEqual(
          '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
        );
      });

      it('should hash appropriately', async () => {
        expect(resolution.namehash('alice.eth', NamingServiceName.ENS)).toBe(
          '0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec',
        );
      });
    });
  });

  describe('.Metadata', () => {
    it('should return a valid ipfsHash', async () => {
      const eyes = mockAsyncMethods(ens, {
        resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
        callMethod:
          '0xe301017012208723b9b5834fe60801e19af3a3554a6f229dad9cfbb18ce4e80ffc2a457f83aa',
      });
      const ipfsHash = await resolution.ipfsHash('monkybrain.eth');
      expectSpyToBeCalled(eyes);
      expect(ipfsHash).toBe(
        'ipfs://QmXSBLw6VMegqkCHSDBPg7xzfLhUyuRBzTb927KVzKC1vq',
      );
    });

    // todo(johny) find some domains with url property set
    it('should not find an appropriate httpUrl', async () => {
      const eyes = mockAsyncMethods(ens, {
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
      const eyes = mockAsyncMethods(ens, {
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
      const eyes = mockAsyncMethods(ens, {
        resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
        callMethod:
          '0x7e1d12f34e038a2bda3d5f6ee0809d72f668c357d9e64fd7f622513f06ea652146ab5fdee35dc4ce77f1c089fd74972691fccd48130306d9eafcc6e1437d1ab21b',
      });
      const chatId = await resolution
        .chatId('crunk.eth')
        .catch((err) => err.code);
      expectSpyToBeCalled(eyes);
      expect(chatId).toBe(
        '0x7e1d12f34e038a2bda3d5f6ee0809d72f668c357d9e64fd7f622513f06ea652146ab5fdee35dc4ce77f1c089fd74972691fccd48130306d9eafcc6e1437d1ab21b',
      );
    });

    it('should resolve gundb public key', async () => {
      const eyes = mockAsyncMethods(ens, {
        resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
        callMethod:
          'yxbMDgFrzemQEcDwJYccE_TDbGmRL_iqZ2JhQxYi2s8.nBEAyMfM2ZBtOf2C-GHe3zEn42Q1vrfPAVqNzgGhXvQ',
      });
      const publicKey = await resolution
        .chatPk('crunk.eth')
        .catch((err) => err.code);
      expectSpyToBeCalled(eyes);
      expect(publicKey).toBe(
        'yxbMDgFrzemQEcDwJYccE_TDbGmRL_iqZ2JhQxYi2s8.nBEAyMfM2ZBtOf2C-GHe3zEn42Q1vrfPAVqNzgGhXvQ',
      );
    });

    it('should return resolution error for not finding the gundb chat id', async () => {
      const eyes = mockAsyncMethods(ens, {
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
      const eyes = mockAsyncMethods(ens, {
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
