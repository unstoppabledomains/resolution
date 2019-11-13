import nock from 'nock';
import Namicorn, { ResolutionError } from '.';
import _ from 'lodash';
import mockData from './testData/mockData.json';
import Ens from './ens';
import { Dictionary, NullAddress, UNCLAIMED_DOMAIN_RESPONSE } from './types';
import { toChecksumAddress } from '@zilliqa-js/crypto/dist/util';
import { Zilliqa } from '@zilliqa-js/zilliqa';

const DefaultUrl = 'https://unstoppabledomains.com/api/v1';
const MainnetUrl = 'https://mainnet.infura.io';
const ZilliqaUrl = 'https://api.zilliqa.com';

const mockAsyncMethod = (object: any, method: string, value) => {
  if (!process.env.LIVE)
    return jest.spyOn(object, method).mockResolvedValue(value);
  else return jest.spyOn(object, method);
};

const mockAsyncMethods = (object: any, methods: Dictionary<any>) => {
  return _.map(methods, (value, method) =>
    mockAsyncMethod(object, method, value),
  );
};

const expectSpyToBeCalled = (spies: any[]) => {
  if (!process.env.LIVE) {
    spies.forEach(spy => expect(spy).toBeCalled());
  }
};

const mockAPICalls = (testName: string, url = MainnetUrl) => {
  if (process.env.LIVE) {
    return;
  }
  const mcdt = mockData as any;
  const mockCall = mcdt[testName] as [any];

  mockCall.forEach(({ METHOD, REQUEST, RESPONSE }) => {
    switch (METHOD) {
      case 'POST': {
        nock(url)
          // .log()
          .post('/', JSON.stringify(REQUEST))
          .reply(200, JSON.stringify(RESPONSE));
      }
      default: {
        nock(url)
          // .log()
          .get(REQUEST as string)
          .reply(200, RESPONSE);
      }
    }
  });
};

const expectResolutionErrorCode = async (
  callback: Promise<any> | Function,
  code: string,
) => {
  try {
    if (callback instanceof Promise) {
      await callback;
    } else {
      callback();
    }
  } catch (error) {
    if (error instanceof ResolutionError) {
      return expect(error.code).toEqual(code);
    } else {
      throw error;
    }
  }
  expect(true).toBeFalsy();
};

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

describe('Unstoppable API', () => {
  it('resolves a domain', async () => {
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    const namicorn = new Namicorn({ blockchain: false });
    const result = await namicorn.address('cofounding.zil', 'eth');
    expect(result).toEqual('0xaa91734f90795e80751c96e682a321bb3c1a4186');
  });
  it('namehashes zil domain', async () => {
    const namicorn = new Namicorn({ blockchain: false });
    expect(namicorn.namehash('cofounding.zil')).toEqual(
      '0x1cc365ffd60bb50538e01d24c1f1e26c887c36f26a0de250660b8a1465c60667',
    );
  });
  it('supports zil and eth domains', async () => {
    const namicorn = new Namicorn({ blockchain: false });
    expect(namicorn.isSupportedDomain('cofounding.zil')).toEqual(true);
    expect(namicorn.isSupportedDomain('cofounding.eth')).toEqual(true);
    expect(namicorn.isSupportedDomain('cofounding.unknown')).toEqual(false);
  });

  it('throws NamingServiceDown on FetchError', async () => {
    const namicorn = new Namicorn({ blockchain: false });
    const error = new Error();
    error.name = 'FetchError';
    jest.spyOn(namicorn.api as any, 'fetch').mockRejectedValue(error);
    await expectResolutionErrorCode(
      namicorn.resolve('hello.zil'),
      'NamingServiceDown',
    );
  });

  it('returns owner of the domain', async () => {
    const namicorn = new Namicorn({ blockchain: false });
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    expect(await namicorn.owner('cofounding.zil')).toEqual(
      'zil1ye72zl5t8wl5n3f2fsa5w0x7hja0jqj7mhct23',
    );
  });
});

