import Namicorn from './namicorn'

it('should work', async () => {
  const namicorn = new Namicorn()
  const result = await namicorn.address('ryan.zil', 'eth')
  expect(result).toEqual('0x89a8f5f337304EaA7caEd7AA1D88b791f3d8B51D')
})

it('resolves eth name using blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true})
  const result = await namicorn.address('matthewgould.eth', 'ETH')
  expect(result).toEqual('0x714ef33943d925731FBB89C99aF5780D888bD106')
})

it('resolves zil name using blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true})
  const result = await namicorn.address('bogdangusiev.zil', 'ZIL')
  expect(result).toEqual('0xd96d39c91b3d0236437e800f874800b026dc5f14')
})

it('resolves non-existing zil name using blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true})
  const result = await namicorn.address('this-does-not-exist-ever.zil', 'ZIL')
  expect(result).toEqual(null)
})

xit('resolves rsk name using blockchain', async () => {
  const namicorn = new Namicorn({blockchain: true})
  const result = await namicorn.address('alice.rsk', 'ETH')
  expect(result).toEqual('0xd96d39c91b3d0236437e800f874800b026dc5f14')
})
