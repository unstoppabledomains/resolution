import { Zilliqa } from '@zilliqa-js/zilliqa'
import { nameHash, wrapZilliqaRpcCall } from './zns-helpers'

const contractAddress = '1234567890123456789012345678901234567890'

const getZNSState =
  // (zilliqa) => wrapZilliqaRpcCall(zilliqa.contracts.at(contractAddress).getState())
  async zilliqa => {
    // return

    await new Promise(r => setTimeout(r, Math.random() * 1400))
    return [
      {
        vname: '_balance',
        type: 'Uint128',
        value: '0',
      },
      {
        vname: 'registry',
        type: 'Map (ByStr32) (Record)',
        value: [
          {
            key:
              '0x098716e9eace3b40e6d9a7205bf1cd0fe36add5c538678743557275d6e344980',
            val: {
              constructor: 'Record',
              argtypes: [],
              arguments: [
                '0x306923a24501aab67a5786bac2bc330efc360692',
                '0x0000000000000000000000000000000000000000',
                '0x0000000000000000000000000000000000000000',
                '0',
              ],
            },
          },
        ],
      },
    ]
  }

export default ({ url = 'https://dev-api.zilliqa.com' } = {}) => {
  const zilliqa = new Zilliqa(url)

  return async ({ name /* resolver = true */ }, next) => {
    if (!/\.zil$/.test(name)) return next()

    const namehash = nameHash(name.replace(/(\.zil)$/, ''))

    try {
      const [owner, prevOwner, resolver, ttl] = (await getZNSState())
        .find(v => v.vname === 'registry')
        .value.find(v => v.key === namehash).val.arguments

      return {
        namehash,
        owner,
        addr: owner,
        prevOwner,
        resolver,
        ttl,
      }
    } catch (error) {}
  }
}