describe('ZNS', () => {
  it('resolves .zil name using blockchain', async () => {
    const testName = 'resolves .zil name using blockchain';
    mockAPICalls('zil_using_blockchain', ZilliqaUrl);
    const namicorn = new Namicorn({ blockchain: { zns: ZilliqaUrl } });
    const result = await namicorn.resolve('cofounding.zil');
    expect(result).toBeDefined();
    expect(result.addresses.ETH).toEqual(
      '0xaa91734f90795e80751c96e682a321bb3c1a4186',
    );
    expect(result.meta.owner).toEqual(
      'zil1ye72zl5t8wl5n3f2fsa5w0x7hja0jqj7mhct23',
    );
    expect(result.meta.type).toEqual('zns');
    expect(result.meta.ttl).toEqual(0);
  });

  it('resolves unclaimed domain using blockchain', async () => {
    const namicorn = new Namicorn({ blockchain: true });
    const result = await namicorn.resolve('test.zil');
    expect(await namicorn.address('test.zil', 'ETH')).toEqual(null);
    expect(await namicorn.owner('test.zil')).toEqual(null);
  });

  it('resolves domain using blockchain #2', async () => {
    const namicorn = new Namicorn({ blockchain: true });
    const result = await namicorn.resolve('test-manage-one.zil');
    expect(result.addresses).toEqual({ BURST: 'BURST-R7KK-SBSY-FENX-AWYMW' });
    expect(result.meta).toEqual({
      owner: 'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwec',
      type: 'zns',
      ttl: 0,
    });
  });

  it("doesn't support zil domain when zns is disabled", () => {
    const namicorn = new Namicorn({ blockchain: { zns: false } });
    expect(namicorn.zns).toBeUndefined();
    expect(namicorn.isSupportedDomain('hello.zil')).toBeFalsy();
  });

  it('checks normalizeSource zns (boolean)', async () => {
    const namicorn = new Namicorn({ blockchain: { zns: true } });
    expect(namicorn.zns.network).toBe('mainnet');
    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (boolean - false)', async () => {
    const namicorn = new Namicorn({ blockchain: { zns: false } });
    expect(namicorn.zns).toBeUndefined();
  });

  it('checks normalizeSource zns (string)', async () => {
    const namicorn = new Namicorn({
      blockchain: { zns: 'https://api.zilliqa.com' },
    });
    expect(namicorn.zns.network).toBe('mainnet');
    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns wrong string', async () => {
    expect(
      () => new Namicorn({ blockchain: { zns: 'https://wrongurl.com' } }),
    ).toThrowError('Unspecified network in Namicorn ZNS configuration');
  });

  it('checks normalizeSource zns (object) #1', async () => {
    const namicorn = new Namicorn({
      blockchain: { zns: { url: 'https://api.zilliqa.com' } },
    });
    expect(namicorn.zns.network).toBe('mainnet');
    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #2', async () => {
    const namicorn = new Namicorn({ blockchain: { zns: { network: 333 } } });
    expect(namicorn.zns.url).toBe('https://dev-api.zilliqa.com');
    expect(namicorn.zns.network).toBe('testnet');
    expect(namicorn.zns.registryAddress).toBeUndefined();
  });

  it('checks normalizeSource zns (object) #3', async () => {
    const namicorn = new Namicorn({
      blockchain: { zns: { url: 'https://api.zilliqa.com' } },
    });
    expect(namicorn.zns.network).toBe('mainnet');
    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #4', async () => {
    const namicorn = new Namicorn({
      blockchain: { zns: { url: 'https://api.zilliqa.com', network: 1 } },
    });
    expect(namicorn.zns.network).toBe('mainnet');
    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #5', async () => {
    const namicorn = new Namicorn({
      blockchain: { zns: { url: 'https://api.zilliqa.com', network: 333 } },
    });

    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
    expect(namicorn.zns.network).toBe('testnet');
    expect(namicorn.zns.registryAddress).toBeUndefined();
  });

  it('checks normalizeSource zns (object) #6', async () => {
    expect(
      () => new Namicorn({ blockchain: { zns: { network: 42 } } }),
    ).toThrowError('Unspecified network in Namicorn ZNS configuration');
  });

  it('checks normalizeSource zns (object) #7', async () => {
    expect(
      () => new Namicorn({ blockchain: { zns: { network: 'invalid' } } }),
    ).toThrowError('Unspecified url in Namicorn ZNS configuration');
  });

  it('checks normalizeSource zns (object) #8', async () => {
    const namicorn = new Namicorn({
      blockchain: { zns: { network: 'mainnet' } },
    });
    expect(namicorn.zns.network).toBe('mainnet');
    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #9', async () => {
    const namicorn = new Namicorn({
      blockchain: { zns: { network: 'testnet' } },
    });

    expect(namicorn.zns.network).toBe('testnet');
    expect(namicorn.zns.url).toBe('https://dev-api.zilliqa.com');
    expect(namicorn.zns.registryAddress).toBeUndefined();
  });

  it('checks normalizeSource zns (object) #10', async () => {
    const namicorn = new Namicorn({
      blockchain: {
        zns: { registry: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz' },
      },
    });
    expect(namicorn.zns.network).toBe('mainnet');
    expect(namicorn.zns.registryAddress).toBe(
      'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
    );
    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
  });

  it('checks normalizeSource zns (object) #11', async () => {
    const namicorn = new Namicorn({
      blockchain: {
        zns: { registry: '0xabcffff1231586348194fcabbeff1231240234fc' },
      },
    });

    expect(namicorn.zns.network).toBe('mainnet');
    expect(namicorn.zns.url).toBe('https://api.zilliqa.com');
    expect(namicorn.zns.registryAddress).toBe(
      'zil1408llufrzkrrfqv5lj4malcjxyjqyd8urd7xz6',
    );
  });

  it('should resolve with resolution key setuped', async () => {
    const namicorn = new Namicorn();

    const eye = mockAsyncMethod(namicorn.zns, 'getRecordsAddresses', [
      'zil194qcjskuuxh6qtg8xw3qqrr3kdc6dtq8ct6j9s',
      '0xdac22230adfe4601f00631eae92df6d77f054891',
    ]);

    const secondEye = mockAsyncMethod(namicorn.zns, 'getResolverRecords', {
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

    const result = await namicorn.zns.resolution('brad.zil');
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

  it('should resolve with resolution key setuped #2', async () => {
    const namicorn = new Namicorn();
    const eye = mockAsyncMethod(namicorn.zns, 'getRecordsAddresses', [
      'zil1f6vyj5hgvll3xtx5kuxd8ucn66x9zxmkp34agy',
      '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
    ]);

    const secondEye = mockAsyncMethod(namicorn.zns, 'getResolverRecords', {
      'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
      'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
      'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
      'whois.email.value': 'matt+test@unstoppabledomains.com',
      'whois.for_sale.value': 'true',
    });

    const result = await namicorn.zns.resolution('ergergergerg.zil');
    expectSpyToBeCalled([eye, secondEye]);
    expect(result).toEqual({
      ipfs: {
        html: {
          hash: 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
          value: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
        },
        redirect_domain: { value: 'www.unstoppabledomains.com' },
      },
      whois: {
        email: { value: 'matt+test@unstoppabledomains.com' },
        for_sale: { value: 'true' },
      },
    });
  });

  it('should resolve with resolution key setuped #3', async () => {
    const namicorn = new Namicorn();
    const zns = namicorn.zns;

    expect(zns).toBeDefined();
    const result = await zns.resolution('invalid.domain');
    expect(result).toEqual({});
  });

  it('should resolve with resolution key setuped #4', async () => {
    const namicorn = new Namicorn();
    const zns = namicorn.zns;
    expect(zns).toBeDefined();
    const result = await zns.resolution('mcafee2020.zil');
    expect(result).toEqual({
      crypto: {
        BTC: { address: '17LV6fxL8b1pJomn5zoDR3ZCnbt88ehGBf' },
        ETH: { address: '0x0ed6180ef7c638064b9b17ff53ba76ec7077dd95' },
        LTC: { address: 'MTbeoMfWqEZaaZVG1yE1ENoxVGNmMAxoEj' },
      },
      whois: {
        email: { value: 'jordanb_970@hotmail.com' },
        for_sale: { value: 'true' },
      },
    });
  });

  // BREAKS RANDOMLY...
  // it('should check for wrong interface on zns', async () => {
  //   const namicorn = new Namicorn();
  //   const zilliqa = new Zilliqa('https://api.zilliqa.com');
  //   const { zns } = namicorn as any;
  //   expect(zns).toBeDefined();

  //   const resolver = zilliqa.contracts.at(
  //     toChecksumAddress('0xdac22230adfe4601f00631eae92df6d77f054891'),
  //   );
  //   expectResolutionErrorCode(
  //     zns.getContractField(resolver, 'unknownField'),
  //     'IncorrectResolverInterface'
  //   );
  // })
});

describe('ENS', () => {
  it('allows ens network specified as string', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: { network: 'mainnet' } },
    });
    expect(namicorn.ens.url).toBe('https://mainnet.infura.io');
    expect(namicorn.ens.network).toEqual('mainnet');
  });

  it('resolves .eth name using blockchain', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: true },
    });
    expect(namicorn.ens.url).toBe('https://mainnet.infura.io');
    expect(namicorn.ens.network).toEqual('mainnet');

    const eyes = mockAsyncMethods(namicorn.ens, {
      _getOwner: '0x825ef33943d925731FBB89C99aF5780D888bD217',
      _getResolver: '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
      fetchAddress: '0x714ef33943d925731FBB89C99aF5780D888bD106',
    });

    expect(await namicorn.address('matthewgould.eth', 'ETH')).toEqual(
      '0x714ef33943d925731FBB89C99aF5780D888bD106',
    );
    expect(await namicorn.owner('matthewgould.eth')).toEqual(
      '0x825ef33943d925731FBB89C99aF5780D888bD217',
    );
    expectSpyToBeCalled(eyes);
  });

  it('reverses address to ENS domain', async () => {
    const ens = new Ens(MainnetUrl);
    const eyes = mockAsyncMethods(ens, {
      resolverCallToName: 'adrian.argent.xyz',
      _getResolver: '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890',
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
    const spy = mockAsyncMethod(ens, '_getResolver', NullAddress);
    const result = await ens.reverse(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
      'ETH',
    );
    expectSpyToBeCalled([spy]);
    expect(result).toEqual(null);
  });

  it('resolves .xyz name using ENS blockchain', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: MainnetUrl },
    });

    const eyes = mockAsyncMethods(namicorn.ens, {
      _getOwner: '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
      _getResolver: '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890',
      fetchAddress: '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
    });

    const result = await namicorn.address('adrian.argent.xyz', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('0xb0E7a465D255aE83eb7F8a50504F3867B945164C');
  });

  it('resolves .luxe name using ENS blockchain', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: MainnetUrl },
    });

    const eyes = mockAsyncMethods(namicorn.ens, {
      _getOwner: '0xf3dE750A73C11a6a2863761E930BF5fE979d5663',
      _getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      fetchAddress: '0xf3dE750A73C11a6a2863761E930BF5fE979d5663',
    });

    const result = await namicorn.address('john.luxe', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(result).toEqual('0xf3dE750A73C11a6a2863761E930BF5fE979d5663');
  });

  it('resolves .luxe name using ENS blockchain with safe null return', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: MainnetUrl },
    });

    const ownerEye = mockAsyncMethod(namicorn.ens, '_getOwner', NullAddress);
    const result = await namicorn.address('something.luxe', 'ETH');
    expectSpyToBeCalled([ownerEye]);
    expect(result).toEqual(null);
  });

  it('resolves .luxe name using ENS blockchain with thrown error', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: MainnetUrl },
    });
    await expectResolutionErrorCode(
      namicorn.addressOrThrow('something.luxe', 'ETH'),
      'UnregisteredDomain',
    );
  });

  it('resolves name with resolver but without an owner', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: NullAddress,
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod: '0x76a9144620b70031f0e9437e374a2100934fba4911046088ac',
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
    const namicorn = new Namicorn({ blockchain: { ens: true } });
    expect(namicorn.ens.network).toBe('mainnet');
    expect(namicorn.ens.url).toBe('https://mainnet.infura.io');
  });

  it('checks normalizeSource ens (boolean - false)', async () => {
    const ens = new Ens({ network: 5 });
    expect(ens.network).toBe('goerli');
    expect(ens.url).toBe('https://goerli.infura.io');
    expect(ens.isSupportedNetwork()).toBeFalsy();
  });

  it('checks normalizeSource ens (object) #1', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: { url: 'https://mainnet.infura.io' } },
    });
    expect(namicorn.ens.network).toBe('mainnet');
    expect(namicorn.ens.url).toBe('https://mainnet.infura.io');
  });

  it('checks normalizeSource ens (object) #2', async () => {
    const namicorn = new Namicorn({ blockchain: { ens: { network: 3 } } });
    expect(namicorn.ens.network).toBe('ropsten');
    expect(namicorn.ens.url).toBe('https://ropsten.infura.io');
    expect(namicorn.ens.registryAddress).toBe(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    );
  });

  it('checks normalizeSource ens (object) #3', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: { url: 'https://rinkeby.infura.io' } },
    });
    expect(namicorn.ens.network).toBe('rinkeby');
    expect(namicorn.ens.url).toBe('https://rinkeby.infura.io');
  });

  it('checks normalizeSource ens (object) #4', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: { url: 'https://goerli.infura.io', network: 5 } },
    });
    expect(namicorn.ens.network).toBe('goerli');
    expect(namicorn.ens.url).toBe('https://goerli.infura.io');
    expect(namicorn.ens.registryAddress).toBeUndefined();
  });

  it('checks normalizeSource ens (object) #6', async () => {
    expect(
      () => new Namicorn({ blockchain: { ens: { network: 7543 } } }),
    ).toThrowError('Unspecified network in Namicorn ENS configuration');
  });

  it('checks normalizeSource ens (object) #7', async () => {
    expect(
      () => new Namicorn({ blockchain: { ens: { network: 'invalid' } } }),
    ).toThrowError('Unspecified url in Namicorn ENS configuration');
  });

  it('checks normalizeSource ens (object) #8', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: { network: 'mainnet' } },
    });
    expect(namicorn.ens.network).toBe('mainnet');
    expect(namicorn.ens.url).toBe('https://mainnet.infura.io');
  });

  it('checks normalizeSource ens (object) #9', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: { network: 'kovan' } },
    });
    expect(namicorn.ens.network).toBe('kovan');
    expect(namicorn.ens.url).toBe('https://kovan.infura.io');
  });

  it('checks normalizeSource ens (object) #10', async () => {
    const namicorn = new Namicorn({
      blockchain: {
        ens: { registry: '0x314159265dd8dbb310642f98f50c066173c1259b' },
      },
    });
    expect(namicorn.ens.network).toBe('mainnet');
    expect(namicorn.ens.url).toBe('https://mainnet.infura.io');
    expect(namicorn.ens.registryAddress).toBe(
      '0x314159265dd8dbb310642f98f50c066173c1259b',
    );
  });

  it('checks normalizeSource ens (object) #11', async () => {
    const namicorn = new Namicorn({
      blockchain: {
        ens: {
          network: 'ropsten',
          registry: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
        },
      },
    });
    expect(namicorn.ens.network).toBe('ropsten');
    expect(namicorn.ens.url).toBe('https://ropsten.infura.io');
    expect(namicorn.ens.registryAddress).toBe(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    );
  });

  it('checks normalizeSource ens (object) #12', async () => {
    const namicorn = new Namicorn({
      blockchain: {
        ens: { registry: '0xabcffff1231586348194fcabbeff1231240234fc' },
      },
    });

    expect(namicorn.ens.network).toBe('mainnet');
    expect(namicorn.ens.url).toBe('https://mainnet.infura.io');
    expect(namicorn.ens.registryAddress).toBe(
      '0xabcffff1231586348194fcabbeff1231240234fc',
    );
  });

  it('checks normalizeSource ens (object) #13', async () => {
    const namicorn = new Namicorn({
      blockchain: {
        ens: { network: 'custom', url: 'https://custom.notinfura.io' },
      },
    });
    expect(namicorn.ens.network).toBe('custom');
    expect(namicorn.ens.url).toBe('https://custom.notinfura.io');
    expect(namicorn.ens.registryAddress).toBeUndefined();
  });

  it('checks ens multicoin support #1', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod: '0x76a9144620b70031f0e9437e374a2100934fba4911046088ac',
    });
    const doge = await ens.address('testthing.eth', 'DOGE');
    expectSpyToBeCalled(eyes);
    expect(doge).toBe('DBXu2kgc3xtvCUWFcxFE3r9hEYgmuaaCyD');
  });

  it('checks ens multicoin support #2', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod: '0xa914e8604d28ef5d2a7caafe8741e5dd4816b7cb19ea87',
    });
    const ltc = await ens.address('testthing.eth', 'LTC');
    expectSpyToBeCalled(eyes);
    expect(ltc).toBe('MV5rN5EcX1imDS2gEh5jPJXeiW5QN8YrK3');
  });

  it('checks ens multicoin support #3', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const eth = await ens.address('testthing.eth', 'ETH');
    expectSpyToBeCalled(eyes);
    expect(eth).toBe('0x314159265dD8dbb310642f98f50C066173C1259b');
  });

  it('checks ens multicoin support #4', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const etc = await ens.address('testthing.eth', 'etc');
    expectSpyToBeCalled(eyes);
    expect(etc).toBe('0x314159265dD8dbb310642f98f50C066173C1259b');
  });

  it('checks ens multicoin support #5', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod: '0x314159265dd8dbb310642f98f50c066173c1259b',
    });
    const rsk = await ens.address('testthing.eth', 'rsk');
    expectSpyToBeCalled(eyes);
    expect(rsk).toBe('0x314159265dD8DbB310642F98f50C066173c1259B');
  });

  it('checks ens multicoin support #6', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod:
        '0x05444b4e9c06f24296074f7bc48f92a97916c6dc5ea9000000000000000000',
    });
    const xrp = await ens.address('testthing.eth', 'xrp');
    expectSpyToBeCalled(eyes);
    expect(xrp).toBe('X7qvLs7gSnNoKvZzNWUT2e8st17QPY64PPe7zriLNuJszeg');
  });

  it('checks ens multicoin support #7', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod: '0x76a91476a04053bda0a88bda5177b86a15c3b29f55987388ac',
    });
    const bch = await ens.address('testthing.eth', 'bch');
    expectSpyToBeCalled(eyes);
    expect(bch).toBe('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a');
  });

  it('checks ens multicoin support #8', async () => {
    const ens = new Ens();
    const eyes = mockAsyncMethods(ens, {
      _getOwner: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
      _getResolver: '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8',
      _callMethod:
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
      new Namicorn().addressOrThrow('testthing.eth', 'bnb'),
      'UnsupportedCurrency',
    );
  });

  it('checks UnsupportedCurrency error', async () => {
    await expectResolutionErrorCode(
      new Namicorn().addressOrThrow('testthing.eth', 'UNREALTICKER'),
      'UnsupportedCurrency',
    );
  });
});

