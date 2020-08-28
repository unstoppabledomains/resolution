import nock from 'nock';
import Resolution, { ResolutionErrorCode } from './index';
import {
  UnclaimedDomainResponse,
  NamingServiceName,
  JsonRpcPayload,
} from './types';
import { JsonRpcProvider, getDefaultProvider } from '@ethersproject/providers';
import Web3HttpProvider from 'web3-providers-http';
import Web3WsProvider from 'web3-providers-ws';
import Web3V027Provider from 'web3-0.20.7/lib/web3/httpprovider';

import {
  expectResolutionErrorCode,
  expectSpyToBeCalled,
  mockAsyncMethods,
  protocolLink,
  ProviderProtocol,
  caseMock,
  mockAsyncMethod,
} from './tests/helpers';

try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch (err) {
  console.warn('dotenv is not installed');
}

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

describe('Resolution', () => {
  it('should get a valid resolution instance', async () => {
    const resolution = Resolution.infura('api-key');
    expect(resolution.ens).toBeDefined();
    expect(resolution.ens!.url).toBe(`https://mainnet.infura.com/v3/api-key`);

    expect(resolution.cns).toBeDefined();
    expect(resolution.cns!.url).toBe(`https://mainnet.infura.com/v3/api-key`);
  });

  it('checks Resolution#addressOrThrow error #1', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      resolution.addressOrThrow('sdncdoncvdinvcsdncs.zil', 'ZIL'),
      ResolutionErrorCode.UnregisteredDomain,
    );
  });

  it('checks Resolution#addressOrThrow error #2', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      resolution.addressOrThrow('brad.zil', 'INVALID_CURRENCY_SYMBOL'),
      ResolutionErrorCode.UnspecifiedCurrency,
    );
  });

  it('resolves non-existing domain zone with throw', async () => {
    const resolution = new Resolution({ blockchain: true });
    await expectResolutionErrorCode(
      resolution.addressOrThrow('bogdangusiev.qq', 'ZIL'),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it('resolves non-existing domain zone via safe address', async () => {
    const resolution = new Resolution({ blockchain: true });
    const result = await resolution.address('bogdangusiev.qq', 'ZIL');
    expect(result).toEqual(null);
  });

  it('provides empty response constant', async () => {
    const response = UnclaimedDomainResponse;
    expect(response.addresses).toEqual({});
    expect(response.meta.owner).toEqual(null);
  });

  it('checks the isSupportedDomainInNetwork', async () => {
    const resolution = new Resolution();
    const result = resolution.isSupportedDomainInNetwork('brad.zil');
    expect(result).toBe(true);
  });

  it('checks namehash for unsupported domain', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      () => resolution.namehash('something.hello.com'),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it('checks return of IPFS hash for brad.zil', async () => {
    const resolution = new Resolution();
    const spies = mockAsyncMethods(resolution.zns, {
      records: {
        'crypto.BCH.address': 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
        'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
        'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
        'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
        'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
        'crypto.XMR.address':
          '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
        'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
        'crypto.ZIL.address': 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
      },
    });
    const hash = await resolution.ipfsHash('brad.zil');
    expectSpyToBeCalled(spies);
    expect(hash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('checks return of email for ergergergerg.zil', async () => {
    const resolution = new Resolution();
    const email = await resolution.email('ergergergerg.zil');
    expect(email).toBe('matt+test@unstoppabledomains.com');
  });

  it('checks error for  email on brad.zil', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      resolution.email('brad.zil'),
      ResolutionErrorCode.RecordNotFound,
    );
  });

  it('should be invalid domain', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      () => resolution.namehash('-hello.eth'),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it('should be invalid domain 2', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      () => resolution.namehash('whatever-.eth'),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it('should be invalid domain 3', async () => {
    const cnsInvalidDomain = 'hello..crypto';
    const ensInvalidDomain = 'hello..eth';
    const znsInvalidDomain = 'hello..zil';
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      () => resolution.namehash(cnsInvalidDomain),
      ResolutionErrorCode.UnsupportedDomain,
    );
    await expectResolutionErrorCode(
      () => resolution.namehash(ensInvalidDomain),
      ResolutionErrorCode.UnsupportedDomain,
    );
    await expectResolutionErrorCode(
      () => resolution.namehash(znsInvalidDomain),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it(`domains "brad.crypto" and "Brad.crypto" should return the same results`, async () => {
    const resolution = new Resolution({
      blockchain: {
        cns: { url: protocolLink(), registry: '0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe' },
      },
    });
    const reader = await resolution.cns.getReader();
    const eyes = mockAsyncMethods(reader, {
      record: {
        resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
        values: ['0x45b31e01AA6f42F0549aD482BE81635ED3149abb'],
      },
    });
    const capital = await resolution.addressOrThrow('Brad.crypto', 'eth');
    expectSpyToBeCalled(eyes);
    const lower = await resolution.addressOrThrow('brad.crypto', 'eth');
    expectSpyToBeCalled(eyes);
    expect(capital).toStrictEqual(lower);
  });

  it('should resolve gundb chat id', async () => {
    const resolution = new Resolution({
      blockchain: {
        cns: { url: protocolLink(), registry: '0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe' },
      },
    });
    const reader = await resolution.cns.getReader();
    const eyes = mockAsyncMethods(reader, {
      record: {
        resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
        values: ['0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c'],
      },
    });
    const gundb = await resolution.chatId('homecakes.crypto');
    expectSpyToBeCalled(eyes);
    expect(gundb).toBe(
      '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
    );
  });

  describe('serviceName', () => {
    it('checks ens service name', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.eth');
      expect(serviceName).toBe('ENS');
    });

    it('checks ens service name 2', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.luxe');
      expect(serviceName).toBe('ENS');
    });

    it('checks ens service name', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.xyz');
      expect(serviceName).toBe('ENS');
    });

    it('checks zns service name', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.zil');
      expect(serviceName).toBe('ZNS');
    });

    it('checks cns service name', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.crypto');
      expect(serviceName).toBe('CNS');
    });

    it('checks naming service via api', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.zil');
      expect(serviceName).toBe('ZNS');
    });

    it('checks naming service via api 2', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.luxe');
      expect(serviceName).toBe('ENS');
    });

    it('checks naming service via api 3', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.xyz');
      expect(serviceName).toBe('ENS');
    });

    it('checks naming service via api 4', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.eth');
      expect(serviceName).toBe('ENS');
    });

    it('checks naming service via api 5', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.crypto');
      expect(serviceName).toBe('CNS');
    });
  });

  describe('isValidHash', () => {
    it('works', async () => {
      const resolution = new Resolution();
      const domain = 'hello.world.zil';
      const hash = resolution.namehash(domain);
      const invalidHash = resolution.namehash('world.zil');
      expect(resolution.isValidHash(domain, hash)).toEqual(true);
      expect(resolution.isValidHash(domain, invalidHash)).toEqual(false);
    });
  });

  describe('.Hashing', () => {
    describe('.childhash', () => {
      it('checks childhash', () => {
        const resolution = new Resolution();
        const domain = 'hello.world.zil';
        const namehash = resolution.namehash(domain);
        const childhash = resolution.childhash(
          resolution.namehash('world.zil'),
          'hello',
          NamingServiceName.ZNS,
        );
        expect(childhash).toBe(namehash);
      });

      it('checks childhash multi level domain', () => {
        const cns = new Resolution().cns!;
        const domain = 'ich.ni.san.yon.hello.world.crypto';
        const namehash = cns!.namehash(domain);
        const childhash = cns!.childhash(
          cns!.namehash('ni.san.yon.hello.world.crypto'),
          'ich',
        );
        expect(childhash).toBe(namehash);
      });
    });
  });

  describe('Providers', () => {
    const RpcProviderTestCases = [
      [
        {
          data: '0x91015f6b0000000000000000000000000000000000000000000000000000000000000040756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc900000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001263727970746f2e4554482e616464726573730000000000000000000000000000',
          to: '0x7ea9ee21077f84339eda9c80048ec6db678642b1',
        },
        '0x000000000000000000000000b66dce2da6afaaa98f2013446dbcb0f4b0ab28420000000000000000000000008aad44321a86b170879d7a244c1e8d360c99dda8000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002a30783861614434343332314138366231373038373964374132343463316538643336306339394464413800000000000000000000000000000000000000000000',
      ],
    ] as const;

    it('should work with web3HttpProvider', async () => {
      // web3-providers-http has problems with type definitions
      // We still prefer everything to be statically typed on our end for better mocking
      const provider = new (Web3HttpProvider as any)(protocolLink()) as Web3HttpProvider.HttpProvider;
      // mock the send function with different implementations (each should call callback right away with different answers)
      const eye = mockAsyncMethod(provider, 'send', (payload: JsonRpcPayload, callback) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases);
        callback && callback(null, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });
      const resolution = Resolution.fromWeb3Version1Provider(provider);
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');

      // expect each mock to be called at least once.
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    it('should work with webSocketProvider', async () => {
      // web3-providers-ws has problems with type definitions
      // We still prefer everything to be statically typed on our end for better mocking
      const provider = new (Web3WsProvider as any)(protocolLink(ProviderProtocol.wss)) as Web3WsProvider.WebsocketProvider;
      const eye = mockAsyncMethod(provider, 'send', (payload, callback) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases);
        callback(null, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });

      const resolution = Resolution.fromWeb3Version1Provider(provider);
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');
      provider.disconnect(1000, 'end of test');
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    it('should work for ethers jsonrpc provider', async () => {
      const provider = new JsonRpcProvider(
        protocolLink(ProviderProtocol.http),
        'mainnet',
      );
      const resolution = Resolution.fromEthersProvider(provider);
      const eye = mockAsyncMethod(provider, 'call',
        (params) => Promise.resolve(caseMock(params, RpcProviderTestCases)),
      );
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    it('should work with ethers default provider', async () => {
      const provider = getDefaultProvider('mainnet');

      const eye = mockAsyncMethod(provider, 'call',
        (params) => Promise.resolve(caseMock(params, RpcProviderTestCases)),
      );
      const resolution = Resolution.fromEthersProvider(provider);
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'eth');
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    it('should work with web3@0.20.7 provider', async () => {
      const provider = new Web3V027Provider(protocolLink(ProviderProtocol.http), 5000, null, null, null);
      const eye = mockAsyncMethod(provider, 'sendAsync', (payload: JsonRpcPayload, callback: any) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases);
        callback(undefined, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });
      const resolution = Resolution.fromWeb3Version0Provider(provider);
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'eth');
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });
  });
});
