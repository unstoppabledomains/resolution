import Resolution, { ResolutionErrorCode } from './index';
import {
  mockAsyncMethod,
  expectSpyToBeCalled,
  ZilliqaUrl,
  mockAPICalls,
  expectResolutionErrorCode,
  mockAsyncMethods,
} from './tests/helpers';
import { NullAddress } from './types';

let resolution: Resolution;
beforeEach(() => {
  jest.restoreAllMocks();
  resolution = new Resolution();
});

describe('ZNS', () => {
  describe('.NormalizeSource', () => {
    it('checks normalizeSource zns (boolean)', async () => {
      expect(resolution.zns!.network).toBe('mainnet');
      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (boolean - false)', async () => {
      const resolution = new Resolution({ blockchain: { zns: false } });
      expect(resolution.zns).toBeUndefined();
    });

    it('checks normalizeSource zns (string)', async () => {
      expect(resolution.zns!.network).toBe('mainnet');
      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns unknown url', async () => {
      const r = new Resolution({ blockchain: { zns: 'https://unknownurl.com' } });
      expect(r.zns!.network).toEqual('mainnet');
      expect(r.zns!.url).toEqual('https://unknownurl.com');
    });

    it('checks normalizeSource zns (object) #1', async () => {
      const resolution = new Resolution({
        blockchain: { zns: { url: 'https://api.zilliqa.com' } },
      });
      expect(resolution.zns!.network).toBe('mainnet');
      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #2', async () => {
      const resolution = new Resolution({
        blockchain: { zns: { network: 333 } },
      });
      expect(resolution.zns!.url).toBe('https://dev-api.zilliqa.com');
      expect(resolution.zns!.network).toBe('testnet');
      expect(resolution.zns!.registryAddress).toBeUndefined();
    });

    it('checks normalizeSource zns (object) #3', async () => {
      const resolution = new Resolution({
        blockchain: { zns: { url: 'https://api.zilliqa.com' } },
      });
      expect(resolution.zns!.network).toBe('mainnet');
      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #4', async () => {
      const resolution = new Resolution({
        blockchain: { zns: { url: 'https://api.zilliqa.com', network: 1 } },
      });
      expect(resolution.zns!.network).toBe('mainnet');
      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #5', async () => {
      const resolution = new Resolution({
        blockchain: { zns: { url: 'https://api.zilliqa.com', network: 333 } },
      });

      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
      expect(resolution.zns!.network).toBe('testnet');
      expect(resolution.zns!.registryAddress).toBeUndefined();
    });

    it('checks normalizeSource zns (object) #6', async () => {
      expect(
        () => new Resolution({ blockchain: { zns: { network: 42 } } }),
      ).toThrowError('Unspecified url in Resolution ZNS configuration');
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
      expect(resolution.zns!.network).toBe('mainnet');
      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #9', async () => {
      const resolution = new Resolution({
        blockchain: { zns: { network: 'testnet' } },
      });

      expect(resolution.zns!.network).toBe('testnet');
      expect(resolution.zns!.url).toBe('https://dev-api.zilliqa.com');
      expect(resolution.zns!.registryAddress).toBeUndefined();
    });

    it('checks normalizeSource zns (object) #10', async () => {
      const resolution = new Resolution({
        blockchain: {
          zns: { registry: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz' },
        },
      });
      expect(resolution.zns!.network).toBe('mainnet');
      expect(resolution.zns!.registryAddress).toBe(
        'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
      );
      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #11', async () => {
      const resolution = new Resolution({
        blockchain: {
          zns: { registry: '0xabcffff1231586348194fcabbeff1231240234fc' },
        },
      });

      expect(resolution.zns!.network).toBe('mainnet');
      expect(resolution.zns!.url).toBe('https://api.zilliqa.com');
      expect(resolution.zns!.registryAddress).toBe(
        'zil1408llufrzkrrfqv5lj4malcjxyjqyd8urd7xz6',
      );
    });
  });

  describe('.Resolve', () => {
    it('resolves .zil name using blockchain', async () => {
      mockAPICalls('zil_using_blockchain', ZilliqaUrl);
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

    it('resolves unclaimed domain using blockchain', async () => {
      const spyes = mockAsyncMethods(resolution.zns, {
        getRecordsAddresses: undefined,
      });
      const address = await resolution.address('test.zil', 'ETH');
      expectSpyToBeCalled(spyes);
      expect(address).toEqual(null);
      expect(await resolution.owner('test.zil')).toEqual(null);
    });

    it('resolves domain using blockchain #2', async () => {
      const spyes = mockAsyncMethods(resolution.zns, {
        getRecordsAddresses: [
          'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwec',
          '0x3f329078d95f043fd902d5c3ea2fbce0b3fca003',
        ],
        getResolverRecords: {
          'crypto.BURST.address': 'BURST-R7KK-SBSY-FENX-AWYMW',
          'crypto.ZIL.address': 'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwes',
          'ipfs.html.value':
            'mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a',
          'whois.email.value': 'rleinbox@gmail.com',
          'whois.for_sale.value': 'true',
        },
      });
      const result = await resolution.resolve('test-manage-one.zil');
      expectSpyToBeCalled(spyes);
      expect(result.addresses).toEqual({
        BURST: 'BURST-R7KK-SBSY-FENX-AWYMW',
        ZIL: 'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwes',
      });
      expect(result.meta).toEqual({
        owner: 'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwec',
        type: 'ZNS',
        ttl: 0,
      });
    });

    it('should resolve with Resolution key setuped', async () => {
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

      const result = await resolution.zns!.Resolution('brad.zil');
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

      const result = await resolution.zns!.Resolution('ergergergerg.zil');
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
      const zns = resolution.zns;

      expect(zns).toBeDefined();
      const result = await zns!.Resolution('invalid.domain');
      expect(result).toEqual({});
    });

    it('should resolve with Resolution key setuped #4', async () => {
      const zns = resolution.zns;
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil1tqcrcg50emead2pp6p37p0hnupkswpnlwpnm3r',
          '0x6aec0e4bb2c6fa4acacdaa3f3d871db5e2e1c0ea',
        ],
        getContractField: {
          'crypto.BTC.address': '17LV6fxL8b1pJomn5zoDR3ZCnbt88ehGBf',
          'crypto.ETH.address': '0x0ed6180ef7c638064b9b17ff53ba76ec7077dd95',
          'crypto.LTC.address': 'MTbeoMfWqEZaaZVG1yE1ENoxVGNmMAxoEj',
          'whois.email.value': 'jordanb_970@hotmail.com',
          'whois.for_sale.value': 'true',
        },
      });
      expect(zns).toBeDefined();
      const result = await zns!.Resolution('mcafee2020.zil');
      expectSpyToBeCalled(spies);
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

    it('should return a valid resolver address', async () => {
      const spies = mockAsyncMethods(resolution.zns, {
        getRecordsAddresses: [
          'zil194qcjskuuxh6qtg8xw3qqrr3kdc6dtq8ct6j9s',
          '0xdac22230adfe4601f00631eae92df6d77f054891',
        ],
      });
      const resolverAddress = await resolution.zns!.resolver('brad.zil');
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0xdac22230adfe4601f00631eae92df6d77f054891',
      );
    });

    it('should not find a resolverAddress', async () => {
      const spies = mockAsyncMethods(resolution.zns, {
        getRecordsAddresses: undefined,
      });
      await expectResolutionErrorCode(
        resolution.zns!.resolver(
          'sopmethingveryweirdthatnoonewilltakeever.zil',
        ),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spies);
    });

    it('should have a zero resolver hahaha', async () => {
      const spies = mockAsyncMethods(resolution.zns, {
        getRecordsAddresses: [
          'zil1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz',
          NullAddress,
        ],
      });
      await expectResolutionErrorCode(
        resolution.zns!.resolver('uihui12d.zil'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });

    it('should have a zero resolver 2', async () => {
      const spies = mockAsyncMethods(resolution.zns, {
        getRecordsAddresses: [
          'zil10scu59zrf8fr6gyw5vnwcz43hg7rvah747pz5h',
          NullAddress,
        ],
      });
      await expectResolutionErrorCode(
        resolution.zns!.resolver('paulalcock.zil'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });

    it('should resolve with UnspecifiedCurriency', async () => {
      const spies = mockAsyncMethods(resolution.zns, {
        getRecordsAddresses: [
          'zil1thd3le9wdl3ashy7h4j4dm8slm8grausdm4nyr',
          '0x2410f1f18062b9e6f03246ba126f1f02605b1837',
        ],
        getResolverRecords: {
          'whois.email.value': 'alain974@protonmail.com',
          'whois.for_sale.value': 'true',
        },
      });
      await expectResolutionErrorCode(
        resolution.addressOrThrow('macron2022.zil', 'btc'),
        ResolutionErrorCode.UnspecifiedCurrency,
      );
      expectSpyToBeCalled(spies);
    });
  });

  describe('.isSupportedDomain', () => {
    it("doesn't support zil domain when zns is disabled", () => {
      const resolution = new Resolution({ blockchain: { zns: false } });
      expect(resolution.zns).toBeUndefined();
      expect(resolution.isSupportedDomain('hello.zil')).toBeFalsy();
    });

    it('starts with -', () => {
      expect(resolution.isSupportedDomain('-hello.zil')).toEqual(true);
    });

    it('ends with -', () => {
      expect(resolution.isSupportedDomain('hello-.zil')).toEqual(true);
    });

    it('starts and ends with -', () => {
      expect(resolution.isSupportedDomain('-hello-.zil')).toEqual(true);
    });
  });

  describe('.Hashing', () => {
    describe('.Namehash', () => {
      it('supports standard domain', () => {
        expect(resolution.zns!.namehash('ny.zil')).toEqual(
          '0xd45bcb80c1ca68da09082d7618280839a1102446b639b294d07e9a1692ec241f',
        );
      });

      it('supports root "zil" domain', () => {
        expect(resolution.zns!.namehash('zil')).toEqual(
          '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
        );
      });

      it('raises ResoltuionError when domain is not supported', async () => {
        await expectResolutionErrorCode(
          () => resolution.zns!.namehash('hello.world'),
          ResolutionErrorCode.UnsupportedDomain,
        );
      });
    });

    describe('.Childhash', () => {
      it('checks childhash', () => {
        const zns = resolution.zns;
        const domain = 'hello.world.zil';
        const namehash = zns!.namehash(domain);
        const childhash = zns!.childhash(zns!.namehash('world.zil'), 'hello');
        expect(namehash).toBe(childhash);
      });

      it('checks root "zil domain', () => {
        const zns = resolution.zns;
        const rootHash =
          '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3';
        expect(zns!.namehash('zil')).toBe(rootHash);
        expect(
          zns!.childhash(
            '0000000000000000000000000000000000000000000000000000000000000000',
            'zil',
          ),
        ).toBe(rootHash);
      });

      it('checks childhash multi level domain', () => {
        const zns = resolution.zns;
        const domain = 'ich.ni.san.yon.hello.world.zil';
        const namehash = zns!.namehash(domain);
        const childhash = zns!.childhash(
          zns!.namehash('ni.san.yon.hello.world.zil'),
          'ich',
        );
        expect(childhash).toBe(namehash);
      });
    });
  });

  describe('.Record Data', () => {
    it('should return IPFS hash from zns', async () => {
      const eye = mockAsyncMethod(resolution.zns, 'getContractMapValue', {
        argtypes: [],
        arguments: [
          '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
          '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
        ],
        constructor: 'Record',
      });
      const secondEye = mockAsyncMethod(resolution.zns, 'getResolverRecords', {
        'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        'whois.email.value': 'matt+test@unstoppabledomains.com',
        'whois.for_sale.value': 'true',
      });
      const hash = await resolution.ipfsHash('ergergergerg.zil');
      expectSpyToBeCalled([eye, secondEye]);
      expect(hash).toStrictEqual(
        'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
      );
    });

    it('should return httpUrl associated with the domain', async () => {
      const eye = mockAsyncMethod(resolution.zns, 'getContractMapValue', {
        argtypes: [],
        arguments: [
          '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
          '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
        ],
        constructor: 'Record',
      });
      const secondEye = mockAsyncMethod(resolution.zns, 'getResolverRecords', {
        'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        'whois.email.value': 'matt+test@unstoppabledomains.com',
        'whois.for_sale.value': 'true',
      });
      const httpUrl = await resolution.httpUrl('ergergergerg.zil');
      expectSpyToBeCalled([eye, secondEye]);
      expect(httpUrl).toBe('www.unstoppabledomains.com');
    });
  });
});
