import { set, invert } from './index';

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
