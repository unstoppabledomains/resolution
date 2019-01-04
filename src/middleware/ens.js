import { Cache } from '../lib'
import deepEqual from 'deep-equal'
import { Contract } from 'ethers'
import { registryAddress, registryAbi, resolverAbi } from './ens-config'

const createEnsMiddleware = ({ url }) => {
  const registryContract = new Contract(registryAddress, registryAbi)
  const resolverContract = new Contract(
    '0x0000000000000000000000000000000000000000',
    resolverAbi,
  )

  return async ({
    name,
    data: {
      // owner = true,
      // resolver = true,
      // ttl = false,
      // addr = true,
      // reverse = false,
      // content = false,
      // namea = false,
      // pubKey = false,
      // multihash = false,
      // text = [],
      // abi = [],
    },
  }) => {
    if (!/\.eth$/.test(name)) return next()

    // basic
    const [owner, resolver, ttl] = await Promise.all([
      registryContract.owner(name),
      registryContract.resolver(name),
      registryContract.ttl(name),
    ])

    // return { owner, resolver, ttl }

    // reverse
    const reverseResolver = await registryContract.resolver(
      owner + '.addr.reverse',
    )
    resolverContract.address = reverseResolver
    const reversedName = await resolverContract.name(owner + '.addr.reverse')

    // return { resolver: reverseResolver, name: reversedName }

    resolverContract.address = resolver
    // simple resolvable values
    const [addr, content, resolvedName, pubKey, multihash] = await Promise.all([
      resolver.at(resolver).addr(name),
      resolver.at(resolver).content(name),
      resolver.at(resolver).name(name),
      resolver.at(resolver).pubKey(name),
      resolver.at(resolver).multihash(name),
    ])

    return {
      addr,
      content,
      name: resolvedName,
      pubKey,
      multihash,
    }
  }
}
export { createEnsMiddleware, createEnsMiddleware as default }