describe('Namicorn', () => {
  it('checks Namicorn#addressOrThrow error #1', async () => {
    const namicorn = new Namicorn();
    await expectResolutionErrorCode(
      namicorn.addressOrThrow('sdncdoncvdinvcsdncs.zil', 'ZIL'),
      'UnregisteredDomain',
    );
  });

  it('checks Namicorn#addressOrThrow error #2', async () => {
    const namicorn = new Namicorn();
    await expectResolutionErrorCode(
      namicorn.addressOrThrow('brad.zil', 'INVALID_CURRENCY_SYMBOL'),
      'UnspecifiedCurrency',
    );
  });

  it('resolves non-existing domain zone with throw', async () => {
    const namicorn = new Namicorn({ blockchain: true });
    await expectResolutionErrorCode(
      namicorn.addressOrThrow('bogdangusiev.qq', 'ZIL'),
      'UnsupportedDomain',
    );
  });

  it('resolves non-existing domain zone via safe address', async () => {
    const namicorn = new Namicorn({ blockchain: true });
    const result = await namicorn.address('bogdangusiev.qq', 'ZIL');
    expect(result).toEqual(null);
  });

  it('provides empty response constant', async () => {
    const response = UNCLAIMED_DOMAIN_RESPONSE;
    expect(response.addresses).toEqual({});
    expect(response.meta.owner).toEqual(null);
  });

  it('checks the isSupportedDomainInNetwork', async () => {
    const namicorn = new Namicorn();
    const result = namicorn.isSupportedDomainInNetwork('brad.zil');
    expect(result).toBe(true);
  });

  it('checks namehash for unsupported domain', async () => {
    const namicorn = new Namicorn();
    await expectResolutionErrorCode(
      () => namicorn.namehash('something.hello.com'),
      'UnsupportedDomain',
    );
  });
});
