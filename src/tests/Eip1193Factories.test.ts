import {HTTPProvider} from '@zilliqa-js/core';
import {Eip1193Factories} from '../utils/Eip1193Factories';
import {mockAsyncMethods, expectSpyToBeCalled} from './helpers';

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Eip1193Factories', () => {
  describe('fromZilliqaProvider', () => {
    it('should create provider from zilliqa provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      expect(provider).toBeDefined();
    });
    it('should make request from created provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      const eyes = mockAsyncMethods(provider, {
        request: {result: {code: ''}},
      });

      const resp = (await provider.request({
        method: 'GetSmartContractCode',
        params: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      })) as any;
      expectSpyToBeCalled(eyes);
      expect(resp.result.code).toBeDefined();
    });
    it('should make invalid request from created provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      const eyes = mockAsyncMethods(provider, {
        request: {
          error: {
            code: -32601,
            message:
              'METHOD_NOT_FOUND: The method being requested is not available on this server',
          },
          id: 1,
          jsonrpc: '2.0',
          req: {
            url: 'https://api.zilliqa.com',
            payload: {
              id: 1,
              jsonrpc: '2.0',
              method: 'InvalidMethod',
              params: [Array],
            },
          },
        },
      });
      const resp = (await provider.request({
        method: 'InvalidMethod',
        params: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      })) as any;
      expectSpyToBeCalled(eyes);
      expect(resp.error.message).toEqual(
        'METHOD_NOT_FOUND: The method being requested is not available on this server',
      );
    });
  });
});
