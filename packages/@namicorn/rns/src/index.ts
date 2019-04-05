import ENS, {Src} from '@namicorn/ens'
import * as networks from './networks.json'

export default class RNS extends ENS {
  static deriveRegistryAddressFromNetwork(network) {
    return networks[network] || networks.mainnet
  }

  constructor({
    src = 'https://localhost:4444',
    network = 'mainnet',
    UNSAFE_registryAddress = RNS.deriveRegistryAddressFromNetwork(network),
    isValid = v => /^.*\.rsk$/.test(v),
  }: {
    src?: Src
    network?: keyof typeof networks
    UNSAFE_registryAddress?: string
    isValid?: (name: string) => boolean
  } = {}) {
    super({ src, UNSAFE_registryAddress, isValid })
  }
}
