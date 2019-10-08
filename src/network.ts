import _ from 'lodash';
import {
  SourceDefinition,
  NameService,
  DefaultSource,
  NetworkIdMap,
} from './types';

/* NameService
 ** {
 **   zns = 0,
 **   ens = 1,
 ** }
 */

const defaults = [
  {
    url: 'https://api.zilliqa.com/',
    defaultNetwork: 'zilliqa',
    networkIdMap: {
      1: 'zilliqa',
      3: 'dev',
      42: 'local',
    },
    registryMap: {
      zilliqa: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
    },
  },
  {
    url: 'https://mainnet.infura.io',
    defaultNetwork: 'mainnet',
    networkIdMap: {
      1: 'mainnet',
      3: 'ropsten',
      4: 'kovan',
      42: 'rinkeby',
      5: 'goerli',
    },
    registryMap: {
      mainnet: '0x314159265dd8dbb310642f98f50c066173c1259b',
      ropsten: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    },
  },
];

const NetworkNameMap = (NetworkIdMap: NetworkIdMap) =>
  _(NetworkIdMap)
    .invert()
    .mapValues((v, k) => parseInt(v))
    .value();

export default class BlockchainSourceValidator {
  readonly blockchain: NameService;
  private defaultSource: DefaultSource;
  private network: string;

  constructor(nameservice: NameService) {
    this.blockchain = nameservice;
    this.defaultSource = defaults[this.blockchain];
  }

  normalizeSource(
    source: string | boolean | SourceDefinition = true,
  ): SourceDefinition {
    switch (typeof source) {
      case 'boolean': {
        this.network = this.defaultSource.defaultNetwork;
        return {
          url: this.defaultSource.url,
          network: this.defaultSource.defaultNetwork,
        };
      }
      case 'string': {
        this.network = this.networkFromUrl(
          source,
          this.defaultSource.networkIdMap,
        );
        return { url: source as string, network: this.network };
      }
      case 'object': {
        if (this.blockchain == NameService.ens) {
          return this.normalizeEnsSource(source);
        }
        return this.normalizeZnsSource(source);
      }
    }
  }

  getRegistryAddress(): string {
    return this.defaultSource.registryMap[this.network];
  }

  private normalizeEnsSource(source: SourceDefinition): SourceDefinition {
    source = _.clone(source) as SourceDefinition;
    if (typeof source.network == 'number') {
      this.network = this.defaultSource.networkIdMap[source.network];
      source.network = this.network;
    }
    if (source.network && !source.url) {
      source.url = `https://${source.network}.infura.io`;
    }
    if (source.url && !source.network) {
      this.network = this.networkFromUrl(
        source.url,
        this.defaultSource[this.blockchain].networkFromUrl,
      );
      source.network = this.network;
    }
    return source;
  }

  private normalizeZnsSource(source: SourceDefinition): SourceDefinition {
    source = _.clone(source) as SourceDefinition;
    if (typeof source.network == 'number') {
      this.network = this.defaultSource.networkIdMap[source.network];
      source.network = this.network;
    }
    if (source.network && !source.url) {
      switch (source.network) {
        case 'zilliqa': {
          source.url = 'https://api.zilliqa.com/';
          break;
        }
        case 'dev': {
          source.url = 'https://dev-api.zilliqa.com/';
          break;
        }
        default: {
          source.url = 'http://localhost:4201/';
        }
      }
    }
    if (source.url && !source.network) {
      this.network = this.networkFromUrl(
        source.url,
        this.defaultSource[this.blockchain].networkFromUrl,
      );
      source.network = this.network;
    }
    return source;
  }

  private networkFromUrl(url: string, NetworkIdMap: NetworkIdMap): string {
    return _.find(NetworkIdMap, name => url.indexOf(name) >= 0);
  }
}
