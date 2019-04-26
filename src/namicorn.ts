import Ens from './ens'
import Zns from './zns'
import Rns from './rns'

import fetch from 'isomorphic-fetch'
const DEFAULT_URL = 'https://unstoppable-domains-api.appspot.com/v1'
type Src = string | undefined

type Blockchain =
  | boolean
  | {
      ens?: Src
      zns?: Src
      rns?: Src
    }

class Namicorn {
  static readonly UNCLAIMED_DOMAIN_RESPONSE = {
    addresses: {},
    meta: {
      owner: null, //available domain
      ttl: 0,
      previous_owner: null,
    },
  }

  api: string
  ens: Ens | undefined
  rns: Rns | undefined
  zns: Zns | undefined
  blockchain: boolean

  constructor({
    blockchain = false,
    api = DEFAULT_URL,
  }: {api?: Src; blockchain?: Blockchain} = {}) {
    this.api = api.toString()
    this.blockchain = !!blockchain
    if (blockchain) {
      if (blockchain == true) {
        blockchain = {}
      }
      this.ens = new Ens(blockchain.ens)
      this.zns = new Zns(blockchain.zns)
      this.rns = new Rns(blockchain.rns)
    }
  }

  async resolve(domain: string) {
    if (this.blockchain) {
      return await this.resolveUsingBlockchain(domain)
    } else {
      const response = await fetch(`${this.api}/${domain}`)
      return response.json()
    }
  }

  async resolveUsingBlockchain(domain: string) {
    if (!this.isValidDomain(domain)) return null
    var method = null
    if (domain.match(/\.zil$/)) {
      method = this.zns
    } else if (domain.match(/\.eth$/)) {
      method = this.ens
    } else if (domain.match(/\.rsk$/)) {
      method = this.rns
    }
    var result = (await method.resolve(domain)) || Namicorn.UNCLAIMED_DOMAIN_RESPONSE
    return result
  }

  async address(domain: string, currencyTicker: string) {
    const data = await this.resolve(domain)
    return data.addresses[currencyTicker.toUpperCase()] || null
  }

  isValidDomain(domain: string) {
    return (
      domain.indexOf('.') > 0 &&
      /^((?![0-9]+$)(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}\.)*(?![0-9]+$)(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$/.test(
        domain,
      )
    )
  }

  buildCore(blockchain) {}
}

export {Namicorn, Namicorn as default}
