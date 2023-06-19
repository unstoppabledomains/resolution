import BN from 'bn.js';
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
} from './types/publicTypes';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import DnsUtils from './utils/DnsUtils';
import {
  findNamingServiceName,
  signedLink,
  UnwrapPromise,
  wrapResult,
  unwrapResult,
} from './utils';
import {Eip1993Factories as Eip1193Factories} from './utils/Eip1993Factories';
import {NamingService} from './NamingService';
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
 *           url: "https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39",
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
    const zns = this.getZnsConfig(config);

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
      [NamingServiceName.ZNS]: {
        usedServices: equalUdApiProviders ? [uns] : [uns, zns],
        native: zns instanceof Zns ? zns : new Zns(),
      },
    };
  }

  /**
   * AutoConfigure the blockchain network for UNS
   * We make a "net_version" JSON RPC call to the blockchain either via url or with the help of given provider.
   * @param sourceConfig - configuration object for uns
   * @returns configured Resolution object
   */
  static async autoNetwork(
    sourceConfig: AutoNetworkConfigs,
  ): Promise<Resolution> {
    const resolution = new this();

    if (sourceConfig.uns) {
      const uns = await Uns.autoNetwork(sourceConfig.uns);
      resolution.serviceMap[NamingServiceName.UNS] = {
        usedServices: [uns],
        native: uns,
      };
    }

    return resolution;
  }

  /**
   * Creates a resolution with configured infura id for uns
   * @param infura - infura project id
   * @param networks - an optional object that describes what network to use when connecting UNS default is mainnet
   */
  static infura(
    infura: string,
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
   * @param networks - an object that describes what network to use when connecting UNS or ZNS default is mainnet
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromResolutionProvider(networks: {
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
    if (networks.uns) {
      return this.fromEthereumEip1193Provider({
        uns: networks.uns,
      });
    }
    if (networks.zns) {
      return this.fromZilliqaProvider(networks.zns.provider, networks);
    }
    throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
      providerMessage: 'Must specify network for uns or zns',
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param networks - an object that describes what network to use when connecting UNS default is mainnet
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromEthereumEip1193Provider(networks: {
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
   * @param networks - an optional object with 1.x version provider from web3 ( must implement send(payload, callback) ) that describes what network to use when connecting UNS default is mainnet
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L165
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-providers-http/src/index.js#L95
   */
  static fromWeb3Version1Provider(networks: {
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
   * @param networks - an object that describes what network to use when connecting UNS default is mainnet
   * @see https://github.com/ethers-io/ethers.js/blob/v4-legacy/providers/abstract-provider.d.ts#L91
   * @see https://github.com/ethers-io/ethers.js/blob/v5.0.4/packages/abstract-provider/src.ts/index.ts#L224
   * @see https://docs.ethers.io/ethers.js/v5-beta/api-providers.html#jsonrpcprovider-inherits-from-provider
   * @see https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
   */
  static fromEthersProvider(networks: {
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
  async addr(domain: string, ticker: string): Promise<string> {
    return this.record(domain, `crypto.${ticker.toUpperCase()}.address`);
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
  ): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    const recordKey = `crypto.${ticker.toUpperCase()}.version.${chain.toUpperCase()}.address`;
    return this.callServiceForDomain(domain, (service) =>
      service.record(domain, recordKey),
    );
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
    return this.record(domain, 'gundb.username.value');
  }

  /**
   * Resolve a gundb public key from the domain record
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]]
   * @returns a promise that resolves in gundb public key
   */
  async chatPk(domain: string): Promise<string> {
    return this.record(domain, 'gundb.public_key.value');
  }

  /**
   * Resolves the IPFS hash configured for domain records on ZNS
   * @param domain - domain name
   * @throws [[ResolutionError]]
   */
  async ipfsHash(domain: string): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    return this.getPreferableNewRecord(
      domain,
      'dweb.ipfs.hash',
      'ipfs.html.value',
    );
  }

  /**
   * Resolves the httpUrl attached to domain
   * @param domain - domain name
   */
  async httpUrl(domain: string): Promise<string> {
    domain = prepareAndValidateDomain(domain);
    return this.getPreferableNewRecord(
      domain,
      'browser.redirect_url',
      'ipfs.redirect_domain.value',
    );
  }

  /**
   * Resolves the ipfs email field from whois configurations
   * @param domain - domain name
   * @throws [[ResolutionError]]
   * @returns A Promise that resolves in an email address configured for this domain whois
   */
  async email(domain: string): Promise<string> {
    return this.record(domain, 'whois.email.value');
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
    return this.callServiceForDomain(domain, (service) =>
      service.getAddress(domain, network, token),
    );
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
   * Corresponds to ERC721 token id in case of Ethereum based naming service like UNS.
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
   * @param namingService "UNS" or "ZNS" (uses keccak256 or sha256 algorithm respectively)
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
    // The `getTokenUri` method isn't supported in ZNS (it'll throw in the next call), so we just assume that we need
    // to calculate a UNS namehash.
    const namehash = this.namehash(domain, NamingServiceName.UNS);
    return this.callServiceForDomain(domain, (service) =>
      service.getTokenUri(namehash),
    );
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
   * @throws {ResolutionError} if returned domain name doesn't match the original namhash.
   * @returns the domain name retrieved from token metadata
   * @param hash - domain hash
   * @param service - nameservice which is used for lookup
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

    // Here, we call both UNS and ZNS methods and merge the results.
    // If any of the calls fails, this method will fail as well as we aren't interested in partial results.
    // For example, if one of the providers is configured as `UdApi`, it'll fail as the method is unsupported.
    // But if there are no .zil domains with absent UNS locations (i.e. all the requested .zil domains have been
    // migrated to UNS), the ZNS call result will be ignored and an error, if there's one, won't be thrown.

    const unsPromise = this.serviceMap.UNS.usedServices[0].locations(domains);
    if (!zilDomains.length) {
      return unsPromise;
    }

    const znsServices = this.serviceMap.ZNS.usedServices;
    // The actual ZNS service is the last one in the array.
    const znsService = znsServices[znsServices.length - 1];
    // Start fetching ZNS locations before awaiting UNS ones for the concurrency sake, wrap errors to avoid unhandled
    // exceptions in case we decide that we aren't interested in the result.
    const znsPromise = wrapResult(() => znsService.locations(zilDomains));

    // Fetch UNS locations first. If we see that there are no .zil domains with absent locations, we can return early.
    const unsLocations = await unsPromise;
    const emptyZilEntries = Object.entries(unsLocations).filter(
      ([domain, location]) => domain.endsWith('.zil') && !location,
    );
    if (!emptyZilEntries.length) {
      return unsLocations;
    }
    // If we don't have locations for some .zil domains in UNS, we want to check whether they are present in ZNS and
    // merge them if that's the case.
    const znsLocations = await znsPromise.then(unwrapResult);
    for (const [domain] of emptyZilEntries) {
      unsLocations[domain] = znsLocations[domain];
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
  ): Promise<string> {
    const tokenId = this.reverseGetTokenId(address, options?.location);
    return tokenId;
  }

  /**
   * Returns the domain that is the primary resolution of the provided address
   * @param address - owner's address
   * @returns Promise<URL> - domain URL that is the primary resolution of the provided addresss
   */
  async reverse(
    address: string,
    options?: ReverseResolutionOptions,
  ): Promise<string | null> {
    const tokenId = await this.reverseGetTokenId(address, options?.location);

    if (tokenId) {
      return this.unhash(tokenId as string, NamingServiceName.UNS);
    }

    return null;
  }

  private async getMetadataFromTokenURI(
    tokenUri: string,
  ): Promise<TokenUriMetadata> {
    const resp = await Networking.fetch(tokenUri, {});
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
    const serviceName = findNamingServiceName(domain);
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
    const serviceName = findNamingServiceName(domain);
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
  ): Promise<string> {
    const service = this.serviceMap['UNS'].native;
    const tokenId = await service.reverseOf(address, location);
    return tokenId as string;
  }

  private getUnsConfig(config: ResolutionConfig): Uns | UdApi {
    if (config.apiKey) {
      return new Uns({
        locations: {
          Layer1: {
            url: `${DEFAULT_UNS_PROXY_SERVICE_URL}/chains/eth/rpc`,
            network: 'mainnet',
            proxyServiceApiKey: config.apiKey,
          },
          Layer2: {
            url: `${DEFAULT_UNS_PROXY_SERVICE_URL}/chains/matic/rpc`,
            network: 'polygon-mainnet',
            proxyServiceApiKey: config.apiKey,
          },
        },
      });
    }

    return isApi(config.sourceConfig?.uns)
      ? new UdApi(config.sourceConfig?.uns)
      : new Uns(config.sourceConfig?.uns);
  }

  getZnsConfig(config: ResolutionConfig): Zns | UdApi {
    return isApi(config.sourceConfig?.zns)
      ? new UdApi(config.sourceConfig?.zns)
      : new Zns(config.sourceConfig?.zns);
  }
}

export {Resolution};

type ServicesEntry = {
  usedServices: NamingService[];
  // Note: even if a user configures the lib in the API mode, this will contain a blockchain naming service.
  native: NamingService;
};

function isApi(obj: any): obj is Api {
  return obj && obj.api;
}
