import nock from 'nock';
import Namicorn from './namicorn';
import _ from 'lodash';
import mockData from './testData/mockData.json';

const DEFAULT_URL = 'https://unstoppabledomains.com/api/v1';
const MAINNET_URL = 'https://mainnet.infura.io';
const ZILLIGA_URL = 'https://api.zilliqa.com';

const mockAPICalls = (topLevel, method, testName, url = MAINNET_URL) => {
  nock.cleanAll();
  const {
    [method]: { REQUESTS, RESPONSES },
  } = mockData[topLevel][testName];

  method = method === 'GET';

  REQUESTS.forEach((request, index) => {
    // console.log(`mocked response #${index} with body ${request}`);
    if (method)
      nock(url)
        // .log(console.log)
        .get(request)
        .reply(200, RESPONSES[index]);
    else
      nock(url)
        // .log(console.log)
        .post('/', request)
        .reply(200, RESPONSES[index]);
  });
};

it('should work', async () => {
  nock.cleanAll();
  const testName = 'should work';
  mockAPICalls('UD_API', 'GET', testName, DEFAULT_URL);
  const namicorn = new Namicorn();
  const result = await namicorn.address('cofounding.zil', 'eth');
  expect(result).toEqual('0xaa91734f90795e80751c96e682a321bb3c1a4186');
});

it('resolves .eth name using blockchain', async () => {
  nock.cleanAll();
  const testName = 'resolves .eth name using blockchain';
  mockAPICalls('ENS', 'POST', testName);

  const namicorn = new Namicorn({
    blockchain: { ens: MAINNET_URL },
  });
  const result = await namicorn.address('matthewgould.eth', 'ETH');
  expect(result).toEqual('0x714ef33943d925731FBB89C99aF5780D888bD106');
});

import Ens from './ens';
it('reverses address to ENS domain', async () => {
  nock.cleanAll();
  const testName = 'reverses address to ENS domain';
  mockAPICalls('ENS', 'POST', testName, MAINNET_URL);
  let ens = new Ens(MAINNET_URL);
  var result = await ens.reverse(
    '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
    'ETH',
  );
  expect(result).toEqual('adrian.argent.xyz');
  nock.cleanAll();
  mockAPICalls('ENS', 'POST', testName + '2', MAINNET_URL);
  ens = new Ens(MAINNET_URL);
  var result = await ens.reverse(
    '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    'ETH',
  );
  expect(result).toEqual(null);
});

it('resolves .xyz name using ENS blockchain', async () => {
  nock.cleanAll();
  const testName = 'resolves .xyz name using ENS blockchain';
  mockAPICalls('ENS', 'POST', testName, MAINNET_URL);
  const namicorn = new Namicorn({
    blockchain: { ens: MAINNET_URL },
  });
  const result = await namicorn.address('adrian.argent.xyz', 'ETH');
  expect(result).toEqual('0xb0E7a465D255aE83eb7F8a50504F3867B945164C');
});

it('resolves .luxe name using ENS blockchain', async () => {
  nock.cleanAll();
  const testName = 'resolves .luxe name using ENS blockchain';
  mockAPICalls('ENS', 'POST', testName, MAINNET_URL);
  const namicorn = new Namicorn({
    blockchain: { ens: MAINNET_URL },
  });
  //TODO find luxe domain that resolves
  const result = await namicorn.address('bogdantest.luxe', 'ETH');
  expect(result).toEqual(null);
});

it('resolves .zil name using blockchain', async () => {
  nock.cleanAll();
  const testName = 'resolves .zil name using blockchain';
  mockAPICalls('ZIL', 'POST', testName, ZILLIGA_URL);
  const namicorn = new Namicorn({ blockchain: { zns: ZILLIGA_URL } });
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

it('provides empty response constant', async () => {
  const response = Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
  expect(response.addresses).toEqual({});
  expect(response.meta.owner).toEqual(null);
});

it('resolves non-existing domain zone', async () => {
  nock.cleanAll();
  const namicorn = new Namicorn({ blockchain: true });
  const result = await namicorn.address('bogdangusiev.qq', 'ZIL');
  expect(result).toEqual(null);
});

xit('resolves rsk name using blockchain', async () => {
  const namicorn = new Namicorn({ blockchain: true });
  const result = await namicorn.address('alice.rsk', 'ETH');
  expect(result).toEqual('0xd96d39c91b3d0236437e800f874800b026dc5f14');
});
