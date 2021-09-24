import UnsInternal from '../UnsInternal';
import {NullAddress} from '../types';
import {
  mockAsyncMethods,
  expectSpyToBeCalled,
  protocolLink,
  CryptoDomainWithAllRecords,
  WalletDomainLayerTwoWithAllRecords,
  mockAPICalls,
  ProviderProtocol,
} from './helpers';
import {UnsLocation} from '../types/publicTypes';

let unsInternalL1: UnsInternal;
let unsInternalL2: UnsInternal;

beforeEach(async () => {
  jest.restoreAllMocks();
  unsInternalL1 = new UnsInternal(UnsLocation.Layer1, {
    url: protocolLink(ProviderProtocol.http, 'UNSL1'),
    network: 'rinkeby',
  });
  unsInternalL2 = new UnsInternal(UnsLocation.Layer2, {
    url: protocolLink(ProviderProtocol.http, 'UNSL2'),
    network: 'polygon-mumbai',
  });
});

describe('UnsInternal', () => {
  it('should return valid resolver', async () => {
    const spies = mockAsyncMethods(unsInternalL1.readerContract, {
      call: ['0x95AE1515367aa64C462c71e87157771165B1287A', NullAddress, []],
    });
    const resolverAddress = await unsInternalL1.resolver(
      CryptoDomainWithAllRecords,
    );
    expectSpyToBeCalled(spies);
    expect(resolverAddress).toBe('0x95AE1515367aa64C462c71e87157771165B1287A');
  });
  it('should return valid resolver on L2', async () => {
    const spies = mockAsyncMethods(unsInternalL2.readerContract, {
      call: ['0x2a93C52E7B6E7054870758e15A1446E769EdfB93', NullAddress, []],
    });
    const resolverAddress = await unsInternalL2.resolver(
      WalletDomainLayerTwoWithAllRecords,
    );
    expectSpyToBeCalled(spies);
    expect(resolverAddress).toBe('0x2a93C52E7B6E7054870758e15A1446E769EdfB93');
  });
  it('should get domain from tokenId', async () => {
    const spies = mockAsyncMethods(unsInternalL1, {
      registryAddress: '0x95AE1515367aa64C462c71e87157771165B1287A',
    });
    mockAPICalls('unhash', protocolLink());
    const hash = unsInternalL1.namehash(CryptoDomainWithAllRecords);
    const domainName = await unsInternalL1.getDomainFromTokenId(hash);
    expectSpyToBeCalled(spies);
    expect(domainName).toBe(CryptoDomainWithAllRecords);
  });
  it('should return true for tld exists', async () => {
    mockAPICalls('uns_domain_exists_test', protocolLink());
    const exists = await unsInternalL1.exists(
      CryptoDomainWithAllRecords.split('.')[1],
    );
    expect(exists).toBe(true);
  });
  it('should return true for domain exists', async () => {
    mockAPICalls('uns_domain_exists_test', protocolLink());
    const exists = await unsInternalL1.exists(CryptoDomainWithAllRecords);
    expect(exists).toBe(true);
  });
  it('should return true for tld exists on L2', async () => {
    mockAPICalls(
      'uns_l2_domain_exists_test',
      protocolLink(ProviderProtocol.http, 'UNSL2'),
    );
    const exists = await unsInternalL2.exists(
      WalletDomainLayerTwoWithAllRecords.split('.')[1],
    );
    expect(exists).toBe(true);
  });
  it('should return true for domain exists on L2', async () => {
    mockAPICalls(
      'uns_l2_domain_exists_test',
      protocolLink(ProviderProtocol.http, 'UNSL2'),
    );
    const exists = await unsInternalL2.exists(
      WalletDomainLayerTwoWithAllRecords,
    );
    expect(exists).toBe(true);
  });
});
