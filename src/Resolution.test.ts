import nock from 'nock';
import Resolution, { ResolutionErrorCode } from './index';
import {
  UnclaimedDomainResponse,
  NamingServiceName,
  JsonRpcPayload,
  RpcProviderTestCase,
} from './types';
import { JsonRpcProvider, getDefaultProvider } from '@ethersproject/providers';
import Web3HttpProvider from 'web3-providers-http';
import Web3WsProvider from 'web3-providers-ws';
import Web3V027Provider from 'web3-0.20.7/lib/web3/httpprovider';

import {
  expectResolutionErrorCode,
  expectSpyToBeCalled,
  mockAsyncMethods,
  protocolLink,
  ProviderProtocol,
  caseMock,
  mockAsyncMethod,
} from './tests/helpers';
import _ from 'lodash';

try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch (err) {
  console.warn('dotenv is not installed');
}

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

describe('Resolution', () => {
  it('should get a valid resolution instance', async () => {
    const resolution = Resolution.infura('api-key');
    expect(resolution.ens).toBeDefined();
    expect(resolution.ens!.url).toBe(`https://mainnet.infura.com/v3/api-key`);

    expect(resolution.cns).toBeDefined();
    expect(resolution.cns!.url).toBe(`https://mainnet.infura.com/v3/api-key`);
  });

  it('checks Resolution#addressOrThrow error #1', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      resolution.addressOrThrow('sdncdoncvdinvcsdncs.zil', 'ZIL'),
      ResolutionErrorCode.UnregisteredDomain,
    );
  });

  it('checks Resolution#addressOrThrow error #2', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      resolution.addressOrThrow('brad.zil', 'INVALID_CURRENCY_SYMBOL'),
      ResolutionErrorCode.UnspecifiedCurrency,
    );
  });

  it('resolves non-existing domain zone with throw', async () => {
    const resolution = new Resolution({ blockchain: true });
    await expectResolutionErrorCode(
      resolution.addressOrThrow('bogdangusiev.qq', 'ZIL'),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it('resolves non-existing domain zone via safe address', async () => {
    const resolution = new Resolution({ blockchain: true });
    const result = await resolution.address('bogdangusiev.qq', 'ZIL');
    expect(result).toEqual(null);
  });

  it('provides empty response constant', async () => {
    const response = UnclaimedDomainResponse;
    expect(response.addresses).toEqual({});
    expect(response.meta.owner).toEqual(null);
  });

  it('checks the isSupportedDomainInNetwork', async () => {
    const resolution = new Resolution();
    const result = resolution.isSupportedDomainInNetwork('brad.zil');
    expect(result).toBe(true);
  });

  it('checks namehash for unsupported domain', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      () => resolution.namehash('something.hello.com'),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it('checks return of IPFS hash for brad.zil', async () => {
    const resolution = new Resolution();
    const spies = mockAsyncMethods(resolution.zns, {
      records: {
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
      },
    });
    const hash = await resolution.ipfsHash('brad.zil');
    expectSpyToBeCalled(spies);
    expect(hash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('checks return of email for ergergergerg.zil', async () => {
    const resolution = new Resolution();
    const email = await resolution.email('ergergergerg.zil');
    expect(email).toBe('matt+test@unstoppabledomains.com');
  });

  it('checks error for  email on brad.zil', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      resolution.email('brad.zil'),
      ResolutionErrorCode.RecordNotFound,
    );
  });

  it('should be invalid domain', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      () => resolution.namehash('-hello.eth'),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it('should be invalid domain 2', async () => {
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      () => resolution.namehash('whatever-.eth'),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it('should be invalid domain 3', async () => {
    const cnsInvalidDomain = 'hello..crypto';
    const ensInvalidDomain = 'hello..eth';
    const znsInvalidDomain = 'hello..zil';
    const resolution = new Resolution();
    await expectResolutionErrorCode(
      () => resolution.namehash(cnsInvalidDomain),
      ResolutionErrorCode.UnsupportedDomain,
    );
    await expectResolutionErrorCode(
      () => resolution.namehash(ensInvalidDomain),
      ResolutionErrorCode.UnsupportedDomain,
    );
    await expectResolutionErrorCode(
      () => resolution.namehash(znsInvalidDomain),
      ResolutionErrorCode.UnsupportedDomain,
    );
  });

  it(`domains "brad.crypto" and "Brad.crypto" should return the same results`, async () => {
    const resolution = new Resolution({ blockchain: { cns: { url: protocolLink() } } });
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
      getRecord: "0x45b31e01AA6f42F0549aD482BE81635ED3149abb",
    });
    const capital = await resolution.addressOrThrow('Brad.crypto', 'eth');
    expectSpyToBeCalled(eyes);
    const lower = await resolution.addressOrThrow('brad.crypto', 'eth');
    expectSpyToBeCalled(eyes);
    expect(capital).toStrictEqual(lower);
  });

  it('should resolve gundb chat id', async () => {
    const resolution = new Resolution({
      blockchain: { cns: { url: protocolLink() } },
    });
    const eyes = mockAsyncMethods(resolution.cns, {
      getResolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
      getRecord:
        '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
    });
    const gundb = await resolution.chatId('homecakes.crypto');
    expectSpyToBeCalled(eyes);
    expect(gundb).toBe(
      '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
    );
  });

  describe('serviceName', () => {
    it('checks ens service name', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.eth');
      expect(serviceName).toBe('ENS');
    });

    it('checks ens service name 2', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.luxe');
      expect(serviceName).toBe('ENS');
    });

    it('checks ens service name', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.xyz');
      expect(serviceName).toBe('ENS');
    });

    it('checks zns service name', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.zil');
      expect(serviceName).toBe('ZNS');
    });

    it('checks cns service name', () => {
      const resolution = new Resolution();
      const serviceName = resolution.serviceName('domain.crypto');
      expect(serviceName).toBe('CNS');
    });

    it('checks naming service via api', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.zil');
      expect(serviceName).toBe('ZNS');
    });

    it('checks naming service via api 2', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.luxe');
      expect(serviceName).toBe('ENS');
    });

    it('checks naming service via api 3', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.xyz');
      expect(serviceName).toBe('ENS');
    });

    it('checks naming service via api 4', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.eth');
      expect(serviceName).toBe('ENS');
    });

    it('checks naming service via api 5', () => {
      const resolution = new Resolution({ blockchain: false });
      const serviceName = resolution.serviceName('domain.crypto');
      expect(serviceName).toBe('CNS');
    });
  });

  describe('isValidHash', () => {
    it('works', async () => {
      const resolution = new Resolution();
      const domain = 'hello.world.zil';
      const hash = resolution.namehash(domain);
      const invalidHash = resolution.namehash('world.zil');
      expect(resolution.isValidHash(domain, hash)).toEqual(true);
      expect(resolution.isValidHash(domain, invalidHash)).toEqual(false);
    });
  });

  describe('.Hashing', () => {
    describe('.childhash', () => {
      it('checks childhash', () => {
        const resolution = new Resolution();
        const domain = 'hello.world.zil';
        const namehash = resolution.namehash(domain);
        const childhash = resolution.childhash(
          resolution.namehash('world.zil'),
          'hello',
          NamingServiceName.ZNS,
        );
        expect(childhash).toBe(namehash);
      });

      it('checks childhash multi level domain', () => {
        const cns = new Resolution().cns!;
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

  describe('Providers', () => {
    

    const RpcProviderTestCases: RpcProviderTestCase = [
      {
        request: {
          data: '0xb3f9e4cb756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
          to: '0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe'
        },
        response: '0x000000000000000000000000b66dce2da6afaaa98f2013446dbcb0f4b0ab2842'
      },
      {
        request: {
          data: '0x6352211e756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
          to: '0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe'
        },
        response: '0x000000000000000000000000b66dce2da6afaaa98f2013446dbcb0f4b0ab2842'
      },
      {
        request: {
          data: '0x1be5e7ed0000000000000000000000000000000000000000000000000000000000000040756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9000000000000000000000000000000000000000000000000000000000000001263727970746f2e4554482e616464726573730000000000000000000000000000',
          to: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842'
        },
        response: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002a30783861614434343332314138366231373038373964374132343463316538643336306339394464413800000000000000000000000000000000000000000000'
      },
      {
        request: {
          data:
            '0xb85afd280000000000000000000000000000000000000000000000000000000000000040756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc90000000000000000000000000000000000000000000000000000000000000006aa1f9c71162a941b0b8aaf14a6b55de3f638ebba71265f82cfed7d62fdade8babe5ec5900cbad32d5e6a09d351e30152af0f8a668990e8a069a046cd901a40f36c4ebae0d49853c4d2b717faf94d4f4bbcd5bfe4bf0c8ab3f537e17f1fb0a3dc347aeff9a713930c44e91963f79529d7eff5c81bb36b51efb653a00db64170d654bba09965e442befd44887c2c6b7038f742bb98fbd66e2f2f192ce924f7c23d0daa4091e55cb3648e25d25c59450ef65b5e9909619a703f337b13e395c23c60',
          to: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842'
        },
        response: '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001467756e64622e757365726e616d652e76616c7565000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f697066732e68746d6c2e76616c75650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a697066732e72656469726563745f646f6d61696e2e76616c7565000000000000000000000000000000000000000000000000000000000000000000000000001263727970746f2e4554482e616464726573730000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001667756e64622e7075626c69635f6b65792e76616c756500000000000000000000000000000000000000000000000000000000000000000000000000000000001263727970746f2e4254432e616464726573730000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000002e00000000000000000000000000000000000000000000000000000000000000360000000000000000000000000000000000000000000000000000000000000008430783839313236323338333265313734663265623166353963633362353837343434643631393337366164356266313030373065393337653064633232623966666232653361653035396536656266373239663837373436623266373165356438386563393963316662336337633439623836313765323532306434373463343865316300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002e516d6535346f457a526b676f6f4a624344723738767a4b41576376364444455a71526868447944747a67725a5036000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006b68747470733a2f2f6162626665367a3935716f76336434306866366a3330673761756f37616668702e6d7970696e6174612e636c6f75642f697066732f516d6535346f457a526b676f6f4a624344723738767a4b41576376364444455a71526868447944747a67725a5036000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a3078386161443434333231413836623137303837396437413234346331653864333630633939446441380000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000577071654248616244516443486862646976674e45633734514f2d7838435047587134504b576766497a68592e37574a5235635a467553796831624677783047577a6a6d72696d305435593642703053534b30696d336e49000000000000000000000000000000000000000000000000000000000000000000000000000000002a626331713335396b686e3070686735387867657a797173757561686132387a6b7778303437633063337900000000000000000000000000000000000000000000'
      },
      {
        request: {
          fromBlock: '0x960844',
          toBlock: 'latest',
          address: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          topics:
            ['0x7ae4f661958fbecc2f77be6b0eb280d2a6f604b29e1e7221c82b9da0c4af7f86',
              '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9']
        },
        response: [
          { blockNumber: 10069383,
          blockHash:
           '0x962ac04ad46d9cd88ee5e53200b4c0f6ec4fbac1c6f42e352300a28d8b623dfb',
          transactionIndex: 109,
          removed: false,
          address: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          data:
           '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001467756e64622e757365726e616d652e76616c7565000000000000000000000000',
          topics:
           [ '0x7ae4f661958fbecc2f77be6b0eb280d2a6f604b29e1e7221c82b9da0c4af7f86',
             '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
             '0xaa1f9c71162a941b0b8aaf14a6b55de3f638ebba71265f82cfed7d62fdade8ba' ],
          transactionHash:
           '0xf2caa45e13dcc3768b6b79d05288cb3b70eef6b855e6c68b1ebae8cef10005dd',
          logIndex: 111 },
        { blockNumber: 10081381,
          blockHash:
           '0x4525e019c902296a03832e4e9729bca5a4b58fc588689b94dbe7f9cb75935ff7',
          transactionIndex: 99,
          removed: false,
          address: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          data:
           '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000f697066732e68746d6c2e76616c75650000000000000000000000000000000000',
          topics:
           [ '0x7ae4f661958fbecc2f77be6b0eb280d2a6f604b29e1e7221c82b9da0c4af7f86',
             '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
             '0xbe5ec5900cbad32d5e6a09d351e30152af0f8a668990e8a069a046cd901a40f3' ],
          transactionHash:
           '0x29bc07a5ddf38568e2b843a908e9a16cb02a01828992454798f0bc00baede24e',
          logIndex: 191 },
        { blockNumber: 10081381,
          blockHash:
           '0x4525e019c902296a03832e4e9729bca5a4b58fc588689b94dbe7f9cb75935ff7',
          transactionIndex: 99,
          removed: false,
          address: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          data:
           '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001a697066732e72656469726563745f646f6d61696e2e76616c7565000000000000',
          topics:
           [ '0x7ae4f661958fbecc2f77be6b0eb280d2a6f604b29e1e7221c82b9da0c4af7f86',
             '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
             '0x6c4ebae0d49853c4d2b717faf94d4f4bbcd5bfe4bf0c8ab3f537e17f1fb0a3dc' ],
          transactionHash:
           '0x29bc07a5ddf38568e2b843a908e9a16cb02a01828992454798f0bc00baede24e',
          logIndex: 194 },
        { blockNumber: 10146250,
          blockHash:
           '0x9a18d514a3e3819f0c33d8139746a1da03332236f8ed73529d1a9ba46f56be27',
          transactionIndex: 40,
          removed: false,
          address: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          data:
           '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001263727970746f2e4554482e616464726573730000000000000000000000000000',
          topics:
           [ '0x7ae4f661958fbecc2f77be6b0eb280d2a6f604b29e1e7221c82b9da0c4af7f86',
             '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
             '0x347aeff9a713930c44e91963f79529d7eff5c81bb36b51efb653a00db64170d6' ],
          transactionHash:
           '0xb3b56b2dc28c5d66590f36ad6b02275653351e058ed77c37a8f7e5567a986623',
          logIndex: 32 },
        { blockNumber: 10252371,
          blockHash:
           '0x313a596031d0416205bf2ea9bc35237744ca24caa548411a53b6a46b7976265a',
          transactionIndex: 86,
          removed: false,
          address: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          data:
           '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001667756e64622e7075626c69635f6b65792e76616c756500000000000000000000',
          topics:
           [ '0x7ae4f661958fbecc2f77be6b0eb280d2a6f604b29e1e7221c82b9da0c4af7f86',
             '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
             '0x54bba09965e442befd44887c2c6b7038f742bb98fbd66e2f2f192ce924f7c23d' ],
          transactionHash:
           '0x8c5cd12defb2f587d19955fe45fb46f7f7c334f7103b678aeee0a8cb763b026e',
          logIndex: 85 },
        { blockNumber: 10317163,
          blockHash:
           '0x4821036c80ac078177b04c1fc440365c750ba734f1b462cf2830e9564bfd10cc',
          transactionIndex: 59,
          removed: false,
          address: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          data:
           '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001263727970746f2e4254432e616464726573730000000000000000000000000000',
          topics:
           [ '0x7ae4f661958fbecc2f77be6b0eb280d2a6f604b29e1e7221c82b9da0c4af7f86',
             '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9',
             '0x0daa4091e55cb3648e25d25c59450ef65b5e9909619a703f337b13e395c23c60' ],
          transactionHash:
           '0xaca9621d50cc1afadcb2ffea77a72bf89c07b07bd0e573aa994277c213dfdb33',
          logIndex: 127 }
        ]
      },
      {
        request: { 
          data:'0xb85afd280000000000000000000000000000000000000000000000000000000000000040756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc90000000000000000000000000000000000000000000000000000000000000006aa1f9c71162a941b0b8aaf14a6b55de3f638ebba71265f82cfed7d62fdade8babe5ec5900cbad32d5e6a09d351e30152af0f8a668990e8a069a046cd901a40f36c4ebae0d49853c4d2b717faf94d4f4bbcd5bfe4bf0c8ab3f537e17f1fb0a3dc347aeff9a713930c44e91963f79529d7eff5c81bb36b51efb653a00db64170d654bba09965e442befd44887c2c6b7038f742bb98fbd66e2f2f192ce924f7c23d0daa4091e55cb3648e25d25c59450ef65b5e9909619a703f337b13e395c23c60',
         to: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842' },
         response: '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001467756e64622e757365726e616d652e76616c7565000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f697066732e68746d6c2e76616c75650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a697066732e72656469726563745f646f6d61696e2e76616c7565000000000000000000000000000000000000000000000000000000000000000000000000001263727970746f2e4554482e616464726573730000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001667756e64622e7075626c69635f6b65792e76616c756500000000000000000000000000000000000000000000000000000000000000000000000000000000001263727970746f2e4254432e616464726573730000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000002e00000000000000000000000000000000000000000000000000000000000000360000000000000000000000000000000000000000000000000000000000000008430783839313236323338333265313734663265623166353963633362353837343434643631393337366164356266313030373065393337653064633232623966666232653361653035396536656266373239663837373436623266373165356438386563393963316662336337633439623836313765323532306434373463343865316300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002e516d6535346f457a526b676f6f4a624344723738767a4b41576376364444455a71526868447944747a67725a5036000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006b68747470733a2f2f6162626665367a3935716f76336434306866366a3330673761756f37616668702e6d7970696e6174612e636c6f75642f697066732f516d6535346f457a526b676f6f4a624344723738767a4b41576376364444455a71526868447944747a67725a5036000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a3078386161443434333231413836623137303837396437413234346331653864333630633939446441380000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000577071654248616244516443486862646976674e45633734514f2d7838435047587134504b576766497a68592e37574a5235635a467553796831624677783047577a6a6d72696d305435593642703053534b30696d336e49000000000000000000000000000000000000000000000000000000000000000000000000000000002a626331713335396b686e3070686735387867657a797173757561686132387a6b7778303437633063337900000000000000000000000000000000000000000000'
      }
    ];

    it('should work with web3HttpProvider', async () => {
      // web3-providers-http has problems with type definitions
      // We still prefer everything to be statically typed on our end for better mocking
      const provider = new (Web3HttpProvider as any)(protocolLink()) as Web3HttpProvider.HttpProvider;
      // mock the send function with different implementations (each should call callback right away with different answers)
      const eye = mockAsyncMethod(provider, "send", (payload: JsonRpcPayload, callback) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases)
        callback && callback(null, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });
      const resolution = Resolution.fromWeb3Version1Provider(provider);
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');

      //expect each mock to be called at least once.
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    it('should work with webSocketProvider', async () => {
      // web3-providers-ws has problems with type definitions
      // We still prefer everything to be statically typed on our end for better mocking
      const provider = new (Web3WsProvider as any)(protocolLink(ProviderProtocol.wss)) as Web3WsProvider.WebsocketProvider;
      const eye = mockAsyncMethod(provider, "send", (payload, callback) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases)
        callback(null, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });

      const resolution = Resolution.fromWeb3Version1Provider(provider);
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');
      provider.disconnect(1000, 'end of test');
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    it('should work for ethers jsonrpc provider', async () => {
      const provider = new JsonRpcProvider(
        protocolLink(ProviderProtocol.http),
        'mainnet',
      );
      const resolution = Resolution.fromEthersProvider(provider);
      const eye = mockAsyncMethod(provider, "call",
        params => Promise.resolve(caseMock(params, RpcProviderTestCases))
      );
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    it('should work with ethers default provider', async () => {
      const provider = getDefaultProvider("mainnet");

      const eye = mockAsyncMethod(provider, "call",
        params => Promise.resolve(caseMock(params, RpcProviderTestCases))
      );
      const resolution = Resolution.fromEthersProvider(provider);
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'eth');
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    it('should work with web3@0.20.7 provider', async () => {
      const provider = new Web3V027Provider(protocolLink(ProviderProtocol.http), 5000, null, null, null);
      const eye = mockAsyncMethod(provider, "sendAsync", (payload: JsonRpcPayload, callback: any) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases)
        callback(undefined, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });
      const resolution = Resolution.fromWeb3Version0Provider(provider);
      const ethAddress = await resolution.addressOrThrow('brad.crypto', 'eth');
      expectSpyToBeCalled([eye]);
      expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
    });

    // Had to set quorum 1, to not rely on fallback providers which returns wrong results
    it('should be able to get logs with ethers default provider', async () => {
      const provider = getDefaultProvider('mainnet', { quorum: 1 });

      const eye = mockAsyncMethod(provider, "call", params => Promise.resolve(caseMock(params, RpcProviderTestCases)));
      const eye2 = mockAsyncMethod(provider, "getLogs", params => Promise.resolve(caseMock(params, RpcProviderTestCases)));

      const resolution = Resolution.fromEthersProvider(provider);
      const resp = await resolution.GetAllKeys("brad.crypto");
      expectSpyToBeCalled([eye, eye2]);
      expect(resp).toMatchObject(['gundb.username.value',
        'ipfs.html.value',
        'ipfs.redirect_domain.value',
        'crypto.ETH.address',
        'gundb.public_key.value',
        'crypto.BTC.address']);
    });

    it('should be able to get logs with web3@0.20.7 provider', async () => {
      const provider = new Web3V027Provider(protocolLink(ProviderProtocol.http), 5000, null, null, null);
      const eye = mockAsyncMethod(provider, "sendAsync", (payload: JsonRpcPayload, callback: any) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases)
        callback(undefined, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });
      const resolution = Resolution.fromWeb3Version0Provider(provider);
      const response = await resolution.GetAllKeys('brad.crypto');
      expectSpyToBeCalled([eye]);
      expect(response).toMatchObject(['gundb.username.value',
        'ipfs.html.value',
        'ipfs.redirect_domain.value',
        'crypto.ETH.address',
        'gundb.public_key.value',
        'crypto.BTC.address'])
    });

    it('should be able to get logs with jsonProvider', async () => {
      const provider = new JsonRpcProvider(
        protocolLink(ProviderProtocol.http),
        'mainnet',
      );
      const resolution = Resolution.fromEthersProvider(provider);
      const eye = mockAsyncMethod(provider, "call", params => Promise.resolve(caseMock(params, RpcProviderTestCases)));
      const eye2 = mockAsyncMethod(provider, "getLogs", params => Promise.resolve(caseMock(params, RpcProviderTestCases)));

      const response = await resolution.GetAllKeys('brad.crypto');
      expectSpyToBeCalled([eye, eye2]);
      expect(response).toMatchObject(['gundb.username.value',
      'ipfs.html.value',
      'ipfs.redirect_domain.value',
      'crypto.ETH.address',
      'gundb.public_key.value',
      'crypto.BTC.address']);
    });

    it('should be able to get logs with websocket provider', async () => {
      // web3-providers-ws has problems with type definitions
      // We still prefer everything to be statically typed on our end for better mocking
      const provider = new (Web3WsProvider as any)(protocolLink(ProviderProtocol.wss)) as Web3WsProvider.WebsocketProvider;
      const eye = mockAsyncMethod(provider, "send", (payload, callback) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases)
        callback(null, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });

      const resolution = Resolution.fromWeb3Version1Provider(provider);
      const response = await resolution.GetAllKeys('brad.crypto');
      provider.disconnect(1000, 'end of test');
      expectSpyToBeCalled([eye]);
      expect(response).toMatchObject(['gundb.username.value',
      'ipfs.html.value',
      'ipfs.redirect_domain.value',
      'crypto.ETH.address',
      'gundb.public_key.value',
      'crypto.BTC.address']);
    });

    it('should be able to get logs with web3HttpProvider', async () => {
       // web3-providers-http has problems with type definitions
      // We still prefer everything to be statically typed on our end for better mocking
      const provider = new (Web3HttpProvider as any)(protocolLink()) as Web3HttpProvider.HttpProvider;
      // mock the send function with different implementations (each should call callback right away with different answers)
      const eye = mockAsyncMethod(provider, "send", (payload: JsonRpcPayload, callback) => {
        const result = caseMock(payload.params![0], RpcProviderTestCases)
        callback && callback(null, {
          jsonrpc: '2.0',
          id: 1,
          result,
        });
      });
      const resolution = Resolution.fromWeb3Version1Provider(provider);
      const response = await resolution.GetAllKeys('brad.crypto');

      //expect each mock to be called at least once.
      expectSpyToBeCalled([eye]);
      expect(response).toMatchObject(['gundb.username.value',
      'ipfs.html.value',
      'ipfs.redirect_domain.value',
      'crypto.ETH.address',
      'gundb.public_key.value',
      'crypto.BTC.address']);
    })
  });
});
