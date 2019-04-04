import Core from '@namicorn/core'
import ENS from '@namicorn/ens'
import RNS from '@namicorn/rns'
import ZNS from '@namicorn/zns'

const core = new Core()

const ens = new ENS({
  src: 'https://mainnet.infura.io',
})
const rns = new RNS({
  src: 'https://public-node.rsk.co',
})
const zns = new ZNS({
  src: 'https://dev-api.zilliqa.com',
})

core.use(ens.middlewareFn, rns.middlewareFn, zns.middlewareFn)

function resolve(name) {
  return core.resolve(name)
}

export { resolve, resolve as default }
