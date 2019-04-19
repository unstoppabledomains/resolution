import {utils} from 'ethers'
import {Provider} from 'ethers/providers'
import deed from './abiCodecs/deed'
import registrar from './abiCodecs/registrar'
import registry from './abiCodecs/registry'
import resolver from './abiCodecs/resolver'
import * as networks from './networks.json'
import toCall from './toCall'

export type Src =
  | string
  | Provider
  | URL
  | {
      send?: Function
      sendAsync?: Function
      sendPayload?: Function
    }

export interface Context {
  name: string
  data: {
    [key: string]: any
  }
}

export interface Result {
  [key: string]: any
}

function fnCall(call, to, codec, ...args) {
  return call(
    {
      to,
      data: codec.enc(...args),
    },
    'latest',
  ).then(resp => codec.dec(resp))
}

function mappedResolverFieldFnCall(send, to, codec, node, keys) {
  return Promise.all(keys.map(key => fnCall(send, to, codec, node, key))).then(
    values =>
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
  isValid: (name: string) => boolean

  constructor({
    src = 'https://localhost:8545',
    network = 'mainnet',
    UNSAFE_registryAddress = ENS.deriveRegistryAddressFromNetwork(network),
    isValid = v => /^.*\.(eth|reverse.addr)$/.test(v),
  }: {
    src?: Src
    network?: keyof typeof networks
    UNSAFE_registryAddress?: string
    isValid?: (name: string) => boolean
  } = {}) {
    this.src = src
    this.UNSAFE_registryAddress = UNSAFE_registryAddress
    this.isValid = isValid
  }

  middlewareFn = async (context: Context, next) => {
    if (!this.isValid(context.name)) return next()
    return this.resolve(context)
  }

  protected resolve = async (context: Context) => {
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

    if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      return { owner, ttl }
    }

    const [
      addr,
      name,
      contenthash,
      content,
      multihash,
      text,
      abi,
    ] = await Promise.all([
      ctx.data.addr
        ? fnCall(send, resolverAddress, resolver.fn.addr, node)
        : undefined,
      ctx.data.name
        ? fnCall(send, resolverAddress, resolver.fn.name, node)
        : undefined,
      ctx.data.contenthash
        ? fnCall(send, resolverAddress, resolver.fn.contenthash, node)
        : undefined,

      ctx.data.text
        ? mappedResolverFieldFnCall(
            send,
            resolverAddress,
            resolver.fn.text,
            node,
            ctx.data.text,
          )
        : undefined,
      ctx.data.abi
        ? mappedResolverFieldFnCall(
            send,
            resolverAddress,
            resolver.fn.abi,
            node,
            ctx.data.abi,
          )
        : undefined,

      ctx.data.EXPERIMENTAL_pubkey
        ? fnCall(send, resolverAddress, resolver.fn.pubkey, node)
        : undefined,

      ctx.data.LEGACY_content
        ? fnCall(send, resolverAddress, resolver.fn.content, node)
        : undefined,
      ctx.data.LEGACY_multihash
        ? fnCall(send, resolverAddress, resolver.fn.multihash, node)
        : undefined,
    ])

    const result: Result = {
      owner,
      ttl,
      resolver: Boolean(resolverAddress)
        ? {
            address: resolverAddress,
            addr,
            name,
            contenthash,
            content,
            multihash,
            text,
            abi,
          }
        : undefined,
    }

    Object.keys(result).forEach(
      key => result[key] === undefined && delete result[key],
    )
    result.resolver &&
      Object.keys(result.resolver).forEach(
        key =>
          result.resolver[key] === undefined && delete result.resolver[key],
      )

    return result
  }
}
