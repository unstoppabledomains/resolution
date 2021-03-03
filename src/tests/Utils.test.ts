import { set } from '../utils/znsUtils';

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
});
