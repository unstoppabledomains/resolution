import nock from 'nock';
import Resolution, { ResolutionErrorCode } from './index';
import {
  expectResolutionErrorCode,
  DefaultUrl,
  mockAPICalls,
  mockAsyncMethod,
  expectSpyToBeCalled,
  CryptoDomainWithTwitterVerification,
} from './tests/helpers';

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

describe('Unstoppable API', () => {
  it('resolves a domain', async () => {
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    const resolution = new Resolution({ blockchain: false });
    const result = await resolution.addr('cofounding.zil', 'eth');
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

  it('should return verified twitter handle', async () => {
    const resolution = new Resolution({ blockchain: false });
    const twitterHandle = await resolution.twitter(
      CryptoDomainWithTwitterVerification,
    );
    expect(twitterHandle).toBe('derainberk');
  });

  it('should throw unsupported method', async () => {
    const resolution = new Resolution({ blockchain: false });
    const handle = 'ryan.eth';
    await expect(resolution.twitter(handle)).rejects.toThrowError(
      `Method twitter is not supported for ${handle}`,
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
      records: {
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
        'crypto.BCH.address': 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
        'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
        'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
        'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
        'crypto.XMR.address':
          '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
        'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
        'crypto.ZIL.address': 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
        'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
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
      records: {
        'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
        'whois.email.value': 'matt+test@unstoppabledomains.com',
        'whois.for_sale.value': 'true',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
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
      records: {
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
        'crypto.BCH.address': 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
        'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
        'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
        'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
        'crypto.XMR.address':
          '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
        'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
        'crypto.ZIL.address': 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
        'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
      },
    });
    const httpUrl = await resolution.httpUrl('brad.zil');
    expectSpyToBeCalled([eyes]);
    expect(httpUrl).toBe('www.unstoppabledomains.com');
  });

  it('should get all records from API', async () => {
    const resolution = new Resolution({ blockchain: false });
    const eyes = mockAsyncMethod(resolution.api, 'resolve', {
      addresses: { ETH: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037' },
      whois: { email: 'jeyhunt@gmail.com' },
      ipfs: { html: 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu' },
      gundb: {},
      social: {},
      meta: {
        domain: 'johnnyjumper.zil',
        namehash:
          '0x08ab2ffa92966738c881a37d0d97f168d2e076d24639921762d0985ebaa62e31',
        owner: '0xcea21f5a6afc11b3a4ef82e986d63b8b050b6910',
        type: 'ZNS',
        ttl: 0,
      },
      records: {
        'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
        'whois.email.value': 'jeyhunt@gmail.com',
        'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
      },
    });
    const records = await resolution.allRecords('johnnyjumper.zil');
    expectSpyToBeCalled([eyes]);
    expect(records).toMatchObject({
      'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
      'whois.email.value': 'jeyhunt@gmail.com',
      'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
    });
  });
});
