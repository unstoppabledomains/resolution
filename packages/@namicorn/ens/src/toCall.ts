import {HttpProvider, WebsocketProvider} from 'web3-providers'

function isEthersProvider(src) {
  return src._ethersType === 'Provider'
}

function isWeb3Provider(src) {
  return typeof src.send === 'function' || src.sendPayload === 'function'
}

function toWeb3Call(src) {
  let maybeProvider = src
  if (src.currentProvider) maybeProvider = src.currentProvider
  if (maybeProvider.send) {
    return (...args) => maybeProvider.send('eth_call', args)
  } else if (maybeProvider.sendPayload) {
    return (...args) => maybeProvider.sendPayload('eth_call', args)
  } else throw new Error('not valid provider')
}

let id = 0

export default function toCall(src) {
  if (typeof src === 'string') {
    return toCall(new URL(src))
  } else if (src instanceof URL) {
    console.log(src.protocol)
    switch (src.protocol) {
      case 'http:':
      case 'https:': {
        const provider = new HttpProvider(src.href)
        return (...args) => provider.send('eth_call', args)
      }
      case 'wss:': {
        const provider = new WebsocketProvider(src.href)
        return (...args) => provider.send('eth_call', args)
      }
      default:
        throw new Error('unsupported protocol')
    }
  } else if (isEthersProvider(src)) {
    return (...args) => src.call(...args)
  } else if (isWeb3Provider(src)) return toWeb3Call(src)
  else throw new Error('unsupported src')
}
