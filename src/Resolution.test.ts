import nock from 'nock';
import Resolution, { ResolutionErrorCode } from './index';
import { UnclaimedDomainResponse, NamingServiceName } from './types';
import {
  expectResolutionErrorCode,
  expectSpyToBeCalled,
  mockAsyncMethods,
  secretInfuraLink,
} from './utils/testHelpers';
import nodeFetch from 'node-fetch';

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
    const infura = process.env.UNSTOPPABLE_RESOLUTION_INFURA_PROJECTID;
    if (!infura) {
      console.warn('infura id is not set');
    }
    const resolution = Resolution.infura(infura!);
    expect(resolution.ens).toBeDefined();
    expect(resolution.ens!.url).toBe(`https://mainnet.infura.com/v3/${infura}`);

    expect(resolution.cns).toBeDefined();
    expect(resolution.cns!.url).toBe(`https://mainnet.infura.com/v3/${infura}`);
  });

  it('should get a configured with provider resolution instance', async () => {
    const provider = {
      sendAsync: (method: string, params: any) => {
        return nodeFetch(secretInfuraLink(), {
          method: 'POST',
          body: JSON.stringify({
            method,
            params,
            jsonrpc: '2.0',
            id: 1,
          }),
        });
      },
    };
    const resolution = Resolution.provider(provider);
    const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');
    expect(ethAddress).toBe("0x8aaD44321A86b170879d7A244c1e8d360c99DdA8");
  });

  it('should resolve a custom record', async () => {
    const resolution = new Resolution({blockchain: {cns: {url: secretInfuraLink()}}});
    const customRecord = 'gundb.username.value';
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
      getRecord: '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c'
    });
    const value = await resolution.record("homecakes.crypto", customRecord);
    expectSpyToBeCalled(eyes);
    expect(value).toBe('0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c');
  });

  it('should error with recordNoFound for custom record', async () => {
    const resolution = new Resolution({blockchain: {cns: {url: secretInfuraLink()}}});
    const customWrongRecord = 'noSuchRecordEver';
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
      getRecord: ''
    });
    await expectResolutionErrorCode(
      resolution.record("homecakes.crypto", customWrongRecord), 
      ResolutionErrorCode.RecordNotFound
    );
    expectSpyToBeCalled(eyes);
  })

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
    const resolution = new Resolution({blockchain: { cns: { url: secretInfuraLink() } }});
    const eyes = mockAsyncMethods(resolution.cns, { getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
    getRecord: "0x45b31e01AA6f42F0549aD482BE81635ED3149abb",});
    const capital = await resolution.addressOrThrow('Brad.crypto', 'eth');
    expectSpyToBeCalled(eyes);
    const lower = await resolution.addressOrThrow('brad.crypto', 'eth');
    expectSpyToBeCalled(eyes);
    expect(capital).toStrictEqual(lower);
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
    it('should work with custom provider', async () => {
      const provider = {
        sendAsync: (method: string, params: any) => {
          return nodeFetch(secretInfuraLink(), {
            method: 'POST',
            body: JSON.stringify({
              method,
              params,
              jsonrpc: '2.0',
              id: 1,
            }),
          });
        },
      };
      const resolution = new Resolution({
        blockchain: { web3Provider: provider },
      });
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');
      expect(ethAddress).toBe("0x8aaD44321A86b170879d7A244c1e8d360c99DdA8");
    });
  });
});
