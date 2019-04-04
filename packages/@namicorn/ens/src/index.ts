import {utils} from 'ethers'
import {Provider} from 'ethers/providers'
import deed from './abiCodecs/deed'
import registrar from './abiCodecs/registrar'
import registry from './abiCodecs/registry'
import resolver from './abiCodecs/resolver'
import * as networks from './networks.json'
import toCall from './toCall'

type Src =
  | string
  | URL
  | Provider
  | {
      send?: Function
      sendAsync?: Function
      sendPayload?: Function
    }

interface Context {
  name: string
  data: {
    [key: string]: any
  }
}

interface Result {
  [key: string]: any
}

function fnCall(call, to, fnCodec, ...args) {
  return call(
    {
      to,
      data: fnCodec.enc(...args),
    },
    'latest',
  ).then(resp => fnCodec.dec(resp))
}

function mappedResolverFieldFnCall(send, to, fnCodec, node, keys) {
  return Promise.all(
    keys.map(key => fnCall(send, to, fnCodec, node, key)),
  ).then(values =>
    keys.reduce((a, v, i) => {
      a[v] = values[i]
      return a
    }, {}),
  )
}

export default class ENS {
  static deriveRegistryAddressFromNetwork(network) {
    return networks[network] || networks.mainnet
  }

  src: Src
  UNSAFE_registryAddress: string
  isENS: (name: string) => boolean

  constructor({
    src = 'https://localhost:8545',
    network = 'mainnet',
    UNSAFE_registryAddress = ENS.deriveRegistryAddressFromNetwork(network),
    isENS = v => /^.*$/.test(v),
  }: {
    src?: Src
    network?: keyof typeof networks
    UNSAFE_registryAddress?: string
    isENS?: (name: string) => boolean
  } = {}) {
    this.src = src
    this.UNSAFE_registryAddress = UNSAFE_registryAddress
    this.isENS = isENS
  }

  middlewareFn = async (context: Context, next) => {
    if (!this.isENS(context.name)) return next()

    const send = toCall(this.src)

    const node = utils.namehash(context.name)

    const defaultContext: Context = {
      name: '',
      data: {
        resolver: true,
        addr: true,
      },
    }

    const ctx: Context = {
      ...defaultContext,
      ...context,
      data: { ...defaultContext.data, ...context.data },
    }

    const [owner, resolverAddress, ttl] = await Promise.all([
      ctx.data.owner &&
        fnCall(send, this.UNSAFE_registryAddress, registry.fn.owner, node),
      ctx.data.resolver &&
        fnCall(send, this.UNSAFE_registryAddress, registry.fn.resolver, node),
      ctx.data.ttl &&
        fnCall(send, this.UNSAFE_registryAddress, registry.fn.ttl, node),
    ])

    const [
      addr,
      name,
      contenthash,
      content,
      multihash,
      text,
      abi,
    ] = await Promise.all([
      ctx.data.addr && fnCall(send, resolverAddress, resolver.fn.addr, node),
      ctx.data.name && fnCall(send, resolverAddress, resolver.fn.name, node),
      ctx.data.contenthash &&
        fnCall(send, resolverAddress, resolver.fn.contenthash, node),

      ctx.data.text &&
        mappedResolverFieldFnCall(
          send,
          resolverAddress,
          resolver.fn.text,
          node,
          ctx.data.text,
        ),
      ctx.data.abi &&
        mappedResolverFieldFnCall(
          send,
          resolverAddress,
          resolver.fn.abi,
          node,
          ctx.data.abi,
        ),

      ctx.data.EXPERIMENTAL_pubkey &&
        fnCall(send, resolverAddress, resolver.fn.pubkey, node),

      ctx.data.LEGACY_content &&
        fnCall(send, resolverAddress, resolver.fn.content, node),
      ctx.data.LEGACY_multihash &&
        fnCall(send, resolverAddress, resolver.fn.multihash, node),
    ])

    return {
      owner,
      ttl,
      resolver: Boolean(resolverAddress) && {
        address: resolverAddress,
        addr,
        name,
        contenthash,
        content,
        multihash,
        text,
        abi,
      },
    }
  }

  resolve = (
    name: string,
    opts?: {
      data?: {
        [key: string]: any
      }
    },
  ) => this.middlewareFn({ ...(opts || {}), name } as any, () => {}) as Result
}
