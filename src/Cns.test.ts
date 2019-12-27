import Resolution from '.';
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
    const resolution = new Resolution();
    expect(resolution.cns).toBeDefined();
    expect(resolution.cns.network).toBe('mainnet');
    expect(resolution.cns.url).toBe('https://mainnet.infura.io');
  });

  it('checks the IPFS hash record', async () => {
    const resolution = new Resolution();
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      getRecord: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
    });
    const ipfs_hash = await resolution.cns.record(labelDomain, 'ipfs.html2');
    expectSpyToBeCalled(eyes);
    expect(ipfs_hash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('Should return NoRecord Resolution error', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      resolution.cns.record(labelDomain, 'No.such.record'),
      ResolutionErrorCode.RecordNotFound,
    );
  });

  it('checks the ipfs redirect_domain record', async () => {
    const resolution = new Resolution();
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      getRecord: 'www.unstoppabledomains.com',
    });
    const ipfs_redirect_domain = await resolution.cns.record(
      labelDomain,
      'ipfs.redirect_domain',
    );
    expectSpyToBeCalled(eyes);
    expect(ipfs_redirect_domain).toBe('www.unstoppabledomains.com');
  });

  it(`checks the BCH address on ${labelDomain}`, async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
    );
    const addr = await resolution.cns.address(labelDomain, 'BCH');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6');
  });

  it(`checks the BTC address on ${labelDomain}`, async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
    );
    const addr = await resolution.cns.address(labelDomain, 'BTC');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB');
  });

  it(`checks the DASH address on ${labelDomain}`, async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
    );
    const addr = await resolution.cns.address(labelDomain, 'DASH');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j');
  });

  it(`checks the ETH address on ${labelDomain}`, async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
    );
    const addr = await resolution.cns.address(labelDomain, 'ETH');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('0x45b31e01AA6f42F0549aD482BE81635ED3149abb');
  });

  it(`checks the LTC address on ${labelDomain}`, async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
    );
    const addr = await resolution.cns.address(labelDomain, 'LTC');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL');
  });

  it(`checks the XMR address on ${labelDomain}`, async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
    );
    const addr = await resolution.cns.address(labelDomain, 'XMR');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe(
      '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
    );
  });

  it(`checks the ZEC address on ${labelDomain}`, async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
    );
    const addr = await resolution.cns.address(labelDomain, 'ZEC');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('t1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV');
  });

  it(`checks the ZIL address on ${labelDomain}`, async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
    );
    const addr = await resolution.cns.address(labelDomain, 'ZIL');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj');
  });

  it('checks it from resolution main object', async () => {
    const resolution = new Resolution();
    const eyes = mockCryptoCalls(
      resolution.cns,
      'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
    );
    const addr = await resolution.address(labelDomain, 'ZIL');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj');
  });

  describe('namehash', () => {
    it('supports root node', async () => {
      const resolution = new Resolution();
      expect(resolution.isSupportedDomain('crypto')).toEqual(true);
      expect(new Resolution().namehash('crypto')).toEqual(
        '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
      );
    });
  });

  describe('meta data', () => {
    const domain = 'reseller-test-ryan019.crypto';
    it('should resolve with ipfs stored on cns', async () => {
      const resolution = new Resolution();
      const ipfsHash = await resolution.ipfsHash(domain);
      expect(ipfsHash).toBe(
        '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      );
    });

    it('should resolve with email stored on cns', async () => {
      const resolution = new Resolution();
      const email = await resolution.email(domain);
      expect(email).toBe(
        '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      );
    });

    it('should resolve with httpUrl stored on cns', async () => {
      const resolution = new Resolution();
      const httpUrl = await resolution.httpUrl(domain);
      expect(httpUrl).toBe(
        '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      );
      expect(resolution.namehash('crypto')).toEqual('0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f');
    });

    it('starts with -', async () => {
      const resolution = new Resolution();
      expect(resolution.isSupportedDomain('-hello.crypto')).toEqual(true);
      expect(resolution.namehash('-hello.crypto')).toBe('0xc4ad028bcae9b201104e15f872d3e85b182939b06829f75a128275177f2ff9b2');
    })

    it('ends with -', async () => {
      const resolution = new Resolution();
      expect(resolution.isSupportedDomain('hello-.crypto')).toEqual(true);
      expect(resolution.namehash('hello-.crypto')).toBe('0x82eaa6ef14e438940bfd7747e0e4c4fec42af20cee28ddd0a7d79f52b1c59b72');
    })

    it('starts and ends with -', async () => {
      const resolution = new Resolution();
      expect(resolution.isSupportedDomain('-hello-.crypto')).toEqual(true);
      expect(resolution.namehash('-hello-.crypto')).toBe('0x90cc1963ff09ce95ee2dbb3830df4f2115da9756e087a50283b3e65f6ffe2a4e');
    })
  });
});
