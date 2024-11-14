import BN from 'bn.js';
import Ens from './Ens';
import Zns from './Zns';
import Uns from './Uns';
import UdApi from './UdApi';
import {
  Api,
  AutoNetworkConfigs,
  CryptoRecords,
  DnsRecord,
  DnsRecordType,
  EthersProvider,
  Locations,
  NamehashOptions,
  NamehashOptionsDefault,
  NamingServiceName,
  Provider,
  SourceConfig,
  ResolutionConfig,
  TokenUriMetadata,
  Web3Version0Provider,
  Web3Version1Provider,
  ReverseResolutionOptions,
  UnsLocation,
  BlockchainType,
} from './types/publicTypes';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import DnsUtils from './utils/DnsUtils';
import {
  findNamingServiceName,
  signedInfuraLink,
  signedLink,
  UnwrapPromise,
  wrapResult,
  unwrapResult,
} from './utils';
import {Eip1993Factories as Eip1193Factories} from './utils/Eip1993Factories';
import {NamingService} from './NamingService';
import ConfigurationError from './errors/configurationError';
import {ConfigurationErrorCode} from './errors/configurationError';
import Networking from './utils/Networking';
import {prepareAndValidateDomain} from './utils/prepareAndValidate';
import {fromDecStringToHex} from './utils/namehash';
import {UnsSupportedNetwork} from './types';

const DEFAULT_UNS_PROXY_SERVICE_URL =
  'https://api.unstoppabledomains.com/resolve';

/**
 * Blockchain domain Resolution library - Resolution.
 * @example
 * ```
 * import Resolution from '@unstoppabledomains/resolution';
 *
 * let resolution = new Resolution({ blockchain: {
 *        uns: {
 *           url: "https://mainnet.infura.io/v3/<infura_api_key>",
 *           network: "mainnet"
 *        }
 *      }
 *   });
 *
 * let domain = "brad.zil";
 * resolution.addr(domain, "eth").then(addr => console.log(addr));;
 * ```
 */
export default class Resolution {
  /**
   * @internal
   */
  readonly serviceMap: Record<NamingServiceName, ServicesEntry>;

  constructor(config: {sourceConfig?: SourceConfig; apiKey?: string} = {}) {
    const uns = this.getUnsConfig(config);
    const unsBase = this.getUnsBaseConfig(config);
    const zns = this.getZnsConfig(config);
    const ens = this.getEnsConfig(config);

    // If both UNS and ZNS use the same UdApi providers, we don't want to call the API twice as it would return same
    // responses. It should be enough to compare just the URLs, as the network param isn't actually used in the calls.
    const equalUdApiProviders =
      uns instanceof UdApi && zns instanceof UdApi && uns.url === zns.url;

    // If a user configures the lib with an API source, we still want to initialise native blockchain services to access
    // some non-async methods such as namehash, as they are unavailable in the UdApi service.
    this.serviceMap = {
      [NamingServiceName.UNS]: {
        usedServices: [uns],
        native: uns instanceof Uns ? uns : new Uns(),
      },
      [NamingServiceName.UNS_BASE]: {
        usedServices: [unsBase],
        native: unsBase instanceof Uns ? unsBase : new Uns(),
      },
      [NamingServiceName.ZNS]: {
        usedServices: equalUdApiProviders ? [uns] : [uns, zns],
        native: zns instanceof Zns ? zns : new Zns(),
      },
      [NamingServiceName.ENS]: {
        usedServices: [ens],
        native: ens instanceof Ens ? ens : new Ens(),
      },
    };
  }

