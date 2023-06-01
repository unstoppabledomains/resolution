import Resolution, {ResolutionErrorCode} from '../index';
import {
  getUnsProtocolLinkFromEnv,
  ProviderProtocol,
  mockAsyncMethod,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
  mockAsyncMethods,
  expectConfigurationErrorCode,
} from './helpers';
import {NullAddress} from '../types';
import {NamingServiceName} from '../types/publicTypes';
import Zns from '../Zns';
import {ConfigurationErrorCode} from '../errors/configurationError';
import Uns from '../Uns';
import ResolutionError from '../errors/resolutionError';

let resolution: Resolution;
let zns: Zns;
let uns: Uns;

describe('ZNS', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    resolution = new Resolution({
      sourceConfig: {
        uns: {
          locations: {
            Layer1: {
              url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
              network: 'goerli',
            },
            Layer2: {
              url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
              network: 'polygon-mumbai',
            },
          },
        },
        zns: {
          network: 'testnet',
        },
      },
    });
    zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
    uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
  });

  describe('.NormalizeSource', () => {
    it('checks normalizeSource zns (boolean)', async () => {
      expect(zns.network).toBe(333);
      expect(zns.url).toBe('https://dev-api.zilliqa.com');
    });

    it('checks normalizeSource zns (string)', async () => {
      expect(zns.network).toBe(333);
      expect(zns.url).toBe('https://dev-api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #1', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          uns: {
            locations: {
              Layer1: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
                network: 'goerli',
              },
              Layer2: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
                network: 'polygon-mumbai',
              },
            },
          },
          zns: {url: 'https://dev-api.zilliqa.com', network: 'testnet'},
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
      expect(zns.network).toBe(333);
      expect(zns.url).toBe('https://dev-api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #3', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          uns: {
            locations: {
              Layer1: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
                network: 'goerli',
              },
              Layer2: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
                network: 'polygon-mumbai',
              },
            },
          },
          zns: {url: 'https://dev-api.zilliqa.com', network: 'testnet'},
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
      expect(zns.network).toBe(333);
      expect(zns.url).toBe('https://dev-api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #4', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          uns: {
            locations: {
              Layer1: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
                network: 'goerli',
              },
              Layer2: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
                network: 'polygon-mumbai',
              },
            },
          },
          zns: {url: 'https://dev-api.zilliqa.com', network: 'testnet'},
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
      expect(zns.network).toBe(333);
      expect(zns.url).toBe('https://dev-api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #6', async () => {
      expect(
        () =>
          new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer1: {
                    url: getUnsProtocolLinkFromEnv(
                      ProviderProtocol.http,
                      'UNSL1',
                    ),
                    network: 'goerli',
                  },
                  Layer2: {
                    url: getUnsProtocolLinkFromEnv(
                      ProviderProtocol.http,
                      'UNSL2',
                    ),
                    network: 'polygon-mumbai',
                  },
                },
              },
              zns: {network: '42'},
            },
          }),
      ).toThrowError(
        'Missing configuration in Resolution ZNS. Please specify registryAddress when using a custom network',
      );
    });

    it('checks normalizeSource zns (object) #7', async () => {
      await expectConfigurationErrorCode(
        () =>
          new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer1: {
                    url: getUnsProtocolLinkFromEnv(
                      ProviderProtocol.http,
                      'UNSL1',
                    ),
                    network: 'goerli',
                  },
                  Layer2: {
                    url: getUnsProtocolLinkFromEnv(
                      ProviderProtocol.http,
                      'UNSL2',
                    ),
                    network: 'polygon-mumbai',
                  },
                },
              },
              zns: {
                network: 'random-network',
                url: 'https://dev-api.zilliqa.com',
                registryAddress: '0x0123123',
              },
            },
          }),
        ConfigurationErrorCode.InvalidConfigurationField,
      );
    });

    it('checks normalizeSource zns (object) #7.1', async () => {
      const validResolution = new Resolution({
        sourceConfig: {
          uns: {
            locations: {
              Layer1: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
                network: 'goerli',
              },
              Layer2: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
                network: 'polygon-mumbai',
              },
            },
          },
          zns: {
            network: 'random-network',
            url: 'https://dev-api.zilliqa.com',
            registryAddress: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
          },
        },
      });
      expect(validResolution).toBeDefined();
    });

    it('checks normalizeSource zns (object) #7.2', async () => {
      await expectConfigurationErrorCode(
        () =>
          new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer1: {
                    url: getUnsProtocolLinkFromEnv(
                      ProviderProtocol.http,
                      'UNSL1',
                    ),
                    network: 'goerli',
                  },
                  Layer2: {
                    url: getUnsProtocolLinkFromEnv(
                      ProviderProtocol.http,
                      'UNSL2',
                    ),
                    network: 'polygon-mumbai',
                  },
                },
              },
              zns: {
                network: 'random-network',
                registryAddress: '0x0123123',
              },
            },
          }),
        ConfigurationErrorCode.CustomNetworkConfigMissing,
      );
    });

    it('checks normalizeSource zns (object) #7.3', async () => {
      await expectConfigurationErrorCode(
        () =>
          new Resolution({
            sourceConfig: {
              uns: {
                locations: {
                  Layer1: {
                    url: getUnsProtocolLinkFromEnv(
                      ProviderProtocol.http,
                      'UNSL1',
                    ),
                    network: 'goerli',
                  },
                  Layer2: {
                    url: getUnsProtocolLinkFromEnv(
                      ProviderProtocol.http,
                      'UNSL2',
                    ),
                    network: 'polygon-mumbai',
                  },
                },
              },
              zns: {
                network: 'random-network',
                url: 'example.com',
                registryAddress: '0x0123123',
              },
            },
          }),
        ConfigurationErrorCode.InvalidConfigurationField,
      );
    });

    it('checks normalizeSource zns (object) #8', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          uns: {
            locations: {
              Layer1: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
                network: 'goerli',
              },
              Layer2: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
                network: 'polygon-mumbai',
              },
            },
          },
          zns: {network: 'testnet'},
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
      expect(zns.network).toBe(333);
      expect(zns.url).toBe('https://dev-api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #10', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          uns: {
            locations: {
              Layer1: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
                network: 'goerli',
              },
              Layer2: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
                network: 'polygon-mumbai',
              },
            },
          },
          zns: {
            registryAddress: 'zil1hyj6m5w4atcn7s806s69r0uh5g4t84e8gp6nps',
            network: 'testnet',
          },
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
      expect(zns.network).toBe(333);
      expect(zns.registryAddr).toBe(
        'zil1hyj6m5w4atcn7s806s69r0uh5g4t84e8gp6nps',
      );
      expect(zns.url).toBe('https://dev-api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #11', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          uns: {
            locations: {
              Layer1: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL1'),
                network: 'goerli',
              },
              Layer2: {
                url: getUnsProtocolLinkFromEnv(ProviderProtocol.http, 'UNSL2'),
                network: 'polygon-mumbai',
              },
            },
          },
          zns: {
            registryAddress: '0xb925add1d5eaf13f40efd43451bf97a22ab3d727',
            network: 'testnet',
          },
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS].native as Zns;
      expect(zns.network).toBe(333);
      expect(zns.url).toBe('https://dev-api.zilliqa.com');
      expect(zns.registryAddr).toBe(
        'zil1hyj6m5w4atcn7s806s69r0uh5g4t84e8gp6nps',
      );
    });
  });

  describe('.registryAddress', () => {
    it('should return testnet registry address', async () => {
      const registryAddress = await zns.registryAddress('testing.zil');
      expect(registryAddress).toBe(
        'zil1hyj6m5w4atcn7s806s69r0uh5g4t84e8gp6nps',
      );
    });
  });

  describe('.Resolve', () => {
    it('should return a valid resolver address', async () => {
      const unsSpy = mockAsyncMethod(uns, 'resolver', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil1qf3pce990c2zft07zgjknu34v9zlqh20mqqvhy',
          '0x02621c64a57e1424adfe122569f2356145f05d4f',
        ],
      });
      const resolverAddress = await resolution.resolver('testing.zil');
      expectSpyToBeCalled([unsSpy, ...spies]);
      expect(resolverAddress).toBe(
        '0x02621c64a57e1424adfe122569f2356145f05d4f',
      );
    });

    it('should return a valid owner address', async () => {
      const unsSpy = mockAsyncMethod(uns, 'owner', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil1qqlrehlvat5kalsq07qedgd3k804glhwhv8ppa',
          '0xdac22230adfe4601f00631eae92df6d77f054891',
        ],
      });
      const ownerAddress = await resolution.owner('testing.zil');
      expectSpyToBeCalled([unsSpy, ...spies]);
      expect(ownerAddress).toBe('zil1qqlrehlvat5kalsq07qedgd3k804glhwhv8ppa');
    });

    it('should not find a resolverAddress', async () => {
      const unsSpy = mockAsyncMethod(uns, 'resolver', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: undefined,
      });
      await expectResolutionErrorCode(
        resolution.resolver('sopmethingveryweirdthatnoonewilltakeever.zil'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled([unsSpy, ...spies]);
    });

    it('should have a zero resolver hahaha', async () => {
      const unsSpy = mockAsyncMethod(uns, 'resolver', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz',
          NullAddress,
        ],
      });
      await expectResolutionErrorCode(
        resolution.resolver('uihui12d.zil'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled([unsSpy, ...spies]);
    });

    it('should have a zero resolver 2', async () => {
      const unsSpy = mockAsyncMethod(uns, 'resolver', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil10scu59zrf8fr6gyw5vnwcz43hg7rvah747pz5h',
          NullAddress,
        ],
      });
      await expectResolutionErrorCode(
        resolution.resolver('paulalcock.zil'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled([unsSpy, ...spies]);
    });
  });

  // Here, we pretend that .zil support is not released in UNS to test that we actually call ZNS.
  describe('.isSupportedDomain', () => {
    it('starts with -', async () => {
      mockAsyncMethod(uns, 'isSupportedDomain', false);
      expect(await resolution.isSupportedDomain('-hello.zil')).toEqual(true);
    });

    it('ends with -', async () => {
      mockAsyncMethod(uns, 'isSupportedDomain', false);
      expect(await resolution.isSupportedDomain('hello-.zil')).toEqual(true);
    });

    it('starts and ends with -', async () => {
      mockAsyncMethod(uns, 'isSupportedDomain', false);
      expect(await resolution.isSupportedDomain('-hello-.zil')).toEqual(true);
    });
  });

  describe('.isRegistered', () => {
    it('should return true', async () => {
      const unsSpy = mockAsyncMethod(uns, 'isRegistered', false);
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      });
      const isRegistered = await resolution.isRegistered('testing.zil');
      expectSpyToBeCalled([unsSpy, ...spies]);
      expect(isRegistered).toBe(true);
    });
    it('should return false', async () => {
      const unsSpy = mockAsyncMethod(uns, 'isRegistered', false);
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [''],
      });
      const isRegistered = await resolution.isRegistered(
        'thisdomainisdefinitelynotregistered123.zil',
      );
      expectSpyToBeCalled([unsSpy, ...spies]);
      expect(isRegistered).toBe(false);
    });
  });

  describe('.isAvailable', () => {
    it('should return false', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      });
      const isAvailable = await zns.isAvailable('testing.zil');
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(false);
    });
    it('should return true', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [''],
      });
      const isAvailable = await zns.isAvailable('ryawefawefan.zil');
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(true);
    });
  });

  describe('.Hashing', () => {
    describe('.Namehash', () => {
      it('supports standard domain', () => {
        expect(resolution.namehash('ny.zil', NamingServiceName.ZNS)).toEqual(
          '0xd45bcb80c1ca68da09082d7618280839a1102446b639b294d07e9a1692ec241f',
        );
      });

      it('supports root "zil" domain', () => {
        expect(resolution.namehash('zil', NamingServiceName.ZNS)).toEqual(
          '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
        );
      });
    });
  });

  describe('.Record Data', () => {
    it('should return IPFS hash from zns', async () => {
      const unsSpy = mockAsyncMethod(uns, 'records', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const eye = mockAsyncMethod(zns, 'getContractMapValue', {
        argtypes: [],
        arguments: [
          '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
          '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
        ],
        constructor: 'Record',
      });
      const secondEye = mockAsyncMethod(zns, 'getResolverRecords', {
        'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        'whois.email.value': 'matt+test@unstoppabledomains.com',
        'whois.for_sale.value': 'true',
      });
      const hash = await resolution.ipfsHash('testing.zil');
      expectSpyToBeCalled([unsSpy, eye, secondEye]);
      expect(hash).toStrictEqual(
        'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
      );
    });

    it('should return httpUrl associated with the domain', async () => {
      const unsSpy = mockAsyncMethod(uns, 'records', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      const eye = mockAsyncMethod(zns, 'getContractMapValue', {
        argtypes: [],
        arguments: [
          '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
          '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
        ],
        constructor: 'Record',
      });
      const secondEye = mockAsyncMethod(zns, 'getResolverRecords', {
        'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        'whois.email.value': 'matt+test@unstoppabledomains.com',
        'whois.for_sale.value': 'true',
      });
      const httpUrl = await resolution.httpUrl('testing.zil');
      expectSpyToBeCalled([unsSpy, eye, secondEye]);
      expect(httpUrl).toBe('www.unstoppabledomains.com');
    });
  });

  describe('.tokenURI', () => {
    it('should throw an unsupported method error', async () => {
      const unsSpy = mockAsyncMethod(uns, 'getTokenUri', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      await expectResolutionErrorCode(
        () => resolution.tokenURI('test.zil'),
        ResolutionErrorCode.UnsupportedMethod,
      );
      expect(unsSpy).toBeCalled();
    });
  });

  describe('.tokenURIMetadata', () => {
    it('should throw an unsupported method error', async () => {
      const unsSpy = mockAsyncMethod(uns, 'getTokenUri', async () => {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain);
      });
      await expectResolutionErrorCode(
        () => resolution.tokenURIMetadata('test.zil'),
        ResolutionErrorCode.UnsupportedMethod,
      );
      expect(unsSpy).toBeCalled();
    });
  });

  describe('.unhash', () => {
    it('should throw an unsupported method error', async () => {
      await expectResolutionErrorCode(
        () =>
          resolution.unhash(
            '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
            NamingServiceName.ZNS,
          ),
        ResolutionErrorCode.UnsupportedMethod,
      );
    });
  });
});
