import Namicorn from '.'

const namicorn = new Namicorn({
  //api: 'http://localhost:3000'
})

it('should work', async () => {
  const result = await namicorn.address('ryan.zil', 'eth');
  expect(result).toEqual('0x89a8f5f337304EaA7caEd7AA1D88b791f3d8B51D');
})
