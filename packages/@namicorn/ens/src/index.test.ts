import ENS from '.'
import {WebsocketProvider} from 'web3-providers'

const ens = new ENS({
  // src: 'https://mainnet.infura.io/',
  // src: new WebsocketProvider('wss://mainnet.infura.io/ws'),
})

// console.log(
//   'raw',
//   (new WebsocketProvider('wss://mainnet.infura.io/ws') as any).sendPayload,
// )

it('should work', async () => {
  const result = await ens.resolve(
    'resolver.eth',
    // 'fdb33f8ac7ce72d7d4795dd8610e323b4c122fbb.addr.reverse',
    {
      data: {
        addr: false,
        name: true,
        text: ['bla'],
      },
    },
  )

  console.log(result)

  expect(true).toBeTruthy()
})