  /**
   * AutoConfigure the blockchain network between different testnets for ENS and UNS
   * We make a "net_version" JSON RPC call to the blockchain either via url or with the help of given provider.
   * @param sourceConfig - configuration object for ens and uns
   * @returns configured Resolution object
   */
  static async autoNetwork(
    sourceConfig: AutoNetworkConfigs,
  ): Promise<Resolution> {
    const resolution = new this();
    if (!sourceConfig.uns && !sourceConfig.ens) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork);
    }

    if (sourceConfig.uns) {
      const uns = await Uns.autoNetwork(sourceConfig.uns);
      resolution.serviceMap[NamingServiceName.UNS] = {
        usedServices: [uns],
        native: uns,
      };
    }

    if (sourceConfig.ens) {
      const ens = await Ens.autoNetwork(sourceConfig.ens);
      resolution.serviceMap[NamingServiceName.ENS] = {
        usedServices: [ens],
        native: ens,
      };
    }

    return resolution;
  }

  /**
   * Creates a resolution with configured infura id for ens and uns
   * @param infura - infura project id
   * @param networks - an optional object that describes what network to use when connecting ENS or UNS default is mainnet
   */
  static infura(
    infura: string,
    networks?: {
      ens?: {
        network: string;
      };
      uns?: {
        locations: {
          Layer1: {
            network: UnsSupportedNetwork;
          };
          Layer2: {
            network: UnsSupportedNetwork;
          };
        };
      };
    },
  ): Resolution {
    return new this({
      sourceConfig: {
        ens: {
          url: signedInfuraLink(infura, networks?.ens?.network),
          network: networks?.ens?.network || 'mainnet',
        },
        uns: {
          locations: {
            Layer1: {
              url: signedLink(
                infura,
                networks?.uns?.locations.Layer1.network || 'mainnet',
                'infura',
              ),
              network: networks?.uns?.locations.Layer1.network || 'mainnet',
            },
            Layer2: {
              url: signedLink(
                infura,
                networks?.uns?.locations.Layer2.network || 'polygon-mainnet',
                'infura',
              ),
              network:
                networks?.uns?.locations.Layer2.network || 'polygon-mainnet',
            },
          },
        },
      },
    });
  }

  /**
   * Creates a resolution with configured alchemy API keys for uns
   * @param alchemy - alchemy API keys
   * @param networks - an optional object that describes what network to use when connecting UNS default is mainnet
   */
  static alchemy(
    alchemy: string,
    networks?: {
      uns?: {
        locations: {
          Layer1: {
            network: UnsSupportedNetwork;
          };
          Layer2: {
            network: UnsSupportedNetwork;
          };
        };
      };
    },
  ): Resolution {
    return new this({
      sourceConfig: {
        uns: {
          locations: {
            Layer1: {
              url: signedLink(
                alchemy,
                networks?.uns?.locations.Layer1.network || 'mainnet',
              ),
              network: networks?.uns?.locations.Layer1.network || 'mainnet',
            },
            Layer2: {
              url: signedLink(
                alchemy,
                networks?.uns?.locations.Layer2.network || 'polygon-mainnet',
              ),
              network:
                networks?.uns?.locations.Layer2.network || 'polygon-mainnet',
            },
          },
        },
      },
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param networks - an object that describes what network to use when connecting UNS, ENS, or ZNS default is mainnet
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromResolutionProvider(networks: {
    ens?: {
      provider: Provider;
      network: string;
    };
    uns?: {
      locations: {
        Layer1: {provider: Provider; network: string};
        Layer2: {provider: Provider; network: string};
      };
    };
    zns?: {
      provider: Provider;
      network: string;
    };
  }): Resolution {
    if (networks.ens || networks.uns) {
      return this.fromEthereumEip1193Provider({
        ens: networks.ens,
        uns: networks.uns,
      });
    }
    if (networks.zns) {
      return this.fromZilliqaProvider(networks.zns.provider, networks);
    }
    throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
      providerMessage: 'Must specify network for uns, ens, or zns',
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param networks - an object that describes what network to use when connecting UNS and ENS default is mainnet
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromEthereumEip1193Provider(networks: {
    ens?: {
      network?: string;
      provider: Provider;
    };
    uns?: {
      locations: {
        Layer1: {
          provider: Provider;
          network?: string;
        };
        Layer2: {
          provider: Provider;
          network?: string;
        };
      };
    };
  }): Resolution {
    const sourceConfig: SourceConfig = {};
    if (networks.ens) {
      sourceConfig.ens = {
        provider: networks.ens.provider,
        network: networks?.ens?.network || 'mainnet',
      };
    }
    if (networks.uns) {
      sourceConfig.uns = {
        locations: {
          Layer1: {
            provider: networks.uns.locations.Layer1.provider,
            network: networks.uns.locations.Layer1.network || 'mainnet',
          },
          Layer2: {
            provider: networks.uns.locations.Layer2.provider,
            network: networks.uns.locations.Layer2.network || 'polygon-mainnet',
          },
        },
      };
    }
    return new this({
      sourceConfig,
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param provider - any provider compatible with EIP-1193
   * @param networks - an optional object that describes what network to use when connecting ZNS default is mainnet
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromZilliqaProvider(
    provider: Provider,
    networks?: {
      zns?: {
        network: string;
      };
    },
  ): Resolution {
    return new this({
      sourceConfig: {
        zns: {provider, network: networks?.zns?.network || 'mainnet'},
      },
    });
  }

  /**
   * Create a resolution instance from web3 0.x version provider
   * @param networks - Ethereum network configuration with 0.x version provider from web3 ( must implement sendAsync(payload, callback) )
   * @see https://github.com/ethereum/web3.js/blob/0.20.7/lib/web3/httpprovider.js#L116
   */
  static fromWeb3Version0Provider(networks: {
    ens?: {
      provider: Web3Version0Provider;
      network: string;
    };
    uns?: {
      locations: {
        Layer1: {
          provider: Web3Version0Provider;
          network: string;
        };
        Layer2: {
          provider: Web3Version0Provider;
          network: string;
        };
      };
    };
  }): Resolution {
    return this.fromEthereumEip1193Provider({
      ens: networks.ens
        ? {
            network: networks.ens.network,
            provider: Eip1193Factories.fromWeb3Version0Provider(
              networks.ens.provider,
            ),
          }
        : undefined,
      uns: networks.uns
        ? {
            locations: {
              Layer1: {
                network: networks.uns.locations.Layer1.network,
                provider: Eip1193Factories.fromWeb3Version0Provider(
                  networks.uns.locations.Layer1.provider,
                ),
              },
              Layer2: {
                network: networks.uns.locations.Layer2.network,
                provider: Eip1193Factories.fromWeb3Version0Provider(
                  networks.uns.locations.Layer2.provider,
                ),
              },
            },
          }
        : undefined,
    });
  }

  /**
   * Create a resolution instance from web3 1.x version provider
   * @param networks - an optional object with 1.x version provider from web3 ( must implement send(payload, callback) ) that describes what network to use when connecting ENS or UNS default is mainnet
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L165
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-providers-http/src/index.js#L95
   */
  static fromWeb3Version1Provider(networks: {
    ens?: {
      provider: Web3Version1Provider;
      network: string;
    };
    uns?: {
      locations: {
        Layer1: {
          provider: Web3Version1Provider;
          network: string;
        };
        Layer2: {
          provider: Web3Version1Provider;
          network: string;
        };
      };
    };
  }): Resolution {
    return this.fromEthereumEip1193Provider({
      ens: networks.ens
        ? {
            network: networks.ens.network,
            provider: Eip1193Factories.fromWeb3Version1Provider(
              networks.ens.provider,
            ),
          }
        : undefined,
      uns: networks.uns
        ? {
            locations: {
              Layer1: {
                network: networks.uns.locations.Layer1.network,
                provider: Eip1193Factories.fromWeb3Version1Provider(
                  networks.uns.locations.Layer1.provider,
                ),
              },
              Layer2: {
                network: networks.uns.locations.Layer2.network,
                provider: Eip1193Factories.fromWeb3Version1Provider(
                  networks.uns.locations.Layer2.provider,
                ),
              },
            },
          }
        : undefined,
    });
  }

  /**
   * Creates instance of resolution from provider that implements Ethers Provider#call interface.
   * This wrapper support only `eth_call` method for now, which is enough for all the current Resolution functionality
   * @param networks - an object that describes what network to use when connecting ENS or UNS default is mainnet
   * @see https://github.com/ethers-io/ethers.js/blob/v4-legacy/providers/abstract-provider.d.ts#L91
   * @see https://github.com/ethers-io/ethers.js/blob/v5.0.4/packages/abstract-provider/src.ts/index.ts#L224
   * @see https://docs.ethers.io/ethers.js/v5-beta/api-providers.html#jsonrpcprovider-inherits-from-provider
   * @see https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
   */
  static fromEthersProvider(networks: {
    ens?: {
      network: string;
      provider: EthersProvider;
    };
    uns?: {
      locations: {
        Layer1: {
          network: string;
          provider: EthersProvider;
        };
        Layer2: {
          network: string;
          provider: EthersProvider;
        };
      };
    };
  }): Resolution {
    return this.fromEthereumEip1193Provider({
      ens: networks.ens
        ? {
            network: networks.ens.network,
            provider: Eip1193Factories.fromEthersProvider(
              networks.ens.provider,
            ),
          }
        : undefined,
      uns: networks.uns
        ? {
            locations: {
              Layer1: {
                network: networks.uns.locations.Layer1.network,
                provider: Eip1193Factories.fromEthersProvider(
                  networks.uns.locations.Layer1.provider,
                ),
              },
              Layer2: {
                network: networks.uns.locations.Layer2.network,
                provider: Eip1193Factories.fromEthersProvider(
                  networks.uns.locations.Layer2.provider,
                ),
              },
            },
          }
        : undefined,
    });
  }

  /**
   * Resolves given domain name to a specific currency address if exists
   * @async
   * @param domain - domain name to be resolved
   * @param ticker - currency ticker like BTC, ETH, ZIL
   * @throws [[ResolutionError]] if address is not found
   * @returns A promise that resolves in an address
   */
  async addr(domain: string, ticker: string): Promise<string | undefined> {
    domain = prepareAndValidateDomain(domain);
    return await this.callServiceForDomain(domain, async (service) => {
      if (service instanceof Ens) {
        return await service.addr(domain, ticker);
      }

      return await this.record(
        domain,
        `crypto.${ticker.toUpperCase()}.address`,
      );
    });
  }

  /**
   * Read multi-chain currency address if exists
   * @async
   * @param domain - domain name to be resolved
   * @param ticker - currency ticker (USDT, FTM, etc.)
   * @param chain - chain version, usually means blockchain ( ERC20, BEP2, OMNI, etc. )
   * @throws [[ResolutionError]] if address is not found
   * @returns A promise that resolves in an adress
   */
  async multiChainAddr(
    domain: string,
    ticker: string,
    chain: string,
  ): Promise<string | undefined> {
    domain = prepareAndValidateDomain(domain);
    const recordKey = `crypto.${ticker.toUpperCase()}.version.${chain.toUpperCase()}.address`;
    return this.callServiceForDomain(domain, async (service) => {
      if (service instanceof Ens) {
        throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
          methodName: 'multiChainAddr',
          domain,
          method: service.name,
        });
      }

      return await service.record(domain, recordKey);
    });
  }

  /**
   * Resolves given domain name to a verified twitter handle
   * @async
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]] if twitter is not found
   * @returns A promise that resolves in a verified twitter handle
   */
  async twitter(domain: string): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomain(domain, (service) =>
      service.twitter(domain),
    );
  }

  /**
   * Resolve a chat id from the domain record
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]]
   * @returns A promise that resolves in chatId
   */
  async chatId(domain: string): Promise<string> {
    try {
      return await this.record(domain, 'gundb.username.value');
    } catch (err) {
      if (err.code === ResolutionErrorCode.RecordNotFound) {
        throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
          domain,
          method: err.method,
          methodName: 'chatId',
          recordName: err.recordName,
        });
      }
      throw err;
    }
  }

  /**
   * Resolve a gundb public key from the domain record
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]]
   * @returns a promise that resolves in gundb public key
   */
  async chatPk(domain: string): Promise<string> {
    try {
      return await this.record(domain, 'gundb.public_key.value');
    } catch (err) {
      if (err.code === ResolutionErrorCode.RecordNotFound) {
        throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
          domain,
          method: err.method,
          methodName: 'chatId',
          recordName: err.recordName,
        });
      }
      throw err;
    }
  }

  /**
   * Resolves the IPFS hash configured for domain records on ZNS
   * @param domain - domain name
   * @throws [[ResolutionError]]
   */
  async ipfsHash(domain: string): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    return await this.callServiceForDomain(domain, async (service) => {
      if (service instanceof Ens) {
        // @see https://docs.ens.domains/ens-improvement-proposals/ensip-7-contenthash-field
        const contentHash = await service.record(domain, 'contenthash');
        return `ipfs://${contentHash}`;
      }

      return await this.getPreferableNewRecord(
        domain,
        'dweb.ipfs.hash',
        'ipfs.html.value',
      );
    });
  }

  /**
   * Resolves the httpUrl attached to domain
   * @param domain - domain name
   */
  async httpUrl(domain: string): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    return await this.callServiceForDomain(domain, async (service) => {
      if (service instanceof Ens) {
        return await service.record(domain, 'url');
      }

      return await this.getPreferableNewRecord(
        domain,
        'browser.redirect_url',
        'ipfs.redirect_domain.value',
      );
    });
  }

  /**
   * Resolves the ipfs email field from whois configurations
   * @param domain - domain name
   * @throws [[ResolutionError]]
   * @returns A Promise that resolves in an email address configured for this domain whois
   */
  async email(domain: string): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    let key = 'whois.email.value';
    const serviceName = await findNamingServiceName(domain);
    if (serviceName === 'ENS') {
      key = 'email';
    }

    try {
      return await this.record(domain, key);
    } catch (err) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        method: err.method,
        methodName: 'email',
        recordName: err.recordName,
      });
    }
  }

  /**
   * @returns the resolver address for a specific domain
   * @param domain - domain to look for
   */
  async resolver(domain: string): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    const resolver = await this.callServiceForDomain(domain, (service) =>
      service.resolver(domain),
    );
    if (!resolver) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain,
      });
    }
    return resolver;
  }

  /**
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomain(domain, (service) =>
      service.owner(domain),
    );
  }

  /**
   * @param domain - domain name
   * @param network - network name
   * @param token - token ticker
   * @returns An owner address of the domain
   */
  async getAddress(
    domain: string,
    network: string,
    token: string,
  ): Promise<string | null> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomain(domain, (service) => {
      return service.getAddress(domain, network, token);
    });
  }

  /**
   * @param domain - domain name
   * @param recordKey - a name of a record to be resolved
   * @returns A record value promise for a given record name
   */
  async record(domain: string, recordKey: string): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomain(domain, (service) =>
      service.record(domain, recordKey),
    );
  }

  /**
   * @param domain domain name
   * @param keys Array of record keys to be resolved
   * @returns A Promise with key-value mapping of domain records
   */
  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomain(domain, (service) =>
      service.records(domain, keys),
    );
  }

  /**
   * @param domain domain name
   * @returns A Promise of whether or not the domain belongs to a wallet
   */
  async isRegistered(domain: string): Promise<boolean> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomainBoolean(
      domain,
      (service) => service.isRegistered(domain),
      {
        throwIfUnsupportedDomain: true,
        expectedValue: true,
      },
    );
  }

  /**
   * @param domain domain name
   * @returns A Promise of whether or not the domain is available
   */
  async isAvailable(domain: string): Promise<boolean> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomainBoolean(
      domain,
      (service) => service.isAvailable(domain),
      {
        throwIfUnsupportedDomain: true,
        expectedValue: false,
      },
    );
  }

  /**
   * @returns Produces a namehash from supported naming service in hex format with 0x prefix.
   * Corresponds to ERC721 token id in case of Ethereum based naming service like ENS or UNS.
   * @param domain domain name to be converted
   * @param namingService "UNS" or "ZNS" (uses keccak256 or sha256 algorithm respectively)
   * @param options formatting options
   * @throws [[ResolutionError]] with UnsupportedDomain error code if domain extension is unknown
   */
  namehash(
    domain: string,
    namingService: NamingServiceName,
    options: NamehashOptions = NamehashOptionsDefault,
  ): string {
    const service = this.serviceMap[namingService];
    if (!service) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedService, {
        namingService,
      });
    }

    domain = prepareAndValidateDomain(domain);
    return this.formatNamehash(service.native.namehash(domain), options);
  }

  /**
   * @returns a namehash of a subdomain with name label
   * @param parent namehash of a parent domain
   * @param label subdomain name
   * @param namingService "ENS", "UNS" or "ZNS" (uses keccak256 or sha256 algorithm respectively)
   * @param options formatting options
   */
  childhash(
    parent: string,
    label: string,
    namingService: NamingServiceName,
    options: NamehashOptions = NamehashOptionsDefault,
  ): string {
    const service = this.serviceMap[namingService];
    if (!service) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedService, {
        namingService,
      });
    }
    return this.formatNamehash(
      service.native.childhash(parent, label),
      options,
    );
  }

  private formatNamehash(hash, options: NamehashOptions) {
    hash = hash.replace('0x', '');
    if (options.format === 'dec') {
      return new BN(hash, 'hex').toString(10);
    } else {
      return options.prefix ? '0x' + hash : hash;
    }
  }

  /**
   * Checks weather the domain name matches the hash
   * @param domain - domain name to check against
   * @param hash - hash obtained from the blockchain
   * @param namingService - "UNS" or "ZNS" (uses keccak256 or sha256 algorithm respectively)
   */
  isValidHash(
    domain: string,
    hash: string,
    namingService: NamingServiceName,
  ): boolean {
    const service = this.serviceMap[namingService];
    if (!service) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedService, {
        namingService,
      });
    }

    domain = prepareAndValidateDomain(domain);
    return service.native.namehash(domain) === hash;
  }

  /**
   * Checks if the domain name is valid according to naming service rules
   * for valid domain names.
   * Example: ENS doesn't allow domains that start from '-' symbol.
   * @param domain - domain name to be checked
   */
  async isSupportedDomain(domain: string): Promise<boolean> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomainBoolean(
      domain,
      (service) => service.isSupportedDomain(domain),
      {
        throwIfUnsupportedDomain: false,
        expectedValue: true,
      },
    );
  }

  /**
   * Returns all record keys of the domain.
   * This method is strongly unrecommended for production use due to lack of support for many ethereum service providers and low performance
   * Method is not supported by ENS
   * @param domain - domain name
   * @deprecated
   */
  async allRecords(domain: string): Promise<CryptoRecords> {
    domain = prepareAndValidateDomain(domain);
    return this.callServiceForDomain(domain, (service) =>
      service.allRecords(domain),
    );
  }

  async dns(domain: string, types: DnsRecordType[]): Promise<DnsRecord[]> {
    const dnsUtils = new DnsUtils();
    domain = prepareAndValidateDomain(domain);
    const dnsRecordKeys = this.getDnsRecordKeys(types);
    const blockchainData = await this.callServiceForDomain(domain, (service) =>
      service.records(domain, dnsRecordKeys),
    );
    return dnsUtils.toList(blockchainData);
  }

  /**
   * Retrieves the tokenURI from the registry smart contract.
   * @returns the ERC721Metadata#tokenURI contract method result
   * @param domain - domain name
   */
  async tokenURI(domain: string): Promise<string> {
    // The `getTokenUri` method isn't supported in ZNS (it'll throw in the next call)
    return this.callServiceForDomain(domain, (service) => {
      if (service.name === NamingServiceName.UNS) {
        const namehash = this.namehash(domain, NamingServiceName.UNS);
        return service.getTokenUri(namehash);
      } else if (service.name === NamingServiceName.ENS) {
        return service.getTokenUri(domain);
      }

      const namehash = this.namehash(domain, NamingServiceName.ZNS);
      return service.getTokenUri(namehash);
    });
  }

  /**
   * Retrieves the data from the endpoint provided by tokenURI from the registry smart contract.
   * @returns the JSON response of the token URI endpoint
   * @param domain - domain name
   */
  async tokenURIMetadata(domain: string): Promise<TokenUriMetadata> {
    const tokenUri = await this.tokenURI(domain);
    return this.getMetadataFromTokenURI(tokenUri);
  }

  /**
   * Retrieves address of registry contract used for domain
   * @param domain - domain name
   * @returns Registry contract address
   */
  async registryAddress(domain: string): Promise<string> {
    return this.callServiceForDomain(domain, (service) =>
      service.registryAddress(domain),
    );
  }

  /**
   * Retrieves the domain name from tokenId by parsing registry smart contract event logs.
   * @throws {ResolutionError} if returned domain name doesn't match the original namehash.
   * @returns the domain name retrieved from token metadata.
   * @param hash - domain name hash or label hash.
   * @param service - name service which is used for lookup.
   */
  async unhash(hash: string, service: NamingServiceName): Promise<string> {
    hash = fromDecStringToHex(hash);
    const services = this.serviceMap[service].usedServices;
    // UNS is the only service and ZNS is the one with the lowest priority.
    // We don't want to access the `native` service, as a user may want to call `UdApi`.
    const method = services[services.length - 1];
    return method.getDomainFromTokenId(hash);
  }

  /**
   * Retrieves address of registry contract used for domain
   * @param domains - domain name
   * @returns Promise<Locations> - A map of domain name and Location (a set of attributes like blockchain,
   */
  async locations(domains: string[]): Promise<Locations> {
    const zilDomains = domains.filter((domain) => domain.endsWith('.zil'));
    const ensDomains = domains.filter((domain) =>
      domain.match(/^([^\s\\.]+\.)+(eth|luxe|kred)+$/),
    );
    const nonEnsDomains = domains.filter(
      (domain) => !domain.match(/^([^\s\\.]+\.)+(eth|luxe|kred)+$/),
    );
    // Here, we call both UNS and ZNS methods and merge the results.
    // If any of the calls fails, this method will fail as well as we aren't interested in partial results.
    // For example, if one of the providers is configured as `UdApi`, it'll fail as the method is unsupported.
    // But if there are no .zil domains with absent UNS locations (i.e. all the requested .zil domains have been
    // migrated to UNS), the ZNS call result will be ignored and an error, if there's one, won't be thrown.

    const unsPromise =
      this.serviceMap.UNS.usedServices[0].locations(nonEnsDomains);
    // Fetch UNS locations first. If we see that there are no .zil domains with absent locations, we can return early.
    const unsLocations = await unsPromise;
    if (zilDomains.length) {
      const znsServices = this.serviceMap.ZNS.usedServices;
      // The actual ZNS service is the last one in the array.
      const znsService = znsServices[znsServices.length - 1];
      const znsPromise = wrapResult(() => znsService.locations(zilDomains));
      const emptyZilEntries = Object.entries(unsLocations).filter(
        ([domain, location]) => domain.endsWith('.zil') && !location,
      );

      // If we don't have locations for some .zil domains in UNS, we want to check whether they are present in ZNS and
      // merge them if that's the case.
      const znsLocations = await znsPromise.then(unwrapResult);
      for (const [domain] of emptyZilEntries) {
        unsLocations[domain] = znsLocations[domain];
      }
    }

    if (ensDomains.length) {
      const ensLocations = await this.serviceMap.ENS.usedServices[0].locations(
        ensDomains,
      );
      for (const ensDomain in ensLocations) {
        unsLocations[ensDomain] = ensLocations[ensDomain];
      }
    }

    return unsLocations;
  }

  /**
   * Returns the token ID that is the primary resolution of the provided address
   * @param address - owner's address
   * @returns Promise<tokenId> - token ID that is the primary resolution of the provided address
   */
  async reverseTokenId(
    address: string,
    options?: ReverseResolutionOptions,
  ): Promise<string | null> {
    const tokenId = await this.reverseGetTokenId(address, options?.location);
    if (tokenId) {
      return tokenId;
    }

    const ensService = this.serviceMap['ENS'].native;
    const ensDomainName = await ensService.reverseOf(address);
    if (ensDomainName) {
      const ensNameHash = ensService.namehash(ensDomainName);
      return `${BigInt(ensNameHash)}`;
    }

    return null;
  }

  /**
   * Returns the domain that is the primary resolution of the provided address
   * @param address - owner's address
   * @returns Promise<URL> - domain URL that is the primary resolution of the provided address
   */
  async reverse(
    address: string,
    options?: ReverseResolutionOptions,
  ): Promise<string | null> {
    const tokenId = await this.reverseGetTokenId(address, options?.location);

    if (tokenId) {
      return this.unhash(tokenId as string, NamingServiceName.UNS);
    }

    const ensService = this.serviceMap['ENS'].native;
    const ensDomainName = await ensService.reverseOf(address);
    if (ensDomainName) {
      return ensDomainName;
    }

    return null;
  }

  private async getMetadataFromTokenURI(
    tokenUri: string,
  ): Promise<TokenUriMetadata> {
    const resp = await Networking.fetch(tokenUri);
    if (resp.ok) {
      return resp.json();
    }

    throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
      providerMessage: await resp.text(),
      method: 'UDAPI',
      methodName: 'tokenURIMetadata',
    });
  }

  private getDnsRecordKeys(types: DnsRecordType[]): string[] {
    const records = ['dns.ttl'];
    types.forEach((type) => {
      records.push(`dns.${type}`);
      records.push(`dns.${type}.ttl`);
    });
    return records;
  }

  private async getPreferableNewRecord(
    domain: string,
    newRecord: string,
    oldRecord: string,
  ): Promise<string> {
    const records = await this.records(domain, [newRecord, oldRecord]);
    if (!records[newRecord] && !records[oldRecord]) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: newRecord,
        domain: domain,
      });
    }
    return records[newRecord] || records[oldRecord];
  }

  private async callServiceForDomain<T>(
    domain: string,
    func: (service: NamingService) => T,
  ): Promise<UnwrapPromise<T>> {
    const serviceName = await findNamingServiceName(domain);
    if (!serviceName) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }

    const servicePromises = this.serviceMap[serviceName].usedServices.map(
      (service) => wrapResult(() => func(service)),
    );

    for (const servicePromise of servicePromises) {
      const serviceCallResult = await servicePromise;
      if (serviceCallResult.error !== null) {
        if (
          !(
            serviceCallResult.error instanceof ResolutionError &&
            serviceCallResult.error.code ===
              ResolutionErrorCode.UnregisteredDomain
          )
        ) {
          throw serviceCallResult.error;
        }
      } else {
        return serviceCallResult.result;
      }
    }

    throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
      domain,
    });
  }

  // Expects that a called method never throws the `ResolutionErrorCode.UnregisteredDomain` (it doesn't handle it).
  private async callServiceForDomainBoolean(
    domain: string,
    func: (service: NamingService) => Promise<boolean>,
    options: {throwIfUnsupportedDomain: boolean; expectedValue: boolean},
  ): Promise<boolean> {
    const serviceName = await findNamingServiceName(domain);
    if (!serviceName) {
      if (!options.throwIfUnsupportedDomain) {
        return !options.expectedValue;
      }
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }

    const servicePromises = this.serviceMap[serviceName].usedServices.map(
      (service) => wrapResult(() => func(service)),
    );

    for (const servicePromise of servicePromises) {
      const {result, error} = await servicePromise;
      if (error) {
        if (
          !(
            error instanceof ResolutionError &&
            error.code === ResolutionErrorCode.UnregisteredDomain
          )
        ) {
          throw error;
        }
      } else if (result === options.expectedValue) {
        // If the result is not the one which is expected, we don't want to return it immediately.
        return result;
      }
    }

    return !options.expectedValue;
  }

  private async reverseGetTokenId(
    address: string,
    location?: UnsLocation,
  ): Promise<string | null> {
    let tokenId: string | null = null;

    const unsService = this.serviceMap['UNS'].native;
    tokenId = await unsService.reverseOf(address, location);

    if (!tokenId) {
      const baseUnsService = this.serviceMap['UNS_BASE'].native;
      tokenId = await baseUnsService.reverseOf(address, location);
    }

    return tokenId;
  }

  private getUnsConfig(config: ResolutionConfig): Uns | UdApi {
    if (config.apiKey) {
      return new Uns({
        locations: {
          Layer1: {
            url: `${DEFAULT_UNS_PROXY_SERVICE_URL}/chains/eth/rpc`,
            network: 'mainnet',
            proxyServiceApiKey: config.apiKey,
            blockchain: BlockchainType.ETH,
          },
          Layer2: {
            url: `${DEFAULT_UNS_PROXY_SERVICE_URL}/chains/matic/rpc`,
            network: 'polygon-mainnet',
            proxyServiceApiKey: config.apiKey,
            blockchain: BlockchainType.POL,
          },
        },
      });
    }

    return isApi(config.sourceConfig?.uns)
      ? new UdApi(config.sourceConfig?.uns)
      : new Uns(config.sourceConfig?.uns);
  }

  private getUnsBaseConfig(config: ResolutionConfig): Uns | UdApi {
    if (config.apiKey) {
      return new Uns({
        locations: {
          Layer1: {
            url: `${DEFAULT_UNS_PROXY_SERVICE_URL}/chains/eth/rpc`,
            network: 'mainnet',
            proxyServiceApiKey: config.apiKey,
            blockchain: BlockchainType.ETH,
          },
          Layer2: {
            url: `${DEFAULT_UNS_PROXY_SERVICE_URL}/chains/base/rpc`,
            network: 'base-mainnet',
            proxyServiceApiKey: config.apiKey,
            blockchain: BlockchainType.BASE,
          },
        },
      });
    }

    return isApi(config.sourceConfig?.uns)
      ? new UdApi(config.sourceConfig?.uns)
      : new Uns(config.sourceConfig?.uns);
  }

  private getZnsConfig(config: ResolutionConfig): Zns | UdApi {
    return isApi(config.sourceConfig?.zns)
      ? new UdApi(config.sourceConfig?.zns)
      : new Zns(config.sourceConfig?.zns);
  }

  private getEnsConfig(config: ResolutionConfig): Ens | UdApi {
    if (config.apiKey) {
      return new Ens({
        url: `${DEFAULT_UNS_PROXY_SERVICE_URL}/chains/eth/rpc`,
        network: 'mainnet',
        proxyServiceApiKey: config.apiKey,
      });
    }
    return isApi(config.sourceConfig?.ens)
      ? new UdApi(config.sourceConfig?.ens)
      : new Ens(config.sourceConfig?.ens);
  }
}

export {Resolution};

type ServicesEntry = {
  usedServices: NamingService[];
  // Note: even if a user configures the lib in the API mode, this will contain a blockchain naming service.
  native: NamingService;
};

function isApi(obj: any): obj is Api {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'api' in obj &&
    typeof obj.api === 'boolean'
  );
}
