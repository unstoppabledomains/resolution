import {address, abi, code} from './zns/registry'
import {Zilliqa} from '@zilliqa-js/zilliqa'
import namehash from './zns/namehash'

const DEFAULT_SOURCE = 'https://dev-api.zilliqa.com/'

export default class {
  registryContract: any

  constructor(source: string | boolean = DEFAULT_SOURCE) {
    if (source == true) {
      source = DEFAULT_SOURCE
    }
    source = source.toString()
    const zilliqa = new Zilliqa(source)
    this.registryContract = zilliqa.contracts.at(address, abi, code)
  }

  async resolve(domain) {
    const state = await this.registryContract.getState()
    const nodeHash = namehash(domain.replace(/(\.zil)$/, ''))
    if (!state) {
      return null
    }

    const record = (state as any).
      find(v => v.vname === 'registry').
      value.find(v => v.key === nodeHash)
    if (!record)
      return null
    const [owner, previous_owner, resolver, ttl] = record.val.arguments

    return {
      addresses: {
        ZIL: owner || null,
      },
      meta: {
        owner: owner || null,
        type: 'zns',
        ttl,
        previous_owner: previous_owner || null,
      },
    }
  }
}
