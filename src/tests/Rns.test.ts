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
import {ConfigurationErrorCode} from '../errors/configurationError';
import Uns from '../Uns';
import Rns from '../Rns';

let resolution: Resolution;
let rns: Rns;
let uns: Uns;

describe('RNS', () => {
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
        rns: {
          network: 'testnet',
        },
      },
    });
    rns = resolution.serviceMap[NamingServiceName.RNS].native as Rns;
    uns = resolution.serviceMap[NamingServiceName.UNS].native as Uns;
  });

  describe('.NormalizeSource', () => {
    it('checks normalizeSource rns (boolean)', async () => {
      expect(rns.network).toBe(31);
      expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    });

    it('checks normalizeSource rns (string)', async () => {
      expect(rns.network).toBe(31);
      expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    });

    it('checks normalizeSource rns (object) #1', async () => {
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
          rns: {url: 'https://public-node.testnet.rsk.co', network: 'testnet'},
        },
      });
      rns = resolution.serviceMap[NamingServiceName.RNS].native as Rns;
      expect(rns.network).toBe(31);
      expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    });

    it('checks normalizeSource rns (object) #3', async () => {
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
          rns: {url: 'https://public-node.testnet.rsk.co', network: 'testnet'},
        },
      });
      rns = resolution.serviceMap[NamingServiceName.RNS].native as Rns;
      expect(rns.network).toBe(31);
      expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    });

    it('checks normalizeSource rns (object) #4', async () => {
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
          rns: {url: 'https://public-node.testnet.rsk.co', network: 'testnet'},
        },
      });
      rns = resolution.serviceMap[NamingServiceName.RNS].native as Rns;
      expect(rns.network).toBe(31);
      expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    });

    it('checks normalizeSource rns (object) #6', async () => {
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
              rns: {network: '31'},
            },
          }),
      ).toThrowError(
        'Missing configuration in Resolution RNS. Please specify registryAddress when using a custom network',
      );
    });

    it('checks normalizeSource rns (object) #7', async () => {
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
              rns: {
                network: 'random-network',
                url: 'https://public-node.testnet.rsk.co',
                registryAddress: '0x0123123',
              },
            },
          }),
        ConfigurationErrorCode.InvalidConfigurationField,
      );
    });

    it('checks normalizeSource rns (object) #7.1', async () => {
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
          rns: {
            network: 'random-network',
            url: 'https://public-node.rsk.co',
            registryAddress: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
          },
        },
      });
      expect(validResolution).toBeDefined();
    });

    it('checks normalizeSource rns (object) #7.2', async () => {
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
              rns: {
                network: 'random-network',
                registryAddress: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
              },
            },
          }),
        ConfigurationErrorCode.CustomNetworkConfigMissing,
      );
    });

    it('checks normalizeSource rns (object) #7.3', async () => {
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
              rns: {
                network: 'random-network',
                url: 'example.com',
                registryAddress: '0x0123123',
              },
            },
          }),
        ConfigurationErrorCode.InvalidConfigurationField,
      );
    });

    it('checks normalizeSource rns (object) #8', async () => {
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
          rns: {network: 'testnet'},
        },
      });
      rns = resolution.serviceMap[NamingServiceName.RNS].native as Rns;
      expect(rns.network).toBe(31);
      expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    });

    it('checks normalizeSource rns (object) #10', async () => {
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
          rns: {
            registryAddress: '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
            network: 'testnet',
          },
        },
      });
      rns = resolution.serviceMap[NamingServiceName.RNS].native as Rns;
      expect(rns.network).toBe(31);
      expect(rns.registryAddr).toBe(
        '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
      );
      expect(rns.url).toBe('https://public-node.testnet.rsk.co');
    });

    it('checks normalizeSource rns (object) #11', async () => {
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
          rns: {
            registryAddress: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
            network: 'mainnet',
          },
        },
      });
      rns = resolution.serviceMap[NamingServiceName.RNS].native as Rns;
      expect(rns.network).toBe(30);
      expect(rns.url).toBe('https://public-node.rsk.co');
      expect(rns.registryAddr).toBe(
        '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
      );
    });
  });

  describe('.registryAddress', () => {
    it('should return testnet registry address', async () => {
      const registryAddress = await rns.registryAddress('testing.rsk');
      expect(registryAddress).toBe(
        '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
      );
    });
  });

  describe('.Resolve', () => {
    it('should return a valid resolver address', async () => {
      const spies = mockAsyncMethods(rns, {
        getRecordsAddresses: [
          '0x5a3df1b73406db67b881a2735c2f3917223a67b9',
          '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
        ],
      });
      const resolverAddress = await resolution.resolver('testing.rsk');
      expectSpyToBeCalled([...spies]);
      expect(resolverAddress).toBe(
        '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
      );
    });

    it('should return a valid owner address', async () => {
      const spies = mockAsyncMethods(rns, {
        getRecordsAddresses: [
          '0x5a3df1b73406db67b881a2735c2f3917223a67b9',
          '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
        ],
      });
      const ownerAddress = await resolution.owner('testing.rsk');
      expectSpyToBeCalled([...spies]);
      expect(ownerAddress).toBe('0x5a3df1b73406db67b881a2735c2f3917223a67b9');
    });

    it('should not find a resolverAddress', async () => {
      const spies = mockAsyncMethods(rns, {
        getRecordsAddresses: undefined,
      });
      await expectResolutionErrorCode(
        resolution.resolver('sopmethingveryweirdthatnoonewilltakeever.rsk'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled([...spies]);
    });

    it('should have a zero resolver hahaha', async () => {
      const spies = mockAsyncMethods(rns, {
        getRecordsAddresses: [
          '0x7d284aaac6e925aad802a53c0c69efe3764597b8',
          NullAddress,
        ],
      });
      await expectResolutionErrorCode(
        resolution.resolver('jon.rsk'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled([...spies]);
    });

    it('should have a zero resolver 2', async () => {
      const spies = mockAsyncMethods(rns, {
        getRecordsAddresses: [
          '0x5a3df1b73406db67b881a2735c2f3917223a67b9',
          NullAddress,
        ],
      });
      await expectResolutionErrorCode(
        resolution.resolver('paulalcock.rsk'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled([...spies]);
    });

    // Here, we pretend that .rsk support is not released in UNS to test that we actually call RNS.
    describe('.isSupportedDomain', () => {
      it('starts with -', async () => {
        mockAsyncMethod(uns, 'isSupportedDomain', false);
        expect(await resolution.isSupportedDomain('-hello.rsk')).toEqual(true);
      });

      it('ends with -', async () => {
        mockAsyncMethod(uns, 'isSupportedDomain', false);
        expect(await resolution.isSupportedDomain('hello-.rsk')).toEqual(true);
      });

      it('starts and ends with -', async () => {
        mockAsyncMethod(uns, 'isSupportedDomain', false);
        expect(await resolution.isSupportedDomain('-hello-.rsk')).toEqual(true);
      });
    });

    describe('.isRegistered', () => {
      it('should return true', async () => {
        const spies = mockAsyncMethods(rns, {
          getRecordsAddresses: ['0x7d284aaac6e925aad802a53c0c69efe3764597b8'],
        });
        const isRegistered = await resolution.isRegistered('testing.rsk');
        expectSpyToBeCalled([...spies]);
        expect(isRegistered).toBe(true);
      });
      it('should return false', async () => {
        const spies = mockAsyncMethods(rns, {
          getRecordsAddresses: [''],
        });
        const isRegistered = await resolution.isRegistered(
          'thisdomainisdefinitelynotregistered123.rsk',
        );
        expectSpyToBeCalled([...spies]);
        expect(isRegistered).toBe(false);
      });
    });

    describe('.isAvailable', () => {
      it('should return false', async () => {
        const spies = mockAsyncMethods(rns, {
          getRecordsAddresses: ['0x7d284aaac6e925aad802a53c0c69efe3764597b8'],
        });
        const isAvailable = await rns.isAvailable('testing.rsk');
        expectSpyToBeCalled(spies);
        expect(isAvailable).toBe(false);
      });
      it('should return true', async () => {
        const spies = mockAsyncMethods(rns, {
          getRecordsAddresses: [''],
        });
        const isAvailable = await rns.isAvailable('ryawefawefan.rsk');
        expectSpyToBeCalled(spies);
        expect(isAvailable).toBe(true);
      });
    });

    describe('.Hashing', () => {
      describe('.Namehash', () => {
        it('supports standard domain', () => {
          expect(resolution.namehash('ny.rsk', NamingServiceName.RNS)).toEqual(
            '0x747ec17c48dfd3b302535553096ca04c8c50eeada52ea9d2ef511c6e3eeecfdb',
          );
        });

        it('supports root "rsk" domain', () => {
          expect(resolution.namehash('rsk', NamingServiceName.RNS)).toEqual(
            '0x0cd5c10192478cd220936e91293afc15e3f6de4d419de5de7506b679cbdd8ec4',
          );
        });
      });
    });

    describe('.Record Data', () => {
      it('should return IPFS hash from rns', async () => {
        const eye = mockAsyncMethod(rns, 'getContractMapValue', {
          argtypes: [],
          arguments: [
            '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
            '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
          ],
          constructor: 'Record',
        });
        const secondEye = mockAsyncMethod(rns, 'getResolverRecords', {
          'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
          'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
          'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
          'whois.email.value': 'matt+test@unstoppabledomains.com',
          'whois.for_sale.value': 'true',
        });
        const hash = await resolution.ipfsHash('testing.rsk');
        expectSpyToBeCalled([eye, secondEye]);
        expect(hash).toStrictEqual(
          'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
        );
      });

      it('should return httpUrl associated with the domain', async () => {
        const eye = mockAsyncMethod(rns, 'getContractMapValue', {
          argtypes: [],
          arguments: [
            '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
            '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
          ],
          constructor: 'Record',
        });
        const secondEye = mockAsyncMethod(rns, 'getResolverRecords', {
          'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
          'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
          'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
          'whois.email.value': 'matt+test@unstoppabledomains.com',
          'whois.for_sale.value': 'true',
        });
        const httpUrl = await resolution.httpUrl('testing.rsk');
        expectSpyToBeCalled([eye, secondEye]);
        expect(httpUrl).toBe('www.unstoppabledomains.com');
      });
    });

    describe('.tokenURI', () => {
      it('should throw an unsupported method error', async () => {
        await expectResolutionErrorCode(
          () => resolution.tokenURI('test.rsk'),
          ResolutionErrorCode.UnsupportedMethod,
        );
      });
    });

    describe('.tokenURIMetadata', () => {
      it('should throw an unsupported method error', async () => {
        await expectResolutionErrorCode(
          () => resolution.tokenURIMetadata('test.rsk'),
          ResolutionErrorCode.UnsupportedMethod,
        );
      });
    });

    describe('.unhash', () => {
      it('should throw an unsupported method error', async () => {
        await expectResolutionErrorCode(
          () =>
            resolution.unhash(
              '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
              NamingServiceName.RNS,
            ),
          ResolutionErrorCode.UnsupportedMethod,
        );
      });
    });
  });
});
