import nock from 'nock';
import Resolution, { ResolutionErrorCode } from '.';
import {
  expectResolutionErrorCode,
  DefaultUrl,
  mockAPICalls,
} from './utils/testHelpers';

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

describe('Unstoppable API', () => {
  it('resolves a domain', async () => {
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    const resolution = new Resolution({ blockchain: false });
    const result = await resolution.address('cofounding.zil', 'eth');
    expect(result).toEqual('0xaa91734f90795e80751c96e682a321bb3c1a4186');
  });
  it('namehashes zil domain', async () => {
    const resolution = new Resolution({ blockchain: false });
    expect(resolution.namehash('cofounding.zil')).toEqual(
      '0x1cc365ffd60bb50538e01d24c1f1e26c887c36f26a0de250660b8a1465c60667',
    );
  });
  it('supports zil and eth domains', async () => {
    const resolution = new Resolution({ blockchain: false });
    expect(resolution.isSupportedDomain('cofounding.zil')).toEqual(true);
    expect(resolution.isSupportedDomain('cofounding.eth')).toEqual(true);
    expect(resolution.isSupportedDomain('cofounding.unknown')).toEqual(false);
  });

  it('throws NamingServiceDown on FetchError', async () => {
    const resolution = new Resolution({ blockchain: false });
    const error = new Error();
    error.name = 'FetchError';
    jest.spyOn(resolution.api as any, 'fetch').mockRejectedValue(error);
    await expectResolutionErrorCode(
      resolution.resolve('hello.zil'),
      ResolutionErrorCode.NamingServiceDown,
    );
  });

  it('returns owner of the domain', async () => {
    const resolution = new Resolution({ blockchain: false });
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    expect(await resolution.owner('cofounding.zil')).toEqual(
      'zil1ye72zl5t8wl5n3f2fsa5w0x7hja0jqj7mhct23',
    );
  });

  it('should return a valid ipfsHash from API', async () => {
    const resolution = new Resolution({blockchain: false});
    const ipfsHash = await resolution.ipfsHash('brad.zil');
    expect(ipfsHash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('should return a valid email from API', async () => {
    const resolution = new Resolution({blockchain: false});
    const email = await resolution.email('ergergergerg.zil');
    expect(email).toBe('matt+test@unstoppabledomains.com');
  });

  it('should return a valid httpUrl from API', async () => {
    const resolution = new Resolution({blockchain: false});
    const httpUrl = await resolution.httpUrl('brad.zil');
    expect(httpUrl).toBe('www.unstoppabledomains.com');
  });


});
