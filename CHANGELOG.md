## 8.3.2

- Fixed reverse function padding issue

## 8.3.1

- Fixed tokenURI error handling

## 8.2.0

- Fixed default library configuration
- Added function for alchemy configuration `Resolution#alchemy`

## 8.0.0

- Added Node.js v16 support
- .zil domains are now also looked up via UNS
- The `locations` method was implemented for ZNS

### Breaking changes

- Dropped Node.js v10 support
- The `serviceName` method was removed
- The following methods got a new mandatory argument to specify NamingService:

  - `namehash`
  - `isValidHash`

  Note: if you used them for .zil domains, you should now determine where a
  domain is located first, It's possible that a domain has been migrated from
  ZNS to UNS, which would imply the usage of a different namehashing algorithm
  to calculate its token id.

## 7.2.0

- Implementation of reverse resolution methods

## 7.1.3

- Implemented function getDomainFromTokenId in UdApi

## 7.1.2

- Removed unused code which caused build issues on some environments

## 7.1.0

- Throw `ResolutionErrorCode.InvalidDomainAddress` error if domain contains
  special characters
  - Domain name is being validated according to the following regular
    expression: `^[.a-z0-9-]+$`

## 7.0.0

- ENS support is completely removed
- Removes `bip44-constants`, `@ensdomains/address-encoder`, and `content-hash`
  package dependencies
- Methods that query ENS domains (.eth, .luxe, .xyz, .kred, .reverse) throw
  UnsupportedDomain

## 6.0.3

- Remove relative imports to avoid issues in bundlers. Restrict relative imports
  by adding eslint rule.

## 6.0.2

- `Resolution#owner` method doesn't throw an error in case of empty resolver

## 6.0.1

- Set correct polygon-mainnet provider if use default settings

## 6.0.0

### Breaking changes

- CLI tool was removed. Please use new binary CLI tool instead:
  [Github repo](https://github.com/unstoppabledomains/resolution-cli/releases).
- Constructor has changed. If you used `uns` configuration you have to specify
  parameters for L1 and L2 locations (Ethereum and Polygon mainnets).
- ENS support is deprecated and will be removed in future.
- Factory methods has changed. All of them requires provide L1 and L2 locations
  configuration for UNS. For example: `uns: {locations: {L1: ..., L2...}}`.
  - The list of affected methods:
    - `Resolution#infura`
    - `Resolution#fromResolutionProvider`
    - `Resolution#fromEthereumEip1193Provider`
    - `Resolution#fromWeb3Version0Provider`
    - `Resolution#fromWeb3Version1Provider`
    - `Resolution#fromEthersProvider`
- `Resolution#location` method is replaced by `Resolution#locations`.

### New methods and features

- 🎉 🎉 🎉 Add Polygon Layer 2 support!
- Add `Resolution#locations` method which will help to determine domains
  location (blockhain, networkId) and useful metadata like owner, resolver,
  registry addresses, provider url if possible.
  - Method returns:
    - Domain blockhain (ETH or MATIC)
    - Blockchain network id (numeric)
    - Owner address
    - Resolver address
    - Registry address
    - Provider URL if possible
      - Infura URL by default

## 5.0.2

- Replaces `node-fetch` with `cross-fetch` package

## 5.0.1

- Add `elliptic` package dependency in order to enable twitter verification
  support by default

## 5.0.0

### Breaking changes

- Constructor has changed. If you used cns configurations rename "cns" it to
  "uns" instead.
  - For example: `new Resolution({sourceConfig: {uns: {...uns config}}})`
- Method `Resolution#fromEip1193Provider` was renamed to
  `Resolution#fromEthereumEip1193Provider`
- Factory methods has changed. All of them requires `{uns: {... uns config}}` in
  parameters instead of `cns`.
  - The list of affected factory methods:
    - `Resolution#autoNetwork`
    - `Resolution#infura`
    - `Resolution#fromEthereumEip1193Provider` (former
      `Resolution#fromEip1193Provider`)
    - `Resolution#fromWeb3Version0Provider`
    - `Resolution#fromWeb3Version1Provider`
    - `Resolution#fromEthersProvider`
- `Resolution#isSupportedDomain` method is now asynchronous

### New methods and features

- 🎉 🎉 🎉 Added support for new TLD's ( .888, .nft, .coin, .blockchain,
  .wallet, .x, .bitcoin, .dao )
