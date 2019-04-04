import ENS from '@namicorn/ens'
import networks from './networks.json'

export default class RNS extends ENS {
  static deriveRegistryAddressFromNetwork(network) {
    return networks[network] || networks.mainnet
  }
  constructor({
    src = 'https://localhost:4444',
    network = 'mainnet',
    UNSAFE_registryAddress = RNS.deriveRegistryAddressFromNetwork(network),
    isRNS = v => /^.*$/.test(v),
  }: {
    src?: Src
    network?: keyof typeof networks
    UNSAFE_registryAddress?: string
    isRNS?: (name: string) => boolean
  } = {}) {
    super({ src, UNSAFE_registryAddress, isENS: isRNS })
  }
}
