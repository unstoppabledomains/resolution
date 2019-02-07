import { Cache } from '../lib'
import deepEqual from 'deep-equal'
import { Contract, getDefaultProvider } from 'ethers'
import { registryAddress, registryAbi, resolverAbi } from './ens-config'
import { hash } from 'eth-ens-namehash'

async function getBasicInfo(registryContract, fields, hashed) {
  const [owner, resolver, ttl] = await Promise.all([
    !fields.owner ? Promise.resolve() : registryContract.owner(hashed),
    !fields.resolver ? Promise.resolve() : registryContract.resolver(hashed),
    !fields.ttl ? Promise.resolve() : registryContract.ttl(hashed),
  ])

  return {
    owner,
    resolver,
    ttl: ttl ? ttl.toString() : undefined,
  }
}

async function getReverse(registryContract, basic) {
  const reverseResolver = await registryContract.resolver(
    basic.owner + '.addr.reverse',
  )
  resolverContract.address = reverseResolver
  const reversedName = await resolverContract.name(
    basic.owner + '.addr.reverse',
  )

  return {
    resolver: reverseResolver,
    name: reversedName,
  }
}

async function getResolverInfo(resolverContract, basic, fields, hashed) {
  if (
    resolverContract.address === '0x0000000000000000000000000000000000000000'
  ) {
    return null
  }

  const [addr, content, resolvedName, pubKey, multihash] = await Promise.all([
    !fields.addr ? Promise.resolve() : resolverContract.addr(hashed),
    !fields.content ? Promise.resolve() : resolverContract.content(hashed),
    !fields.name ? Promise.resolve() : resolverContract.name(hashed),
    !fields.pubKey ? Promise.resolve() : resolverContract.pubKey(hashed),
    !fields.multihash ? Promise.resolve() : resolverContract.multihash(hashed),
  ])

  return { addr, content, resolvedName, pubKey, multihash }
}

export default ({ url = 'https://infura.io' } = {}) => {
  const signer = getDefaultProvider()
  const registryContract = new Contract(registryAddress, registryAbi, signer)
  const resolverContract = new Contract(
    '0x0000000000000000000000000000000000000000',
    resolverAbi,
    signer,
  )

  return async (
    {
      name,
      data: {
        owner = true,
        resolver = true,
        ttl = false,
        addr = true,
        reverse = false,
        content = false,
        namea = false,
        pubKey = false,
        multihash = false,
        text = [],
        abi = [],
      } = {},
    },
    next,
  ) => {
    if (!/\.eth$/.test(name)) return next()

    const hashed = hash(name)

    const basic = await getBasicInfo(
      registryContract,
      { owner, resolver, ttl },
      hashed,
    )

    return {
      basic,
      // reverseResolver: reverse
      //             ? await getReverse(registryContract, basic)
      //   : undefined,
      resolver: await getResolverInfo(
        resolverContract.attach(basic.resolver),
        basic,
        {
          addr,
          content,
          pubKey,
          multihash,
          text,
          abi,
        },
        hashed,
      ),
    }
  }
}