- Typo fix: Rename `Eip1993Factories()` -> `Eip1193Factories()`. Old name is
  still available under the alias `Eip1993Factories`
- Introduced new method
  `Resolution#registryAddress -> Retrieves address of registry contract used for domain`
- Introduced new method
  `Resolution#unhash -> Retrieves the domain name from tokenId by parsing registry smart contract event logs`
- Introduced new method
  `Resolution#reverse -> This method is only for ens at the moment. Reverse the ens address to a ens registered domain name`
- Introduced new method
  `Resolution#tokenURI -> Retrieves the tokenURI from the registry smart contract`
- Introduced new method
  `Resolution#tokenURIMetadata -> etrieves the data from the endpoint provided by tokenURI from the registry smart contract`
- Introduced new factory method
  `Resolution#fromZilliqaProvider -> Creates a resolution instance with configured provider from Zilliqa provider`
- Introduced new factory method
  `Resolution#fromResolutionProvider -> Creates a resolution from Resolution compatitable provider`
- Introduced new factory method
  `Resolution#fromEthereumEip1193Provider -> Creates a resolution from EIP-1193 compatitable provider`
- Return ENS support
- Add custom network support for ENS

## 4.0.1 - 4.0.2

- No changes made. Version bump so that it would appear as latest version on
  NPM.

## 4.0.0

- Remove ENS support

## 3.0.0

- ENS support is disabled by default. To enable ENS support install additional
  packages:
  - `"bip44-constants": "^8.0.5"`
  - `"@ensdomains/address-encoder": ">= 0.1.x <= 0.2.x"`
  - `"content-hash": "^2.5.2"`
- If trying to resolve ENS domain and some package is missing the library throws
  `ConfigurationError`

## 2.1.0

- Introduce new factory method Resolution#autonetwork. This factory is
  asynchronious and allows to skip the network configuration for either ens or
  cns. This method is making a "net_version" call to the blockchain provider in
  order to configure itself.

## 2.0.0

- Remove deprecated methods
  - Resolution#address
  - Resolution#ipfsRedirect
  - Resolution#addressOrThrow
  - ResolutionErrorCode.UnspecifiedCurrency
- Simplify constructor
  - remove type Blockchain
  - remove type API
  - Introduced single config type SourceConfig

## 1.20.0

- Introduced Resolution#multiChainAddr(domain: string, ticker: string, chain:
  string) - More general method to fetch multi chain records.
- Deprecated Resolution#usdt method in favor of multiChainAddr
- Deprecated TickerVersion

## 1.19.0

- Update @ensdomains/address-encoder dependency to remove security audit issues
- Remove webpack dependency to remove security audit issues

## 1.18.0

- Use Infura Ethereum Provider by default

## 1.17.0

- Add support for TLOS

## 1.16.2

- Add support of USDT for CLI tool. Try
  `resolution --usdt-versions OMNI,ERC20 -d udtestdev-usdt.crypto` command

## 1.16.1

- Fixed Fetch error display when used in browser env

## 1.16.0

- Fixed bug with infura.com -> infura.io

## 1.12.0

- Introduced Resolution#usdt(domain: string, version: TickerVersion) which
  resolves in various USDT records from different chains
- Introduced TickerVersion enum which holds all values for version parametr ar
  Resolution#usdt

## 1.10.4-1.11.1

- updated resolution cli, config option is depricated
- introduced --ethereum-url option to provide a non default blockchain provider

## 1.10.3

- provide valid json to the CLI output

## 1.10.2

- hotfix regarding incompatable types with Ethers InfuraProvider

## 1.10.1

- Fixed bug regarding incompatable types with Ethers InfuraProvider
- Remove ability to read from registry directly. `ProxyReader` address is now
  required. #105.

## 1.10.0

- No changes

## 1.9.0

- Add `Resolution#records` method to query multiple records #96
- Add formatting options for `Resolution#namehash` and `Resolution#childhash`
  #91
- Add `Resolution#dns` method to query dns records from blockchain #99
- Add DnsUtils as a helper class to convert from CryptoRecord type to DnsRecord
  and vice-versa #99
- Plug-in network config from dot-crypto library #101
- Removed elliptic from dependacy list. (when needed user should install it
  separately)

## 1.8.3

- Enhanced Log searched. Now getting all records from the last resetRecords
  event if available

## 1.8.2

- Update Twitter validation algorithm

