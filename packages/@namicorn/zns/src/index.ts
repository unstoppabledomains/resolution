import {sha256 as sha} from 'hash.js'

function sha256(
  message,
  {
    hexPrefix = true,
    inputEnc,
    outputEnc = 'hex',
  }: { hexPrefix?: boolean; inputEnc?: 'hex'; outputEnc?: 'hex' } = {},
) {
  return (
    (hexPrefix ? '0x' : '') +
    sha()
      .update(message, inputEnc)
      .digest(outputEnc)
  )
}

function nameHash(name: string) {
  return (
    '0x' +
    ['0000000000000000000000000000000000000000000000000000000000000000']
      .concat(
        name
          .split('.')
          .reverse()
          .filter(label => label)
          .map(label => sha256(label, { hexPrefix: false })),
      )
      .reduce((a, labelHash) =>
        sha256(a + labelHash, { hexPrefix: false, inputEnc: 'hex' }),
      )
  )
}

export function wrapZilliqaRpcCall(promise) {
  return promise.then(response => {
    if (response.Error) throw new Error(response.Error)
    else if (response.error) throw new Error(response.error.message)
    else return response.result
  })
}

let id = 0

export function zilliqaRpcCall(url, method, ...params) {
  return wrapZilliqaRpcCall(
    fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        id: String(++id),
        jsonrpc: '2.0',
        method,
        params,
      }),
    }).then(resp =>
      resp.ok ? resp.json() : Promise.reject('failed to fetch'),
    ),
  )
}

const defaultRegistryAddress = '9f01ae18d3f44aaa700207a2384608a808b3285a'

type Src = string | URL

interface Context {
  name: string
}

interface Result {
  [key: string]: string
}

export default class ZNS {
  src: Src
  UNSAFE_registryAddress: string

  constructor({
    src = 'https://dev-api.zilliqa.com',
    UNSAFE_registryAddress = defaultRegistryAddress,
  }: { src?: Src; UNSAFE_registryAddress?: string } = {}) {
    this.src = src
    this.UNSAFE_registryAddress = UNSAFE_registryAddress
  }

  middlewareFn = async (context: Context, next) => {
    if (!/\.zil$/.test(context.name)) return next()

    const node = nameHash(context.name.replace(/(\.zil)$/, ''))

    const znsState = await zilliqaRpcCall(
      typeof this.src === 'string' ? this.src : this.src.href,
      'GetSmartContractState',
      this.UNSAFE_registryAddress,
    )

    try {
      const [owner, prevOwner, resolver, ttl] = znsState
        .find(v => v.vname === 'registry')
        .value.find(v => v.key === node).val.arguments

      return {
        node,
        owner,
        addr: owner,
        prevOwner,
        resolver,
        ttl,
      }
    } catch (error) {
      // console.error(error)
    }
  }

  resolve = (
    name: string,
    opts?: {
      data?: {
        [key: string]: any
      }
    },
  ) =>
    this.middlewareFn({ ...(opts || {}), name } as any, () => {}) as Promise<
      Result
    >
}
