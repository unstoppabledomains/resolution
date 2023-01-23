import nock from 'nock';
import Resolution from '../index';
import UdApi from '../UdApi';
import Networking from '../utils/Networking';
import {
  DefaultUrl,
  mockAPICalls,
  mockAsyncMethod,
  expectSpyToBeCalled,
  CryptoDomainWithTwitterVerification,
  expectResolutionErrorCode,
} from './helpers';
import {NamingServiceName} from '../types/publicTypes';
import {ResolutionErrorCode} from '../errors/resolutionError';

let resolution: Resolution;
let udApi: UdApi;

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
  resolution = new Resolution({
    sourceConfig: {
      zns: {api: true},
      uns: {api: true},
    },
  });
  udApi = resolution.serviceMap[NamingServiceName.UNS].usedServices[0] as UdApi;
});

describe('Unstoppable API', () => {
  it('should throw error for registryAddress', async () => {
    await expectResolutionErrorCode(
      () => resolution.registryAddress('test.crypto'),
      ResolutionErrorCode.UnsupportedMethod,
    );
  });

  it('namehashes zil domain', async () => {
    // Even though unsupported in `UdApi`, this should still work by calling a native method.
    expect(
      resolution.namehash('cofounding.zil', NamingServiceName.ZNS),
    ).toEqual(
      '0x1cc365ffd60bb50538e01d24c1f1e26c887c36f26a0de250660b8a1465c60667',
    );
  });

  it('should return verified twitter handle', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        addresses: {},
        whois: {},
        ipfs: {},
        gundb: {},
        social: {},
        meta: {
          domain: 'reseller-test-udtesting-052523593694.crypto',
          namehash:
            '0x0ef61568699a847f9994473ba65185dc75906121d3e10cb9deb37bc722ce6334',
          tokenId:
            '6767172009730303435244989139041815165136673026550796813275243310476136702772',
          owner: '0x499dd6d875787869670900a2130223d85d4f6aa7',
          resolver: '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842',
          type: 'CNS',
          ttl: 0,
        },
        records: {
          'social.twitter.username': 'Marlene12Bob',
          'validation.social.twitter.username':
            '0x01882395ce631866b76f43535843451444ef4a8ff44db0a9432d5d00658a510512c7519a87c78ba9cad7553e26262ada55c254434a1a3784cd98d06fb4946cfb1b',
        },
      }),
    });
    const twitterHandle = await resolution.twitter(
      CryptoDomainWithTwitterVerification,
    );
    expectSpyToBeCalled([eyes]);
    expect(twitterHandle).toBe('Marlene12Bob');
  });

  it('should throw unsupported method', async () => {
    const handle = 'ryan.zil';
    await expect(resolution.twitter(handle)).rejects.toThrowError(
      `Method twitter is not supported for ${handle}`,
    );
  });
  it('returns owner of the domain', async () => {
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    expect(await resolution.owner('cofounding.zil')).toEqual(
      'zil1ye72zl5t8wl5n3f2fsa5w0x7hja0jqj7mhct23',
    );
  });

  it('should return a valid ipfsHash from API', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        addresses: {
          BCH: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
          BTC: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
          DASH: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
          ETH: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
          LTC: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
          XMR: '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
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
      }),
    });
    const ipfsHash = await resolution.ipfsHash('brad.zil');
    expectSpyToBeCalled([eyes]);
    expect(ipfsHash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('should return a valid email from API', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
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
      }),
    });
    const email = await resolution.email('ergergergerg.zil');
    expectSpyToBeCalled([eyes]);
    expect(email).toBe('matt+test@unstoppabledomains.com');
  });

  it('should return true for registered domain', async () => {
    const spies = mockAsyncMethod(udApi, 'resolve', {
      meta: {owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2'},
    });
    const isRegistered = await udApi.isRegistered('ryan.crypto');
    expectSpyToBeCalled([spies]);
    expect(isRegistered).toBe(true);
  });

  it('should return false for unregistered domain', async () => {
    const spies = mockAsyncMethod(udApi, 'resolve', {meta: {owner: ''}});
    const isRegistered = await resolution.isRegistered(
      'thisdomainisdefinitelynotregistered123.crypto',
    );
    expectSpyToBeCalled([spies]);
    expect(isRegistered).toBe(false);
  });

  it('should return a valid httpUrl from API', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        addresses: {
          BCH: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
          BTC: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
          DASH: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
          ETH: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
          LTC: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
          XMR: '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
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
      }),
    });
    const httpUrl = await resolution.httpUrl('brad.zil');
    expectSpyToBeCalled([eyes]);
    expect(httpUrl).toBe('www.unstoppabledomains.com');
  });
});

describe('.Unhash token', () => {
  it('should unhash token', async () => {
    mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        meta: {
          domain: 'brad.crypto',
          namehash:
            '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
          tokenId:
            '53115498937382692782103703677178119840631903773202805882273058578308100329417',
        },
      }),
    });
    expect(
      await udApi.getDomainFromTokenId(
        '53115498937382692782103703677178119840631903773202805882273058578308100329417',
      ),
    ).toEqual('brad.crypto');
  });

  it('should throw exception for empty response', async () => {
    mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        meta: {
          domain: '',
          namehash:
            '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
          tokenId:
            '53115498937382692782103703677178119840631903773202805882273058578308100329417',
        },
      }),
    });
    await expectResolutionErrorCode(
      () =>
        udApi.getDomainFromTokenId(
          '53115498937382692782103703677178119840631903773202805882273058578308100329417',
        ),
      ResolutionErrorCode.UnregisteredDomain,
    );
  });
});
