import RNS from '.'

const rns = new RNS({
  src: 'https://public-node.rsk.co',
  // src: new WebsocketProvider('wss://mainnet.infura.io/ws'),
})

it('should work', async () => {
  const result = await (rns as any).resolve(
    // 'fdb33f8ac7ce72d7d4795dd8610e323b4c122fbb.addr.reverse',
    {
      name: 'alice.rsk',
    },
  )

  console.log(result)

  expect(true).toBeTruthy()
})
