import Resolution from './index';
import { ResolutionErrorCode } from './errors/resolutionError';
import { NullAddress, NamingServiceName } from './types';
import {
  CryptoDomainWithAdaBchAddresses,
  CryptoDomainWithEmail,
  CryptoDomainWithEmptyResolver,
  CryptoDomainWithoutResolver,
  CryptoDomainWithIpfsRecords,
  mockAsyncMethods,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
  protocolLink,
} from './tests/helpers';

try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch (err) {
  console.warn('dotenv is not installed');
}

let resolution: Resolution;

beforeEach(() => {
  jest.restoreAllMocks();
  resolution = new Resolution({
    blockchain: { cns: { url: protocolLink() } },
  });
});

const mockCryptoCalls = (
  object,
  mockAddress: string,
): jest.SpyInstance<any, unknown[]>[] => {
  const eyes = mockAsyncMethods(object, {
    getResolver: '0xa1cac442be6673c49f8e74ffc7c4fd746f3cbd0d',
    getRecord: mockAddress,
  });
  return eyes;
};

describe('CNS', () => {
  it('should define the default cns contract', () => {
    expect(resolution.cns).toBeDefined();
    expect(resolution.cns!.network).toBe('mainnet');
    expect(resolution.cns!.url).toBe(protocolLink());
  });

  it('checks the record by key', async () => {
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0xa1cac442be6673c49f8e74ffc7c4fd746f3cbd0d',
      getRecord: 'QmVJ26hBrwwNAPVmLavEFXDUunNDXeFSeMPmHuPxKe6dJv',
    });
    const ipfsHash = await resolution.record(CryptoDomainWithIpfsRecords, 'ipfs.html.value');
    expectSpyToBeCalled(eyes);
    expect(ipfsHash).toBe('QmVJ26hBrwwNAPVmLavEFXDUunNDXeFSeMPmHuPxKe6dJv');
  });

  it('Should return NoRecord Resolution error', async () => {
    const spies = mockAsyncMethods(resolution.cns, {
      getResolver: '0xa1cac442be6673c49f8e74ffc7c4fd746f3cbd0d',
      getRecord: undefined,
    });
    await expectResolutionErrorCode(
      resolution.record(CryptoDomainWithEmptyResolver, 'No.such.record'),
      ResolutionErrorCode.RecordNotFound,
    );
    expectSpyToBeCalled(spies);
  });

  it('should return a valid resolver address', async () => {
    const spies = mockAsyncMethods(resolution.cns, {
      getResolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
    });
    const resolverAddress = await resolution.resolver(CryptoDomainWithEmptyResolver);
    expectSpyToBeCalled(spies);
    expect(resolverAddress).toBe('0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3');
  });

  it('should not find a resolver address', async () => {
    const spies = mockAsyncMethods(resolution.cns, {
      getResolver: undefined,
      owner: NullAddress,
    });
    await expectResolutionErrorCode(
      resolution.resolver('unknown-unknown-938388383.crypto'),
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
      resolution.resolver(CryptoDomainWithoutResolver),
      ResolutionErrorCode.UnspecifiedResolver,
    );
    expectSpyToBeCalled(spies);
  });

  describe('.Crypto', () => {
    it('should work without any configs', async () => {
      resolution = new Resolution();
      const eyes = mockCryptoCalls(
        resolution.cns,
        '0x8aaD44321A86b170879d7A244c1e8d360c99DdA8',
      );
      const address = await resolution.address('brad.crypto', 'eth');
      expectSpyToBeCalled(eyes);
      expect(address).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    })

    it(`checks the BCH address on ${CryptoDomainWithAdaBchAddresses}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        'qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8',
      );
      const addr = await resolution.address(CryptoDomainWithAdaBchAddresses, 'BCH');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8');
    });

    it(`checks the ADA address on ${CryptoDomainWithAdaBchAddresses}`, async () => {
      const eyes = mockCryptoCalls(
        resolution.cns,
        'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
      );
      const addr = await resolution.address(CryptoDomainWithAdaBchAddresses, 'ADA');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj');
    });

  });

  describe('.Hashing', () => {
    describe('.Namehash', () => {
      it('supports root node', async () => {
        const cns = resolution;
        expect(resolution.isSupportedDomain('crypto')).toEqual(true);
        expect(resolution.namehash('crypto')).toEqual(
          '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
        );
      });

      it('starts with -', async () => {
        const cns = resolution;
        expect(resolution.isSupportedDomain('-hello.crypto')).toEqual(true);
        expect(resolution.namehash('-hello.crypto')).toBe(
          '0xc4ad028bcae9b201104e15f872d3e85b182939b06829f75a128275177f2ff9b2',
        );
      });

      it('ends with -', async () => {
        const cns = resolution;
        expect(resolution.isSupportedDomain('hello-.crypto')).toEqual(true);
        expect(resolution.namehash('hello-.crypto')).toBe(
          '0x82eaa6ef14e438940bfd7747e0e4c4fec42af20cee28ddd0a7d79f52b1c59b72',
        );
      });

      it('starts and ends with -', async () => {
        const cns = resolution.cns;
        expect(resolution.isSupportedDomain('-hello-.crypto')).toEqual(true);
        expect(resolution.namehash('-hello-.crypto')).toBe(
          '0x90cc1963ff09ce95ee2dbb3830df4f2115da9756e087a50283b3e65f6ffe2a4e',
        );
      });

      it('should throw UnregisteredDomain', async () => {
        const eyes = mockAsyncMethods(resolution.cns, {
          getResolver: undefined,
          owner: '0x0000000000000000000000000000000000000000',
        });

        await expectResolutionErrorCode(
          resolution.cns!.address('unregistered.crypto', 'ETH'),
          ResolutionErrorCode.UnregisteredDomain,
        );
        expectSpyToBeCalled(eyes);
      });
    });

    describe('.Childhash', () => {
      it('checks root crypto domain', () => {
        const cns = resolution.cns;
        const rootHash =
          '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f';
        expect(resolution.namehash('crypto')).toBe(rootHash);
        expect(
          resolution.childhash(
            '0000000000000000000000000000000000000000000000000000000000000000',
            'crypto',
            NamingServiceName.CNS,
          ),
        ).toBe(rootHash);
      });

      it('checks the childhash functionality', () => {
        const cns = resolution.cns;
        const namehash = resolution.namehash('hello.world.crypto');
        const childhash = resolution.childhash(
          resolution.namehash('world.crypto'),
          'hello',
          NamingServiceName.CNS,
        );
        expect(namehash).toBe(childhash);
      });

      it('checks childhash multi level domain', () => {
        const cns = resolution.cns;
        const label = 'ich';
        const parent = 'ni.san.yon.hello.world.crypto'
        const domain = `${label}.${parent}`;
        const namehash = resolution.namehash(domain);
        const childhash = resolution.childhash(
          resolution.namehash(parent),
          'ich',
          NamingServiceName.CNS,
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
        getRecord: 'QmVJ26hBrwwNAPVmLavEFXDUunNDXeFSeMPmHuPxKe6dJv',
      });
      const ipfsHash = await resolution.ipfsHash(CryptoDomainWithIpfsRecords);
      expectSpyToBeCalled(spies);
      expect(ipfsHash).toBe(
        'QmVJ26hBrwwNAPVmLavEFXDUunNDXeFSeMPmHuPxKe6dJv',
      );
    });

    it('should resolve with email stored on cns', async () => {
      const spies = mockAsyncMethods(resolution.cns, {
        getResolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
        getRecord: 'paul@unstoppabledomains.com',
      });
      const email = await resolution.email(CryptoDomainWithEmail);
      expectSpyToBeCalled(spies);
      expect(email).toBe(
        'paul@unstoppabledomains.com',
      );
    });

    it('should resolve with httpUrl stored on cns', async () => {
      const eyes = mockAsyncMethods(resolution.cns, {
        getResolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
        getRecord: 'https://unstoppabledomains.com/',
      });
      const httpUrl = await resolution.httpUrl(CryptoDomainWithIpfsRecords);
      expectSpyToBeCalled(eyes);
      expect(httpUrl).toBe(
        'https://unstoppabledomains.com/',
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

    it('should throw UnspecifiedResolver for chatId', async () => {
      const resolution = new Resolution({blockchain: {cns: {url: protocolLink()}}});
      const eyes = mockAsyncMethods(resolution.cns, {
        owner: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
        getResolver: undefined,
      });
      await expectResolutionErrorCode(resolution.chatId(CryptoDomainWithoutResolver), ResolutionErrorCode.UnspecifiedResolver);
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

    it('should error out for gundb public key stored on cns', async () => {
      const eyes = mockAsyncMethods(resolution.cns, {
        getResolver:'0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
        getRecord: undefined
      });
      await expectResolutionErrorCode(resolution.chatPk(CryptoDomainWithEmptyResolver), ResolutionErrorCode.RecordNotFound)
      expectSpyToBeCalled(eyes);
    });

    it('should error out for gundb chatId stored on cns', async () => {
      const eyes = mockAsyncMethods(resolution.cns, {
        getResolver:'0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
        getRecord: undefined
      });
      await expectResolutionErrorCode(resolution.chatId(CryptoDomainWithEmptyResolver), ResolutionErrorCode.RecordNotFound)
      expectSpyToBeCalled(eyes);
    });
  });
});
