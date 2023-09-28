import {NullAddress} from '../types';
import {
  expectSpyToBeCalled,
  mockAsyncMethods,
  RnsDomainWithAllRecords,
} from './helpers';
import {
  ConfigurationError,
  ConfigurationErrorCode,
} from '../errors/configurationError';
import {ResolutionError, ResolutionErrorCode} from '../errors/resolutionError';
import Rns from '../Rns';
import {BlockchainType, NamingServiceName} from '../types/publicTypes';

let rns: Rns;

beforeEach(async () => {
  jest.restoreAllMocks();
  rns = new Rns({
    network: 'mainnet',
  });
});

describe('Rns', () => {
  describe('constructor()', () => {
    it('should throw error on invalid network', async () => {
      expect(() => new Rns({} as any)).toThrow(
        new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
          method: NamingServiceName.RNS,
        }),
      );
    });
    it('should throw error on resolverAddress for custom network', async () => {
      expect(
        () =>
          new Rns({
            url: 'unsupported-url',
            network: 'custom',
          }),
      ).toThrow(
        new ConfigurationError(
          ConfigurationErrorCode.CustomNetworkConfigMissing,
          {
            method: NamingServiceName.RNS,
            config: 'resolverAddress',
          },
        ),
      );
    });
    it('should throw error on invalid proxyReaderAddress for custom network', async () => {
      expect(
        () =>
          new Rns({
            url: 'custom-node',
            network: 'custom',
            resolverAddress: '0x9be44Fb038d6282119811301601dD5e73881477A',
          }),
      ).toThrow(
        new ConfigurationError(
          ConfigurationErrorCode.CustomNetworkConfigMissing,
          {
            method: NamingServiceName.RNS,
            config: 'registryAddress',
          },
        ),
      );
    });
  });

  describe('.getTokenUri()', () => {
    it('should thrown not supported error', async () => {
      const handle = 'ryan.rsk';
      await expect(rns.getTokenUri(handle)).rejects.toThrowError(
        `Method getTokenUri is not supported`,
      );
    });
  });

  describe('.registryAddress()', () => {
    it('should thrown not supported error', async () => {
      const handle = 'ryan.rsk';
      await expect(rns.registryAddress(handle)).rejects.toThrowError(
        `Method registryAddress is not supported`,
      );
    });
  });

  describe('.resolver()', () => {
    it('should throw on unregistered domain', async () => {
      const resolverAddress = NullAddress;
      const owner = NullAddress;
      mockAsyncMethods(rns.registryContract, {
        call: [resolverAddress, owner, []],
      });
      await expect(() =>
        rns.resolver('unregistered-domain.rsk'),
      ).rejects.toThrow(
        new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain: 'unregistered-domain.rsk',
        }),
      );
    });
    it('should return valid resolver', async () => {
      const methods1 = mockAsyncMethods(rns.resolverContract, {
        call: ['0x95ae1515367aa64c462c71e87157771165b1287a', NullAddress, []],
      });
      const methods2 = mockAsyncMethods(rns.registryContract, {
        call: ['0xD87f8121D44F3717d4bAdC50b24E50044f86D64B', NullAddress, []],
      });
      const resolverAddress = await rns.resolver(RnsDomainWithAllRecords);
      expectSpyToBeCalled(methods1);
      expectSpyToBeCalled(methods2);
      expect(resolverAddress).toBe(
        '0x95ae1515367aa64c462c71e87157771165b1287a',
      );
    });
  });

  it('should return location for L1 domains', async () => {
    const methods1 = mockAsyncMethods(rns.resolverContract, {
      call: ['0x95ae1515367aa64c462c71e87157771165b1287a', NullAddress, []],
    });
    const methods2 = mockAsyncMethods(rns.registryContract, {
      call: ['0xD87f8121D44F3717d4bAdC50b24E50044f86D64B', NullAddress, []],
    });

    const location = await rns.locations(['brad.rsk']);

    expect(location['brad.rsk']).toEqual({
      registryAddress: '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5',
      resolverAddress: '0xd87f8121d44f3717d4badc50b24e50044f86d64b',
      networkId: 30,
      blockchain: BlockchainType.RSK,
      ownerAddress: '0xD87f8121D44F3717d4bAdC50b24E50044f86D64B',
      blockchainProviderUrl: Rns.UrlMap[30],
    });
  });
});
