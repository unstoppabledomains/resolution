import Namicorn from './namicorn';
import nock from 'nock';

import bData from './blockchain.respond.json';
import _ from 'lodash';
import util from 'util';

function getMockData({ _ownerAddress }: { _ownerAddress: String }): [] {
  const result = _.filter(bData.result[1].value, {
    val: { arguments: [_ownerAddress] },
  });
  return result;
}

function setTimeCheck({
  _scopes,
  _mstime,
}: {
  _scopes: any[];
  _mstime: number;
}) {
  setTimeout(() => {
    // Will throw an assertion error if meanwhile a "GET http://google.com" was
    // not performed.
    console.log('scope is done!');
    _scopes.forEach(scope => scope.done());
  }, _mstime);
}

it('should work', async () => {
  const DEFAULT_URL = 'https://unstoppabledomains.com/api/v1';
  const API_VALID_RESPONSE = {
    addresses: {
      ETH: '0xaa91734f90795e80751c96e682a321bb3c1a4186',
      BTC: '1NZKHwpfqprxzcaijcjf71CZr27D8osagR',
    },
    meta: {
      owner: '0x267ca17e8b3bbf49c52a4c3b473cdebcbaf9025e',
      type: 'zns',
      ttl: 0,
    },
  };

  const scope = nock(DEFAULT_URL)
    .get('/cofounding.zil')
    .reply(200, API_VALID_RESPONSE);

  setTimeCheck({ _scopes: [scope], _mstime: 1000 });
  const namicorn = new Namicorn();
  const result = await namicorn.address('cofounding.zil', 'eth');
  expect(result).toEqual('0xaa91734f90795e80751c96e682a321bb3c1a4186');
});

// it('resolves .eth name using blockchain', async () => {
//   const namicorn = new Namicorn({ blockchain: true });
//   setTimeCheck({ _scopes: [firstBigCall, secondBigCall], _mstime: 1500 });
//   const result = await namicorn.address('matthewgould.eth', 'ETH');
//   expect(result).toEqual('0x714ef33943d925731FBB89C99aF5780D888bD106');
// });

// import Ens from './ens';
// it('reverses address to ENS domain', async () => {
//   const ens = new Ens();
//   var result = await ens.reverse(
//     '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
//     'ETH',
//   );
//   expect(result).toEqual('adrian.argent.xyz');
//   var result = await ens.reverse(
//     '0x112234455c3a32fd11230c42e7bccd4a84e02010',
//     'ETH',
//   );
//   expect(result).toEqual(null);
// });

// it('resolves .xyz name using ENS blockchain', async () => {
//   const namicorn = new Namicorn({ blockchain: true });
//   const result = await namicorn.address('adrian.argent.xyz', 'ETH');
//   expect(result).toEqual('0xb0E7a465D255aE83eb7F8a50504F3867B945164C');
// });

// it('resolves .luxe name using ENS blockchain', async () => {
//   const namicorn = new Namicorn({ blockchain: true });
//   //TODO find luxe domain that resolves
//   const result = await namicorn.address('bogdantest.luxe', 'ETH');
//   expect(result).toEqual(null);
// });

it('resolves .zil name using blockchain', async () => {
  const mockResult = getMockData({
    _ownerAddress: '0x267ca17e8b3bbf49c52a4c3b473cdebcbaf9025e',
  });
  // first distinguish api call happens every time
  const firstBigCall = nock('https://api.zilliqa.com/')
    .post({
      id: 1,
      jsonrpc: '2.0',
      method: 'GetSmartContractState',
      params: ['9611c53be6d1b32058b2747bdececed7e1216793'],
    })
    .reply(200, {
      id: 1,
      jsonrpc: '2.0',
      result: [
        {
          type: 'List (ByStr20)',
          value: [
            '0xa11de7664f55f5bdf8544a9ac711691d01378b4c',
            '0x76c858a5ea4552e78523cbcaacb58977fbf50b93',
            '0x6261f4df0eabab544d2fb14a1016c0575d13fff3',
            '0x021801104f9672bda71424d0bc8b1546b287adc2',
            '0xdfa89866ae86632b36361d53b76c1373448c28fa',
          ],
          vname: 'admins',
        },
        ...mockResult,
      ],
    });

  // second distinguis api call happens every time
  const secondBigCall = nock('https://api.zilliqa.com')
    .post({
      id: 1,
      jsonrpc: '2.0',
      method: 'GetSmartContractState',
      params: ['b17c35e557a8c13a730696c92d716a58421e36ca'],
    })
    .reply(200, {
      id: 1,
      jsonrpc: '2.0',
      result: [
        {
          type: 'Map (String) (String)',
          value: [
            {
              key: 'crypto.ETH.address',
              val: '0xaa91734f90795e80751c96e682a321bb3c1a4186',
            },
            {
              key: 'crypto.BTC.address',
              val: '1NZKHwpfqprxzcaijcjf71CZr27D8osagR',
            },
          ],
          vname: 'records',
        },
        { type: 'Uint128', value: '0', vname: '_balance' },
      ],
    });

  const namicorn = new Namicorn({ blockchain: true });
  const result = await namicorn.resolve('cofounding.zil');
  expect(result.addresses.ETH).toEqual(
    '0xaa91734f90795e80751c96e682a321bb3c1a4186',
  );
  expect(result.meta.owner).toEqual(
    '0x267ca17e8b3bbf49c52a4c3b473cdebcbaf9025e',
  );
  expect(result.meta.type).toEqual('zns');
  expect(result.meta.ttl).toEqual(0);
});

// it('resolves non-existing .zil name using blockchain', async () => {
//   const namicorn = new Namicorn({ blockchain: true });
//   const result = await namicorn.address('this-does-not-exist-ever.zil', 'ZIL');
//   expect(result).toEqual(null);
// });

// it('provides empty response constant', async () => {
//   const response = Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
//   expect(response.addresses).toEqual({});
//   expect(response.meta.owner).toEqual(null);
// });

// it('resolves non-existing domain zone', async () => {
//   const namicorn = new Namicorn({ blockchain: true });
//   const result = await namicorn.address('bogdangusiev.qq', 'ZIL');
//   expect(result).toEqual(null);
// });

// xit('resolves rsk name using blockchain', async () => {
//   const namicorn = new Namicorn({ blockchain: true });
//   const result = await namicorn.address('alice.rsk', 'ETH');
//   expect(result).toEqual('0xd96d39c91b3d0236437e800f874800b026dc5f14');
// });
