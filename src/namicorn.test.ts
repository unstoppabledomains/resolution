import Namicorn from './namicorn';

it('should work', async () => {
  const namicorn = new Namicorn();
  const result = await namicorn.address('cofounding.zil', 'eth');
  expect(result).toEqual('0xaa91734f90795e80751c96e682a321bb3c1a4186');
});

it('resolves .eth name using blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true});
  const result = await namicorn.address('matthewgould.eth', 'ETH');
  expect(result).toEqual('0x714ef33943d925731FBB89C99aF5780D888bD106');
});

import Ens from './ens';
it('reverses address to ENS domain', async () => {
  const ens = new Ens();
  var result = await ens.reverse(
    '0xb0E7a465D255aE83eb7F8a50504F3867B945164C',
    'ETH',
  );
  expect(result).toEqual('adrian.argent.xyz');
  var result = await ens.reverse('0x112234455c3a32fd11230c42e7bccd4a84e02010', 'ETH');
  expect(result).toEqual(null);
});

it('resolves .xyz name using ENS blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true});
  const result = await namicorn.address('adrian.argent.xyz', 'ETH');
  expect(result).toEqual('0xb0E7a465D255aE83eb7F8a50504F3867B945164C');
});

it('resolves .luxe name using ENS blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true});
  //TODO find luxe domain that resolves
  const result = await namicorn.address('bogdantest.luxe', 'ETH');
  expect(result).toEqual(null);
});

it('resolves .zil name using blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true});
  const result = await namicorn.resolve('cofounding.zil');
  expect(result.addresses.ETH).toEqual('0xaa91734f90795e80751c96e682a321bb3c1a4186');
  expect(result.meta.owner).toEqual('0x267ca17e8b3bbf49c52a4c3b473cdebcbaf9025e')
  expect(result.meta.type).toEqual('zns')
  expect(result.meta.ttl).toEqual(0)
});


it('resolves non-existing .zil name using blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true});
  const result = await namicorn.address('this-does-not-exist-ever.zil', 'ZIL');
  expect(result).toEqual(null);
});

it('provides empty response constant', async () => {
  const response = Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
  expect(response.addresses).toEqual({});
  expect(response.meta.owner).toEqual(null);
});

it('resolves non-existing domain zone', async () => {
  const namicorn = new Namicorn({blockchain: true});
  const result = await namicorn.address('bogdangusiev.qq', 'ZIL');
  expect(result).toEqual(null);
});

xit('resolves rsk name using blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true});
  const result = await namicorn.address('alice.rsk', 'ETH');
  expect(result).toEqual('0xd96d39c91b3d0236437e800f874800b026dc5f14');
});
