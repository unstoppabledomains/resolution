import Namicorn from '.';
import {
  mockAsyncMethods,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
} from './utils/testHelpers';
import { ResolutionErrorCode } from './resolutionError';

const labelDomain = 'reseller-test-braden-6.crypto';
beforeEach(() => {
  jest.restoreAllMocks();
});

const mockCryptoCalls = (
  object,
  mockAddress: string,
): jest.SpyInstance<any, unknown[]>[] => {
  const eyes = mockAsyncMethods(object, {
    getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
    owner: '0x1a5363ca3ceef73b1544732e3264f6d600cf678e',
    getTtl: '0',
    getRecord: mockAddress,
  });
  return eyes;
};

describe('CNS', () => {
  it('should define the default cns contract', () => {
    const namicorn = new Namicorn();
    expect(namicorn.cns).toBeDefined();
    expect(namicorn.cns.network).toBe('mainnet');
    expect(namicorn.cns.url).toBe('https://mainnet.infura.io');
  });

  it('checks the ipfs hash record', async () => {
    const namicorn = new Namicorn();
    const eyes = mockAsyncMethods(namicorn.cns, {
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      getRecord: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
    });
    const ipfs_hash = await namicorn.cns.record(labelDomain, 'ipfs.html2');
    expectSpyToBeCalled(eyes);
    expect(ipfs_hash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('Should return NoRecord Resolution error', async () => {
    const namicorn = new Namicorn();
    await expectResolutionErrorCode(
      namicorn.cns.record(labelDomain, 'No.such.record'),
      ResolutionErrorCode.RecordNotFound,
    );
  });

  it('checks the ipfs redirect_domain record', async () => {
    const namicorn = new Namicorn();
    const eyes = mockAsyncMethods(namicorn.cns, {
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      getRecord: 'www.unstoppabledomains.com',
    });
    const ipfs_redirect_domain = await namicorn.cns.record(
      labelDomain,
      'ipfs.redirect_domain',
    );
    expectSpyToBeCalled(eyes);
    expect(ipfs_redirect_domain).toBe('www.unstoppabledomains.com');
  });

  it(`checks the BCH address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const eyes = mockCryptoCalls(
      namicorn.cns,
      'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
    );
    const addr = await namicorn.cns.address(labelDomain, 'BCH');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6');
  });

  it(`checks the BTC address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const eyes = mockCryptoCalls(
      namicorn.cns,
      '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
    );
    const addr = await namicorn.cns.address(labelDomain, 'BTC');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB');
  });

  it(`checks the DASH address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const eyes = mockCryptoCalls(
      namicorn.cns,
      'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
    );
    const addr = await namicorn.cns.address(labelDomain, 'DASH');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j');
  });

  it(`checks the ETH address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const eyes = mockCryptoCalls(
      namicorn.cns,
      '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
    );
    const addr = await namicorn.cns.address(labelDomain, 'ETH');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('0x45b31e01AA6f42F0549aD482BE81635ED3149abb');
  });

  it(`checks the LTC address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const eyes = mockCryptoCalls(
      namicorn.cns,
      'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
    );
    const addr = await namicorn.cns.address(labelDomain, 'LTC');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL');
  });

  it(`checks the XMR address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const eyes = mockCryptoCalls(
      namicorn.cns,
      '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
    );
    const addr = await namicorn.cns.address(labelDomain, 'XMR');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe(
      '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
    );
  });

  it(`checks the ZEC address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const eyes = mockCryptoCalls(
      namicorn.cns,
      't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
    );
    const addr = await namicorn.cns.address(labelDomain, 'ZEC');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('t1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV');
  });

  it(`checks the ZIL address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const eyes = mockCryptoCalls(
      namicorn.cns,
      'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
    );
    const addr = await namicorn.cns.address(labelDomain, 'ZIL');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj');
  });
});
