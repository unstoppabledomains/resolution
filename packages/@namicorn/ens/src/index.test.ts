import ENS from '.'
import {WebsocketProvider} from 'web3-providers'

const ens = new ENS({
  src: 'https://mainnet.infura.io/',
})

it('should work', async () => {
  const result = await (ens as any).resolve(
    {
      name: 'resolver.eth',
      data: {
        addr: true,
        // name: true,
      },
    },
  )

  expect(result.resolver.address).toEqual("0x1da022710df5002339274aadee8d58218e9d6ab5")
  expect(result.resolver.addr).toEqual("0xd3ddccdd3b25a8a7423b5bee360a42146eb4baf3")
})