## 1.8.0 - 1.8.1

- Added `Resolution#twitter` method that returns back the verified twitter
  handle

## 1.7.0

- Added `Resolution#addr` method that behaves consistently with other record
  getter methods.

## 1.6.2

- Deprecated Resolution#address Resolution#addressOrThrow
  ResolutionErrorCode.UnspecifiedCurrency

## 1.8.2

- Added ability to get verified twitter account connected to CNS domain via
  `Resolution#twitter` method.

## 1.6.1

- Used ProxyReader(0x7ea9ee21077f84339eda9c80048ec6db678642b1) instead of
  Registry contract by default

## 1.6.0

- Added support of web3.js and ethers.js providers
- Throw `ConfigurationError` instead of basic `Error` when Resolution library is
  configured incorrectly so that it can be targeted within `catch` block.
- Use [@ethersproject/abi](https://www.npmjs.com/package/@ethersproject/abi)
  instead of custom abi encoder
- Change default ethereum provider from infura to linkpool #75

## 1.5.1

- fixing the version

## 1.4.1

- Resolution#chatPk -> get a gundb public key from domain's record
- Fix the bug with Resolution#chatId for ens domains

## 1.4.0

- Resolve custom records
- Resolution#chatId -> get a gundb chat id from domain's record
- Add kovan address of crypto registry
- Add support of more networks for ENS

## 1.3.6

- Add -o, --owner flag to CLI. Flag resolves in owner address.

## 1.3.5

- Fixed CLI config file persistent location issue
- All domains are trimmed and lowercased before proceed with the direct lookup

## 1.3.4

- Fixed wrong ResolutionErrorCode for unregistered .crypto domain in method
  cns#address

## 1.3.3

- CLI -n, --namehash flag
- CLI -m, --meta flag, shortcut for -siren flags
- Updated README

## 1.3.2

- domains like "hello..crypto", "hello..eth", "hello..zil" should throw
  ResolutionErrorCode.UnsupportedDomain

## 1.3.1

- fixed command line interface configuration with url

## 1.3.0

- Add support for .kred domains on ENS

## 1.2.0

- Added a command line interface

## 1.1.0

- Using flexible dependacies instead of locked versions
- Moved sizecheck to a separate dev dependacy
- Added web3Provider Support [#57]
- Added factories Resolution.infura, Resolution.provider,
  Resolution.jsonRPCprovider

## 1.0.24

- Bug fix, namehash the domain before asking for a resolver on cns.
- Bug fix, ignore the resolutionErrorCode.RecordNotFound when looking up the
  crypto address.

## 1.0.23

- Updated ens registry address according to
  https://github.com/ensdomains/ens/security/advisories/GHSA-8f9f-pc5v-9r5h
- Removed test extension from ens resolvable tld's

## 1.0.22

- Added size check for the package with limit 500.00 KB

## 1.0.20

- Added Resolution#resolver(domain:string): Promise<string>
- Removed ethers keccak256 lodash from package.json

## 1.0.19

- Included the AbiEncoder from
  [ethers-js](https://github.com/ethers-io/ethers.js/blob/b288ad9ba791073df2768c580abe9173c6b851f6/src.ts/utils/abi-coder.ts)
- removed folowing packages
- - "eth-ens-namehash",

## 1.0.18

- Removed unused ethers.js

## 1.0.17

- Fixed a bug with cns throws RecordNotFound instead of
  ResolutionErrorCode.UnregisteredDomain in Cns#address
- Added a way to connect Infura API secret key from .env files (should be
  INFURA=<SECRET KEY>)

## 1.0.16

- Resolution#childhash(parent: NodeHash, label: string) -> method to return a
  childhash

## 1.0.15

- Resolution#ipfsHash(domain:string): Promise<string> -> method to return an
  ipfsHash from the domain's records
- Deprecate Resolution#ipfsRedirect
- Resolution#httpUrl(domain:string): Promise<string> -> method to use instead of
  depricated Resolution#ipfsRedirect, returns an http url from the domain's
  records
- Resolution#email(domain:string): Promise<string> -> method to return an email
  from the domain's records

## 1.0.14

- Bugfix #namehash for ZNS

## 1.0.13

- Domain that starts and ends with '-' are not valid anymore in ENS.
- Bugfix Resolution#resolve on ENS domain when resolver has no address record
- Resolution#isValidHash method - checks wheather a domain name matches the
  given hash from the blockchain

## 1.0.9-1.0.10

- Revert back changes made for browser / node detection.

## 1.0.8

- Support Resolution#namehash of .crypto root node

## 1.0.7

- Fixed compatibility with some versions of hash.js library

## 1.0.5

- Instead of `NoRecordFound` returning `UnregisteredDomain` error for .crypto in
  situations when there is no resolver

## 1.0.4

- Raise `ResolutionError` with `NamingServiceDown` code on error on ethereum RPC
  response
- BREAKING CHANGE: use capital letter for service name inside
  `Resolution#resolve => {meta: {type}}`
- NamingService#serviceName(domain: string): string

## 1.0.3

- Fixed bug with not having a ttl record on the blockchain. Now returns 0
  instead of throwing an error
- Changed main registry address for CNS to
  0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe

## 1.0.2

- Fixed bug with not finding cointypes when currency ticker is given as
  smallcase

## 1.0.1

- .crypto support with Resolution.cns

## 0.3.6

- Fix root tld support for ZNS

## 0.3.4

- Deprecated `UNCLAIMED_DOMAIN_RESPONSE` (use `UnclaimedDomainResponse` instead)
- Excluded private, internal (public) and not exported symbols from the
  documentation
- Excluded internal (public) symbols from the declaration files
- Added ResolutionErrorCode enum for more convenient error handling

## 0.3.3

- NamingService#record -> gets an arbitrary record from the corresponding naming
  service
- Resolution#ipfsHash -> gets IPFS hash for a specific supported domain
- Resolution#email -> gets ipfs email field of whois object for a specific
  supported domain
- Resolution#ipfsRedirect -> gets ipfs redirect url record for a specific
  supported domain

## 0.3.1 - 0.3.2

- Resolution#owner method - returns an owner address of the domain
- Fixed issue with user agent on browsers instances for Resolution
- Added docs generation scripts
- Unstoppable API is not initilized when blockchain param is true inside the
  Resolution configuration

## 0.3.0

- Resolution#addressOrThrow - new method that throws ResolutionError if currency
  address is not found
- Resolution#namehash - new method for namehashing the domain name. Name hash of
  a domain is an ID that is used to store the information about the domain on
  the blockchain. If you would browse the blockchain, you would never see domain
  names, just name hashes.
- Now throwing ResolutionError when ENS or ZNS naming service is down
- ENS multicoin support

## 0.2.43

- Resolution#addressOrThrow - new method that throws ResolutionError if currency
  address is not found
- Resolution#namehash - new method for namehashing the domain name. Name hash of
  a domain is an ID that is used to store the information about the domain on
  the blockchain. If you would browse the blockchain, you would never see domain
  names, just name hashes.
- Now throwing ResolutionError when ENS or ZNS naming service is down
- ENS multicoin support

## 0.2.42

- Added documentation to Resolution, ENS and ZNS files
- Connected typedoc to the project
- Added user-agent to fetch calls for https://unstoppabledomains.com/
- Specified scripts for automating generation of docs

## 0.2.41

- Make Zns#getContractField #getContractMapValue and
  #getResolverRecordsStructure pseudo-private methods by adding \_ in front of
  the names
- Added Zns#Resolution method which returns everything what is stored on zilliqa
  for specific domain

## 0.2.39 - 0.2.40

- Zns network and url options support
- Ens and Zns support custom contracts registryAddress
- Adjust for breaking change at GetSmartContractSubState Zilliqa RPC call

## 0.2.38

- Updated zilliqa library to 0.8.1

## 0.2.37

- Support node 12
- Transform owner old zil address format to a new zil format

## 0.2.36

- Add return type for Ens#resolve
- Add isSupportedDomainInNetwork in Resolution
- Add isSupportedNetwork for ZNS

## 0.2.35

- Make Ens#network and Ens#url public properties
- Change default ENS source protocol from wss (websocket) to https
- Make Ens `web3`, `ensContract` and `registrarContract` private properties
- Ability to provide ENS network configuration as string like `mainnet`,
  `testnet` etc.
- Make properties of `Resolution` class readonly

## 0.2.34 - 0.2.31

- Added isSupportedNetwork method for ens
- Make isSupportedNetwork configurable from outside by passing network agrument
- isSupportedDomain is no longer checks for supported network inside the ens

## 0.2.30 and earlier

- Changelog is not tracked
