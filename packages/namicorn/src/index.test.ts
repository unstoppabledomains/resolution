import Namicorn from '.'


it('should work', async () => {
  const namicorn = new Namicorn();
  const result = await namicorn.address('ryan.zil', 'eth');
  expect(result).toEqual('0x89a8f5f337304EaA7caEd7AA1D88b791f3d8B51D');
});

it("resolves eth name using blockchain", async () => {
  const namicorn = new Namicorn({blockchain: true});
  const result = await namicorn.address("matthewgould.eth", 'ETH')
  expect(result).toEqual("0x714ef33943d925731FBB89C99aF5780D888bD106")
});
