import {HTTPProvider} from '@zilliqa-js/core';
import {Eip1993Factories} from '../utils/Eip1993Factories';
import nock from 'nock';

beforeEach(() => {
  nock.enableNetConnect();
  jest.restoreAllMocks();
});

describe('Eip1993Factories', () => {
  describe('fromZilliqaProvider', () => {
    it('should create provider from zilliqa provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1993Factories.fromZilliqaProvider(zilliqaProvider);
      expect(provider).toBeDefined();
    });
    it('should make request from created provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1993Factories.fromZilliqaProvider(zilliqaProvider);
      const resp = (await provider.request({
        method: 'GetSmartContractCode',
        params: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      })) as any;
      expect(resp.result.code).toBeDefined();
    });
    it('should make invalid request from created provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1993Factories.fromZilliqaProvider(zilliqaProvider);
      const resp = (await provider.request({
        method: 'InvalidMethod',
        params: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      })) as any;
      expect(resp.error.message).toEqual(
        'METHOD_NOT_FOUND: The method being requested is not available on this server',
      );
    });
  });
});
