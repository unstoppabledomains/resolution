import nock from 'nock';
import Resolution, { ResolutionErrorCode } from './index';
import {
  expectResolutionErrorCode,
  DefaultUrl,
  mockAPICalls,
  mockAsyncMethod,
  expectSpyToBeCalled,
} from './tests/helpers';

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

describe('Unstoppable API', () => {
  it('resolves a domain', async () => {
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    const resolution = new Resolution({ blockchain: false });
    const result = await resolution.address('cofounding.zil', 'eth');
    expect(result).toEqual('0xaa91734f90795e80751c96e682a321bb3c1a4186');
  });
  it('namehashes zil domain', async () => {
    const resolution = new Resolution({ blockchain: false });
    expect(resolution.namehash('cofounding.zil')).toEqual(
      '0x1cc365ffd60bb50538e01d24c1f1e26c887c36f26a0de250660b8a1465c60667',
    );
  });
  it('supports zil and eth domains', async () => {
    const resolution = new Resolution({ blockchain: false });
    expect(resolution.isSupportedDomain('cofounding.zil')).toEqual(true);
    expect(resolution.isSupportedDomain('cofounding.eth')).toEqual(true);
    expect(resolution.isSupportedDomain('cofounding.unknown')).toEqual(false);
  });

  it('throws NamingServiceDown on FetchError', async () => {
    const resolution = new Resolution({ blockchain: false });
    const error = new Error();
    error.name = 'FetchError';
    jest.spyOn(resolution.api as any, 'fetch').mockRejectedValue(error);
    await expectResolutionErrorCode(
      resolution.resolve('hello.zil'),
      ResolutionErrorCode.NamingServiceDown,
    );
  });

  it('returns owner of the domain', async () => {
    const resolution = new Resolution({ blockchain: false });
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    expect(await resolution.owner('cofounding.zil')).toEqual(
      'zil1ye72zl5t8wl5n3f2fsa5w0x7hja0jqj7mhct23',
    );
  });

  it('should return a valid ipfsHash from API', async () => {
    const resolution = new Resolution({ blockchain: false });
    const eyes = mockAsyncMethod(resolution.api, 'resolve', {
      addresses: {
        BCH: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
        BTC: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
        DASH: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
        ETH: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
        LTC: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
        XMR:
          '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
        ZEC: 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
        ZIL: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
      },
      whois: {},
      ipfs: {
        html: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
        redirect_domain: 'www.unstoppabledomains.com',
      },
      meta: {
        owner: '0x2d418942dce1afa02d0733a2000c71b371a6ac07',
        type: 'ZNS',
        ttl: 0,
      },
    });
    const ipfsHash = await resolution.ipfsHash('brad.zil');
    expectSpyToBeCalled([eyes]);
    expect(ipfsHash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('should return a valid email from API', async () => {
    const resolution = new Resolution({ blockchain: false });
    const eyes = mockAsyncMethod(resolution.api, 'resolve', {
      addresses: {},
      whois: {
        email: 'matt+test@unstoppabledomains.com',
        for_sale: 'true',
      },
      ipfs: {
        html: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
        redirect_domain: 'www.unstoppabledomains.com',
      },
      meta: {
        owner: '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
        type: 'ZNS',
        ttl: 0,
      },
    });
    const email = await resolution.email('ergergergerg.zil');
    expectSpyToBeCalled([eyes]);
    expect(email).toBe('matt+test@unstoppabledomains.com');
  });

  it('should return a valid httpUrl from API', async () => {
    const resolution = new Resolution({ blockchain: false });
    const eyes = mockAsyncMethod(resolution.api, 'resolve', {
      addresses: {
        BCH: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
        BTC: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
        DASH: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
        ETH: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
        LTC: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
        XMR:
          '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
        ZEC: 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
        ZIL: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
      },
      whois: {},
      ipfs: {
        html: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
        redirect_domain: 'www.unstoppabledomains.com',
      },
      meta: {
        owner: '0x2d418942dce1afa02d0733a2000c71b371a6ac07',
        type: 'ZNS',
        ttl: 0,
      },
    });
    const httpUrl = await resolution.httpUrl('brad.zil');
    expectSpyToBeCalled([eyes]);
    expect(httpUrl).toBe('www.unstoppabledomains.com');
  });
});
