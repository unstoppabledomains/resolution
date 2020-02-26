import { set, invert } from './index';
import { secretInfuraLink } from './testHelpers';
import Resolution from '../Resolution';
import nodeFetch from 'node-fetch';

describe('Lodash', () => {
  describe('set', () => {
    it('should set new values', () => {
      expect(set({}, 'a.b', 1)).toStrictEqual({ a: { b: 1 } });
    });
    it('should set new property to the existing object', () => {
      expect(set({ a: 1 }, 'a.b', 1)).toStrictEqual({ a: { b: 1 } });
    });
    it('should work on deeper levels', () => {
      expect(set({ a: { b: 2 } }, 'a.b', 1)).toStrictEqual({ a: { b: 1 } });
    });
    it('should just work', () => {
      expect(
        set(
          {},
          'crypto.BCH.address',
          'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
        ),
      ).toStrictEqual({
        crypto: {
          BCH: { address: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6' },
        },
      });
    });
  });

  it('should invert the object', () => {
    const object = {
      mainnet: 'https://api.zilliqa.com',
      testnet: 'https://dev-api.zilliqa.com',
      localnet: 'http://localhost:4201',
    };

    expect(invert(object)).toStrictEqual({
      'https://api.zilliqa.com': 'mainnet',
      'https://dev-api.zilliqa.com': 'testnet',
      'http://localhost:4201': 'localnet',
    });
  });
});
describe('Contract', () => {
  it('should work with ethers provider', async () => {
    const provider = {
      sendAsync: (method: string, params: any) => {
        return nodeFetch(secretInfuraLink(), {
          method: 'POST',
          body: JSON.stringify({
            method,
            params,
            jsonrpc: '2.0',
            id: 1,
          }),
        });
      },
    };
    const resolution = new Resolution({
      blockchain: { web3Provider: provider },
    });
    const ethAddress = await resolution.addressOrThrow('brad.crypto', 'ETH');
    expect(ethAddress).toBe('0x45b31e01AA6f42F0549aD482BE81635ED3149abb');
  });
});
