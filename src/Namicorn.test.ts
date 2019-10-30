import nock from 'nock';
import Namicorn from '.';
import _ from 'lodash';
import mockData from './testData/mockData.json';
import Ens from './ens';

const DefaultUrl = 'https://unstoppabledomains.com/api/v1';
const MainnetUrl = 'https://mainnet.infura.io';
const ZilliqaUrl = 'https://api.zilliqa.com';

const mockAPICalls = (topLevel: string, testName: string, url = MainnetUrl) => {
  if (process.env.LIVE) {
    return;
  }
  const mcdt = mockData as any;
  const tplvl = mcdt[topLevel] as any;
  const mockCall = tplvl[testName] as [any];

  mockCall.forEach(({ METHOD, REQUEST, RESPONSE }) => {
    switch (METHOD) {
      case 'POST': {
        nock(url)
          // .log(console.log)
          .post('/', JSON.stringify(REQUEST))
          .reply(200, JSON.stringify(RESPONSE));
      }
      default: {
        nock(url)
          // .log(console.log)
          .get(REQUEST as string)
          .reply(200, RESPONSE);
      }
    }
  });
};

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

describe('ZNS', () => {
  it('resolving from unstoppable API', async () => {
    const testName = 'should work';
    mockAPICalls('UD_API', testName, DefaultUrl);
    const namicorn = new Namicorn({ blockchain: false });
    const result = await namicorn.address('cofounding.zil', 'eth');
    expect(result).toEqual('0xaa91734f90795e80751c96e682a321bb3c1a4186');
  });

  it('resolves .zil name using blockchain', async () => {
    const testName = 'resolves .zil name using blockchain';
    mockAPICalls('ZIL', testName, ZilliqaUrl);
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
    expect(result.addresses).toEqual({});
    expect(result.meta.owner).toEqual(null);
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
    new Namicorn({ blockchain: { zns: false } });
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
    ).toThrow();
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
    ).toThrow();
  });

  it('checks normalizeSource zns (object) #7', async () => {
    expect(
      () => new Namicorn({ blockchain: { zns: { network: 'invalid' } } }),
    ).toThrow();
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

    const eye = jest
      .spyOn(namicorn.zns, '_getRecordsAddresses')
      .mockResolvedValue([
        'zil194qcjskuuxh6qtg8xw3qqrr3kdc6dtq8ct6j9s',
        '0xdac22230adfe4601f00631eae92df6d77f054891',
      ]);

    const secondEye = jest
      .spyOn(namicorn.zns, '_getResolverRecords')
      .mockResolvedValue({
        crypto: {
          BCH: { address: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6' },
          BTC: { address: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB' },
          ETH: { address: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb' },
          LTC: { address: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL' },
          ZIL: { address: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj' },
        },
        ipfs: {
          html: { value: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK' },
          redirect_domain: { value: 'www.unstoppabledomains.com' },
        },
      });

    const result = await namicorn.zns.resolution('brad.zil');

    expect(eye).toHaveBeenCalled();
    expect(secondEye).toHaveBeenCalled();
    expect(result).toEqual({
      crypto: {
        BCH: { address: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6' },
        BTC: { address: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB' },
        ETH: { address: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb' },
        LTC: { address: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL' },
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
    const eye = jest
      .spyOn(namicorn.zns, '_getRecordsAddresses')
      .mockResolvedValue([
        'zil1f6vyj5hgvll3xtx5kuxd8ucn66x9zxmkp34agy',
        '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
      ]);

    const secondEye = jest
      .spyOn(namicorn.zns, '_getResolverRecords')
      .mockResolvedValue({
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

    const result = await namicorn.zns.resolution('ergergergerg.zil');
    expect(eye).toHaveBeenCalled();
    expect(secondEye).toHaveBeenCalled();
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
});

describe('ENS', () => {
  it('allows ens network specified as string', async () => {
    const testName = 'resolves .eth name using blockchain';
    //mockAPICalls('ENS', testName, MainnetUrl);

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

    const eye = jest
      .spyOn(namicorn.ens, '_getResolutionInfo')
      .mockImplementation(() =>
        Promise.resolve([
          '0x714ef33943d925731FBB89C99aF5780D888bD106',
          '0',
          '0x5FfC014343cd971B7eb70732021E26C35B744cc4',
        ]),
      );

    const secondEye = jest
      .spyOn(namicorn.ens, '_fetchAddress')
      .mockImplementation(() =>
        Promise.resolve('0x714ef33943d925731FBB89C99aF5780D888bD106'),
      );

    var result = await namicorn.address('matthewgould.eth', 'ETH');
    expect(eye).toHaveBeenCalled();
    expect(secondEye).toHaveBeenCalled();
    expect(result).toEqual('0x714ef33943d925731FBB89C99aF5780D888bD106');
  });

  it('reverses address to ENS domain', async () => {
    const ens = new Ens(MainnetUrl);
    const eye = jest
      .spyOn(ens, '_resolverCallToName')
      .mockImplementation(() => 'adrian.argent.xyz');
    const secondEye = jest
      .spyOn(ens, '_getResolver')
      .mockImplementation(() => '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890');
    const result = await ens.reverse(
      '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
      'ETH',
    );
    expect(eye).toHaveBeenCalled();
    expect(secondEye).toHaveBeenCalled();
    expect(result).toEqual('adrian.argent.xyz');
  });

  it('reverses address to ENS domain null', async () => {
    const ens = new Ens(MainnetUrl);
    const spy = jest
      .spyOn(ens, '_getResolver')
      .mockImplementation(() => '0x0000000000000000000000000000000000000000');
    const result = await ens.reverse(
      '0x112234455c3a32fd11230c42e7bccd4a84e02010',
      'ETH',
    );

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(null);
  });

  it('resolves .xyz name using ENS blockchain', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: MainnetUrl },
    });

    const spy = jest
      .spyOn(namicorn.ens, '_getResolutionInfo')
      .mockImplementation(() =>
        Promise.resolve([
          '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
          Number(0x00),
          '0xDa1756Bb923Af5d1a05E277CB1E54f1D0A127890',
        ]),
      );

    const secondSpy = jest
      .spyOn(namicorn.ens, '_fetchAddress')
      .mockImplementation(() =>
        Promise.resolve('0xb0E7a465D255aE83eb7F8a50504F3867B945164C'),
      );

    const result = await namicorn.address('adrian.argent.xyz', 'ETH');
    expect(spy).toBeCalled();
    expect(secondSpy).toBeCalled();
    expect(result).toEqual('0xb0E7a465D255aE83eb7F8a50504F3867B945164C');
  });

  it('resolves .luxe name using ENS blockchain', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: MainnetUrl },
    });

    const spy = jest
      .spyOn(namicorn.ens, '_getResolutionInfo')
      .mockImplementation(() =>
        Promise.resolve([
          '0xf3dE750A73C11a6a2863761E930BF5fE979d5663',
          Number(0x00),
          '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
        ]),
      );

    const secondSpy = jest
      .spyOn(namicorn.ens, '_fetchAddress')
      .mockImplementation(() =>
        Promise.resolve('0xf3dE750A73C11a6a2863761E930BF5fE979d5663'),
      );

    const result = await namicorn.address('john.luxe', 'ETH');
    expect(spy).toBeCalled();
    expect(secondSpy).toBeCalled();
    expect(result).toEqual('0xf3dE750A73C11a6a2863761E930BF5fE979d5663');
  });

  it('resolves .luxe name using ENS blockchain null', async () => {
    const namicorn = new Namicorn({
      blockchain: { ens: MainnetUrl },
    });

    const spy = jest
      .spyOn(namicorn.ens, '_getResolutionInfo')
      .mockImplementation(() =>
        Promise.resolve([
          '0x0000000000000000000000000000000000000000',
          Number(0x00),
          '0x0000000000000000000000000000000000000000',
        ]),
      );

    const secondSpy = jest
      .spyOn(namicorn.ens, '_fetchAddress')
      .mockImplementation(() => Promise.resolve(null));

    const result = await namicorn.address('something.luxe', 'ETH');
    expect(spy).toBeCalled();
    expect(secondSpy).toBeCalled();
    expect(result).toEqual(null);
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
    ).toThrow();
  });

  it('checks normalizeSource ens (object) #7', async () => {
    expect(
      () => new Namicorn({ blockchain: { ens: { network: 'invalid' } } }),
    ).toThrow();
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
});

it('provides empty response constant', async () => {
  const response = Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
  expect(response.addresses).toEqual({});
  expect(response.meta.owner).toEqual(null);
});

it('resolves non-existing domain zone', async () => {
  const namicorn = new Namicorn({ blockchain: true });
  const result = await namicorn.address('bogdangusiev.qq', 'ZIL');
  expect(result).toEqual(null);
});

it('checks the isSupportedDomainInNetwork', async () => {
  const namicorn = new Namicorn();
  const result = namicorn.isSupportedDomainInNetwork('brad.zil');
  expect(result).toBe(true);
});
