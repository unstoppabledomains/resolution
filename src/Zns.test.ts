import Resolution, { ResolutionErrorCode } from '.';
import {
  mockAsyncMethod,
  expectSpyToBeCalled,
  ZilliqaUrl,
  mockAPICalls,
  expectResolutionErrorCode,
} from './utils/testHelpers';

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('ZNS', () => {
  it('resolves .zil name using blockchain', async () => {
    const testName = 'resolves .zil name using blockchain';
    mockAPICalls('zil_using_blockchain', ZilliqaUrl);
    const resolution = new Resolution({ blockchain: { zns: ZilliqaUrl } });
    const result = await resolution.resolve('cofounding.zil');
    expect(result).toBeDefined();
    expect(result.addresses.ETH).toEqual(
      '0xaa91734f90795e80751c96e682a321bb3c1a4186',
    );
    expect(result.meta.owner).toEqual(
      'zil1ye72zl5t8wl5n3f2fsa5w0x7hja0jqj7mhct23',
    );
    expect(result.meta.type).toEqual('ZNS');
    expect(result.meta.ttl).toEqual(0);
  });

  it('supports root "zil" domain', async () => {
    const resolution = new Resolution();
    expect(resolution.namehash('zil')).toEqual(
      '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
    );
  });
  //TODO: Mock this test (live data is not correct anymore)
  // it('resolves unclaimed domain using blockchain', async () => {
  //   const resolution = new Resolution({ blockchain: true });
  //   const result = await resolution.resolve('test.zil');
  //   expect(await resolution.address('test.zil', 'ETH')).toEqual(null);
  //   expect(await resolution.owner('test.zil')).toEqual(null);
  // });
  //TODO: Ditto
  // it('resolves domain using blockchain #2', async () => {
  //   const resolution = new Resolution({ blockchain: true });
  //   const result = await resolution.resolve('test-manage-one.zil');
  //   expect(result.addresses).toEqual({ BURST: 'BURST-R7KK-SBSY-FENX-AWYMW' });
  //   expect(result.meta).toEqual({
  //     owner: 'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwec',
  //     type: 'zns',
  //     ttl: 0,
  //   });
  // });

  it("doesn't support zil domain when zns is disabled", () => {
    const resolution = new Resolution({ blockchain: { zns: false } });
    expect(resolution.zns).toBeUndefined();
    expect(resolution.isSupportedDomain('hello.zil')).toBeFalsy();
  });

  it('checks normalizeSource zns (boolean)', async () => {
    const resolution = new Resolution({ blockchain: { zns: true } });
    expect(resolution.zns.network).toBe('mainnet');
    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (boolean - false)', async () => {
    const resolution = new Resolution({ blockchain: { zns: false } });
    expect(resolution.zns).toBeUndefined();
  });

  it('checks normalizeSource zns (string)', async () => {
    const resolution = new Resolution({
      blockchain: { zns: 'https://api.zilliqa.com' },
    });
    expect(resolution.zns.network).toBe('mainnet');
    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns wrong string', async () => {
    expect(
      () => new Resolution({ blockchain: { zns: 'https://wrongurl.com' } }),
    ).toThrowError('Unspecified network in Resolution ZNS configuration');
  });

  it('checks normalizeSource zns (object) #1', async () => {
    const resolution = new Resolution({
      blockchain: { zns: { url: 'https://api.zilliqa.com' } },
    });
    expect(resolution.zns.network).toBe('mainnet');
    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #2', async () => {
    const resolution = new Resolution({
      blockchain: { zns: { network: 333 } },
    });
    expect(resolution.zns.url).toBe('https://dev-api.zilliqa.com');
    expect(resolution.zns.network).toBe('testnet');
    expect(resolution.zns.registryAddress).toBeUndefined();
  });

  it('checks normalizeSource zns (object) #3', async () => {
    const resolution = new Resolution({
      blockchain: { zns: { url: 'https://api.zilliqa.com' } },
    });
    expect(resolution.zns.network).toBe('mainnet');
    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #4', async () => {
    const resolution = new Resolution({
      blockchain: { zns: { url: 'https://api.zilliqa.com', network: 1 } },
    });
    expect(resolution.zns.network).toBe('mainnet');
    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #5', async () => {
    const resolution = new Resolution({
      blockchain: { zns: { url: 'https://api.zilliqa.com', network: 333 } },
    });

    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
    expect(resolution.zns.network).toBe('testnet');
    expect(resolution.zns.registryAddress).toBeUndefined();
  });

  it('checks normalizeSource zns (object) #6', async () => {
    expect(
      () => new Resolution({ blockchain: { zns: { network: 42 } } }),
    ).toThrowError('Unspecified network in Resolution ZNS configuration');
  });

  it('checks normalizeSource zns (object) #7', async () => {
    expect(
      () => new Resolution({ blockchain: { zns: { network: 'invalid' } } }),
    ).toThrowError('Unspecified url in Resolution ZNS configuration');
  });

  it('checks normalizeSource zns (object) #8', async () => {
    const resolution = new Resolution({
      blockchain: { zns: { network: 'mainnet' } },
    });
    expect(resolution.zns.network).toBe('mainnet');
    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #9', async () => {
    const resolution = new Resolution({
      blockchain: { zns: { network: 'testnet' } },
    });

    expect(resolution.zns.network).toBe('testnet');
    expect(resolution.zns.url).toBe('https://dev-api.zilliqa.com');
    expect(resolution.zns.registryAddress).toBeUndefined();
  });

  it('checks normalizeSource zns (object) #10', async () => {
    const resolution = new Resolution({
      blockchain: {
        zns: { registry: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz' },
      },
    });
    expect(resolution.zns.network).toBe('mainnet');
    expect(resolution.zns.registryAddress).toBe(
      'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
    );
    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #11', async () => {
    const resolution = new Resolution({
      blockchain: {
        zns: { registry: '0xabcffff1231586348194fcabbeff1231240234fc' },
      },
    });

    expect(resolution.zns.network).toBe('mainnet');
    expect(resolution.zns.url).toBe('https://api.zilliqa.com');
    expect(resolution.zns.registryAddress).toBe(
      'zil1408llufrzkrrfqv5lj4malcjxyjqyd8urd7xz6',
    );
  });

  it('should resolve with Resolution key setuped', async () => {
    const resolution = new Resolution();

    const eye = mockAsyncMethod(resolution.zns, 'getRecordsAddresses', [
      'zil194qcjskuuxh6qtg8xw3qqrr3kdc6dtq8ct6j9s',
      '0xdac22230adfe4601f00631eae92df6d77f054891',
    ]);

    const secondEye = mockAsyncMethod(resolution.zns, 'getResolverRecords', {
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
    });

    const result = await resolution.zns.Resolution('brad.zil');
    expectSpyToBeCalled([eye, secondEye]);
    expect(result).toEqual({
      crypto: {
        BCH: { address: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6' },
        BTC: { address: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB' },
        DASH: { address: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j' },
        ETH: { address: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb' },
        LTC: { address: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL' },
        XMR: {
          address:
            '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
        },
        ZEC: { address: 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV' },
        ZIL: { address: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj' },
      },
      ipfs: {
        html: { value: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK' },
        redirect_domain: { value: 'www.unstoppabledomains.com' },
      },
    });
  });

  it('should resolve with Resolution key setuped #2', async () => {
    const resolution = new Resolution();
    const eye = mockAsyncMethod(resolution.zns, 'getRecordsAddresses', [
      'zil1f6vyj5hgvll3xtx5kuxd8ucn66x9zxmkp34agy',
      '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
    ]);

    const secondEye = mockAsyncMethod(resolution.zns, 'getResolverRecords', {
      'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
      'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
      'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
      'whois.email.value': 'matt+test@unstoppabledomains.com',
      'whois.for_sale.value': 'true',
    });

    const result = await resolution.zns.Resolution('ergergergerg.zil');
    expectSpyToBeCalled([eye, secondEye]);
    expect(result).toEqual({
      ipfs: {
        html: {
          hash: 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
          value: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
        },
        redirect_domain: { value: 'www.unstoppabledomains.com' },
      },
      whois: {
        email: { value: 'matt+test@unstoppabledomains.com' },
        for_sale: { value: 'true' },
      },
    });
  });

  it('should resolve with Resolution key setuped #3', async () => {
    const resolution = new Resolution();
    const zns = resolution.zns;

    expect(zns).toBeDefined();
    const result = await zns.Resolution('invalid.domain');
    expect(result).toEqual({});
  });
  //TODO: DITTO
  // it('should resolve with Resolution key setuped #4', async () => {
  //   const resolution = new Resolution();
  //   const zns = resolution.zns;
  //   expect(zns).toBeDefined();
  //   const result = await zns.Resolution('mcafee2020.zil');
  //   expect(result).toEqual({
  //     crypto: {
  //       BTC: { address: '17LV6fxL8b1pJomn5zoDR3ZCnbt88ehGBf' },
  //       ETH: { address: '0x0ed6180ef7c638064b9b17ff53ba76ec7077dd95' },
  //       LTC: { address: 'MTbeoMfWqEZaaZVG1yE1ENoxVGNmMAxoEj' },
  //     },
  //     whois: {
  //       email: { value: 'jordanb_970@hotmail.com' },
  //       for_sale: { value: 'true' },
  //     },
  //   });
  // });

  describe('.namehash', () => {
    it('starts with -', async () => {
      const resolution = new Resolution();
      expect(resolution.isSupportedDomain('-hello.zil')).toEqual(false);
      expectResolutionErrorCode(() => resolution.namehash('-hello.zil'), ResolutionErrorCode.UnsupportedDomain);
    })

    it('ends with -', async () => {
      const resolution = new Resolution();
      expect(resolution.isSupportedDomain('hello-.zil')).toEqual(false);
      expectResolutionErrorCode(() => resolution.namehash('hello-.zil'), ResolutionErrorCode.UnsupportedDomain);
    })

    it('starts and ends with -', async () => {
      const resolution = new Resolution();
      expect(resolution.isSupportedDomain('-hello-.zil')).toEqual(false);
      expectResolutionErrorCode(() => resolution.namehash('-hello-.zil'), ResolutionErrorCode.UnsupportedDomain);
    })
  });
});
