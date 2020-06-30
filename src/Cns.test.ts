import Resolution from './index';
import {
  mockAsyncMethods,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
  secretInfuraLink,
} from './utils/testHelpers';
import { ResolutionErrorCode } from './resolutionError';
import { NullAddress } from './types';

try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch (err) {
  console.warn('dotenv is not installed');
}

const domain = 'reseller-test-braden-6.crypto';
let resolution: Resolution;
beforeEach(() => {
  jest.restoreAllMocks();
  resolution = new Resolution({
    blockchain: { cns: { url: secretInfuraLink() } },
  });
});

const mockCryptoCalls = (
  object,
  mockAddress: string,
): jest.SpyInstance<any, unknown[]>[] => {
  const eyes = mockAsyncMethods(object, {
    getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
    getRecord: mockAddress,
  });
  return eyes;
};

describe('CNS', () => {
  it('should define the default cns contract', () => {
    expect(resolution.cns).toBeDefined();
    expect(resolution.cns!.network).toBe('mainnet');
    expect(resolution.cns!.url).toBe(secretInfuraLink());
  });

  it('checks the IPFS hash record', async () => {
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      getRecord: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
    });
    const ipfsHash = await resolution.cns!.record(domain, 'ipfs.html2');
    expectSpyToBeCalled(eyes);
    expect(ipfsHash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('Should return NoRecord Resolution error', async () => {
    const spies = mockAsyncMethods(resolution.cns, {
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      getRecord: undefined,
    });
    await expectResolutionErrorCode(
      resolution.record(domain, 'No.such.record'),
      ResolutionErrorCode.RecordNotFound,
    );
    expectSpyToBeCalled(spies);
  });

  it('checks the ipfs redirect_domain record', async () => {
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      getRecord: 'www.unstoppabledomains.com',
    });
    const ipfs_redirect_domain = await resolution.cns!.record(
      domain,
      'ipfs.redirect_domain',
    );
    expectSpyToBeCalled(eyes);
    expect(ipfs_redirect_domain).toBe('www.unstoppabledomains.com');
  });

  it('checks it from resolution main object', async () => {
    const eyes = mockCryptoCalls(
      resolution.cns,
      'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
    );
    const addr = await resolution.address(domain, 'ZIL');
    expectSpyToBeCalled(eyes);
    expect(addr).toBe('zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj');
  });

  it('should return a valid resolver address', async () => {
    const spies = mockAsyncMethods(resolution.cns, {
      getResolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
    });
    const resolverAddress = await resolution.cns!.resolver('brad.crypto');
    expectSpyToBeCalled(spies);
    expect(resolverAddress).toBe('0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D');
  });

  it('should not find a resolver address', async () => {
    const spies = mockAsyncMethods(resolution.cns, {
      getResolver: undefined,
      owner: NullAddress[1],
    });
    await expectResolutionErrorCode(
      resolution.cns!.resolver('empty.crypto'),
      ResolutionErrorCode.UnregisteredDomain,
    );
    expectSpyToBeCalled(spies);
  });

  it('should throw ResolutionError.UnspecifiedResolver', async () => {
    const spies = mockAsyncMethods(resolution.cns, {
      getResolver: undefined,
      owner: 'someowneraddress',
    });
    await expectResolutionErrorCode(
      resolution.cns!.resolver('pandorapay.crypto'),
      ResolutionErrorCode.UnspecifiedResolver,
    );
    expectSpyToBeCalled(spies);
  });

  describe('.Crypto', () => {
    it(`checks the BCH address on ${domain}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
      );
      const addr = await resolution.cns!.address(domain, 'BCH');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6');
    });

    it(`checks the BTC address on ${domain}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
      );
      const addr = await resolution.cns!.address(domain, 'BTC');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB');
    });

    it(`checks the DASH address on ${domain}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
      );
      const addr = await resolution.cns!.address(domain, 'DASH');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j');
    });

    it(`checks the ETH address on ${domain}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
      );
      const addr = await resolution.cns!.address(domain, 'ETH');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('0x45b31e01AA6f42F0549aD482BE81635ED3149abb');
    });

    it(`checks the LTC address on ${domain}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
      );
      const addr = await resolution.cns!.address(domain, 'LTC');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL');
    });

    it(`checks the XMR address on ${domain}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
      );
      const addr = await resolution.cns!.address(domain, 'XMR');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe(
        '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
      );
    });

    it(`checks the ZEC address on ${domain}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
      );
      const addr = await resolution.cns!.address(domain, 'ZEC');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('t1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV');
    });

    it(`checks the ZIL address on ${domain}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
      );
      const addr = await resolution.cns!.address(domain, 'ZIL');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj');
    });
  });

  describe('.Hashing', () => {
    describe('.Namehash', () => {
      it('supports root node', async () => {
        const cns = resolution.cns;
        expect(cns!.isSupportedDomain('crypto')).toEqual(true);
        expect(cns!.namehash('crypto')).toEqual(
          '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
        );
      });

      it('starts with -', async () => {
        const cns = resolution.cns;
        expect(cns!.isSupportedDomain('-hello.crypto')).toEqual(true);
        expect(cns!.namehash('-hello.crypto')).toBe(
          '0xc4ad028bcae9b201104e15f872d3e85b182939b06829f75a128275177f2ff9b2',
        );
      });

      it('ends with -', async () => {
        const cns = resolution.cns;
        expect(cns!.isSupportedDomain('hello-.crypto')).toEqual(true);
        expect(cns!.namehash('hello-.crypto')).toBe(
          '0x82eaa6ef14e438940bfd7747e0e4c4fec42af20cee28ddd0a7d79f52b1c59b72',
        );
      });

      it('starts and ends with -', async () => {
        const cns = resolution.cns;
        expect(cns!.isSupportedDomain('-hello-.crypto')).toEqual(true);
        expect(cns!.namehash('-hello-.crypto')).toBe(
          '0x90cc1963ff09ce95ee2dbb3830df4f2115da9756e087a50283b3e65f6ffe2a4e',
        );
      });

      it('should throw UnregisteredDomain', async () => {
        const eyes = mockAsyncMethods(resolution.cns, {
          getResolver: undefined,
          owner: '0x0000000000000000000000000000000000000000'
        });
        await expectResolutionErrorCode(
          resolution.cns!.address('unregistered.crypto', "ETH"),
          ResolutionErrorCode.UnregisteredDomain
        );
        expectSpyToBeCalled(eyes);
      })
    });

    describe('.Childhash', () => {
      it('checks root crypto domain', () => {
        const cns = resolution.cns;
        const rootHash =
          '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f';
        expect(cns!.namehash('crypto')).toBe(rootHash);
        expect(
          cns!.childhash(
            '0000000000000000000000000000000000000000000000000000000000000000',
            'crypto',
          ),
        ).toBe(rootHash);
      });

      it('checks the childhash functionality', () => {
        const cns = resolution.cns;
        const domain = 'hello.world.crypto';
        const namehash = cns!.namehash(domain);
        const childhash = cns!.childhash(
          cns!.namehash('world.crypto'),
          'hello',
        );
        expect(namehash).toBe(childhash);
      });

      it('checks childhash multi level domain', () => {
        const cns = resolution.cns;
        const domain = 'ich.ni.san.yon.hello.world.crypto';
        const namehash = cns!.namehash(domain);
        const childhash = cns!.childhash(
          cns!.namehash('ni.san.yon.hello.world.crypto'),
          'ich',
        );
        expect(childhash).toBe(namehash);
      });
    });
  });

  describe('.Metadata', () => {
    const domain = 'reseller-test-ryan019.crypto';
    it('should resolve with ipfs stored on cns', async () => {
      const spies = mockAsyncMethods(resolution.cns, {
        getResolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
        getRecord: '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      });
      const ipfsHash = await resolution.ipfsHash(domain);
      expectSpyToBeCalled(spies);
      expect(ipfsHash).toBe(
        '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      );
    });

    it('should resolve with email stored on cns', async () => {
      const spies = mockAsyncMethods(resolution.cns, {
        getResolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
        getRecord: '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      });
      const email = await resolution.email(domain);
      expectSpyToBeCalled(spies);
      expect(email).toBe(
        '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      );
    });

    it('should resolve with httpUrl stored on cns', async () => {
      const eyes = mockAsyncMethods(resolution.cns, {
        getResolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
        getRecord: '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      });
      const httpUrl = await resolution.httpUrl(domain);
      expectSpyToBeCalled(eyes);
      expect(httpUrl).toBe(
        '0x033dc48b5db4ca62861643e9d2c411d9eb6d1975@gmail.com',
      );
      expect(resolution.namehash('crypto')).toEqual(
        '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
      );
    });

    it('should resolve with the gundb chatId stored on cns', async () => {
      const eyes = mockAsyncMethods(resolution.cns, {
        getResolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
        getRecord: '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
      });
      const chatId = await resolution.chatId('brad.crypto');
      expectSpyToBeCalled(eyes);
      expect(chatId).toBe('0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c');
    });

    it('should resolve with the gundb public key stored on cns', async () => {
      const eyes = mockAsyncMethods(resolution.cns,{
        getResolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
        getRecord: 'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI'
      });
      const publicKey = await resolution.chatPk('brad.crypto');
      expectSpyToBeCalled(eyes);
      expect(publicKey).toBe('pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI');
    });

    it('should error out for gundb chatId and public key stored on cns', async () => {
      const eyes = mockAsyncMethods(resolution.cns, {
        getResolver:'0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
        getRecord: undefined
      });
      await expectResolutionErrorCode(resolution.cns!.chatpk('homecakes.crypto'), ResolutionErrorCode.RecordNotFound)
      expectSpyToBeCalled(eyes);
    });

  });
});
