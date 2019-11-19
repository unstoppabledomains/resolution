import { mapValues, clone, set, transform, invert } from '.';

describe('Lodash', () => {

  it('should map values', () => {

    const object = {
      BCH: { address: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6' },
      BTC: { address: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB' },
      DASH: { address: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j' },
      ETH: { address: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb' },
      LTC: { address: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL' },
      XMR: { address: '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d' },
      ZEC: { address: 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV' },
      ZIL: { address: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj' }
    };


    const result = mapValues(object, 'address');
    expect(result).toStrictEqual({
      BCH: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
      BTC: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
      DASH: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
      ETH: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
      LTC: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
      XMR: '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
      ZEC: 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
      ZIL: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj'
    });

  });

  it('should clone the object', () => {

    const object = {
      param: 'easy test',
      numerical: 23,
      array: ['stuf', 'stuf'],
      object2: {
        param2: 'medium test',
        numerical2: 42,
        array2: ['second', 'test', 'hehehe']
      },
      arrayOfObjects: [{ param3: 'hard?', numerical3: 87, object: { deep: true } }]
    }
    expect(clone(object)).toStrictEqual(object);
  });

  describe('set', () => {
    it('should set new values', () => {
      expect(set({}, "a.b", 1)).toStrictEqual({ a: { b: 1 } });
    });
    it('should set new property to the existing object', () => {
      expect(set({ a: 1 }, "a.b", 1)).toStrictEqual({ a: { b: 1 } });
    });
    it('should work on deeper levels', () => {
      expect(set({ a: { b: 2 } }, "a.b", 1)).toStrictEqual({ a: { b: 1 } });
    })
    it('should just work', () => {
      expect(set({}, 'crypto.BCH.address', 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6')).toStrictEqual({crypto: {BCH: { address: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6'}}});
    })
  });


  it('should transform the object with set function', () => {

    const object = {
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
      'ipfs.redirect_domain.value':'www.unstoppabledomains.com' 
    };


    const result = transform(
      object,
      (result, value, key) => set(result, key, value),
      {},
    );

    expect(result).toStrictEqual({
      crypto:
      {
        BCH: { address: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6' },
        BTC: { address: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB' },
        DASH: { address: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j' },
        ETH: { address: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb' },
        LTC: { address: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL' },
        XMR:
        {
          address:
            '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d'
        },
        ZEC: { address: 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV' },
        ZIL: { address: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj' }
      },
      ipfs:
      {
        html: { value: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK' },
        redirect_domain: { value: 'www.unstoppabledomains.com' }
      }
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
      'http://localhost:4201': 'localnet'
    });
  })
})
