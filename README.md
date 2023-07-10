# Resolution

[![NPM version](https://img.shields.io/npm/v/@unstoppabledomains/resolution.svg?style=flat)](https://www.npmjs.com/package/@unstoppabledomains/resolution)
![CI](https://github.com/unstoppabledomains/resolution/workflows/CI/badge.svg?branch=master)
[![Bundle Size Minified](https://img.shields.io/bundlephobia/min/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)
[![Bundle Size Minified Zipped](https://img.shields.io/bundlephobia/minzip/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)
[![Unstoppable Domains Documentation](https://img.shields.io/badge/Documentation-unstoppabledomains.com-blue)](https://docs.unstoppabledomains.com/)
[![Get help on Discord](https://img.shields.io/badge/Get%20help%20on-Discord-blueviolet)](https://discord.gg/b6ZVxSZ9Hn)

- [Installing Resolution](#installing-resolution)
- [Updating Resolution](#updating-resolution)
- [Using Resolution](#using-resolution)
- [Error Handling](#error-handling)
- [Development](#development)
- [Free advertising for integrated apps](#free-advertising-for-integrated-apps)

Resolution is a library for interacting with blockchain domain names. It can be
used to retrieve
[payment addresses](https://unstoppabledomains.com/learn/how-to-send-crypto-using-your-domain)
and IPFS hashes for
[decentralized websites](https://support.unstoppabledomains.com/support/solutions/articles/48001181925-build-website).

Resolution is primarily built and maintained by
[Unstoppable Domains](https://unstoppabledomains.com/).

Resolution supports different decentralized domains. Please, refer to the
[Top Level Domains List](https://api.unstoppabledomains.com/resolve/supported_tlds)

For more information, see our detailed
[API Reference](https://unstoppabledomains.github.io/resolution/).

## Installing Resolution

Resolution can be installed with either `yarn` or `npm`.

```shell
yarn add @unstoppabledomains/resolution
```

```shell
npm install @unstoppabledomains/resolution --save
```

If you're interested in resolving domains via the command line, see our
[CLI section](#command-line-interface).

## Updating Resolution

Resolution can be updated with either `yarn` or `npm`.

```shell
yarn upgrade @unstoppabledomains/resolution --latest
```

```shell
npm update @unstoppabledomains/resolution --save
```

## Using Resolution

## Initialize with Unstoppable Domains' UNS Proxy Provider

```javascript
const {default: Resolution} = require('@unstoppabledomains/resolution');

// obtain a key by following this document https://docs.unstoppabledomains.com/domain-distribution-and-management/quickstart/retrieve-an-api-key/#api-key
const resolution = new Resolution({apiKey: '<api_key>'});
```

> NOTE: The `apiKey` is only used resolve domains from UNS. Behind the scene, it
> still uses the default ZNS (Zilliqa) RPC url. For additional control, please
> specify your ZNS configuration.

```javascript
const {default: Resolution} = require('@unstoppabledomains/resolution');

const resolution = new Resolution({
  apiKey: '<api_key>',
  sourceConfig: {
    zns: {
      url: 'https://api.zilliqa.com',
      network: 'mainnet',
    },
  },
});
```

## Initialize with Custom Provider Configuration

You may want to specify a custom provider:

- if you want to use a dedicated blockchain node
- if you want to monitor app usage
- if you already have a provider in your app to re-use it for domain resolution

Default provider can be changed by changing constructor options
`new Resolution(options)` or by using one of the factory methods:

- `Resolution.alchemy()`
- `Resolution.infura()`
- `Resolution.fromWeb3Version1Provider()`
- `Resolution.fromEthersProvider()`
- etc.

```javascript
const {default: Resolution} = require('@unstoppabledomains/resolution');

// obtain a key from https://www.infura.io
const resolution = new Resolution({
  sourceConfig: {
    uns: {
      locations: {
        Layer1: {
          url: 'https://mainnet.infura.io/v3/<infura_api_key>',
          network: 'mainnet',
        },
        Layer2: {
          url: 'https://polygon-mainnet.infura.io/v3/<infura_api_key>',
          network: 'polygon-mainnet',
        },
      },
    },
    zns: {
      url: 'https://api.zilliqa.com',
      network: 'mainnet',
    },
  },
});
```

## Initialize with Autoconfiguration of blockchain network

In some scenarios system might not be flexible enough to easy distinguish
between various Ethereum testnets at compilation time. In this case, Resolution
library provide a special async constructor
`await Resolution.autonetwork(options)`. This method makes a JSON RPC
"net_version" call to the provider to get the network id.

This method configures only Uns. Zns is supported only on Zilliqa mainnet which
is going to be used in any cases. You can provide a configured provider or a
blockchain url as in the following example:

```
await Resolution.autoNetwork({
  uns: {provider},
});
```

### Examples

To see all constructor options and factory methods check
[Unstoppable API reference](https://unstoppabledomains.github.io/resolution).

#### Look up a domain's crypto address

```javascript
function resolve(domain, currency) {
  resolution
    .addr(domain, currency)
    .then((address) => console.log(domain, 'resolves to', address))
    .catch(console.error);
}

resolve('brad.crypto', 'ETH');
resolve('brad.zil', 'ZIL');
```

### Find the IPFS hash for a decentralized website

Create a new file in your project, `ipfs_hash.js`.

```javascript
function resolveIpfsHash(domain) {
  resolution
    .ipfsHash(domain)
    .then((hash) =>
      console.log(
        `You can access this website via a public IPFS gateway: https://gateway.ipfs.io/ipfs/${hash}`,
      ),
    )
    .catch(console.error);
}

resolveIpfsHash('homecakes.crypto');
```

### Find a custom record

Create a new file in your project, `custom-resolution.js`.

```javascript
function resolveCustomRecord(domain, record) {
  resolution
    .records(domain, [record])
    .then((value) => console.log(`Domain ${domain} ${record} is: ${value}`))
    .catch(console.error);
}

resolveCustomRecord('homecakes.crypto', 'custom.record.value');
```

### Resolve wallet address using `addr`

This API is used to retrieve wallet address for single address record. (See
[Cryptocurrency payment](https://docs.unstoppabledomains.com/resolution/guides/records-reference/#cryptocurrency-payments)
section for the record format)

With `homecakes.crypto` has `crypto.ETH.address` on-chain:

```javascript
function getWalletAddr(domain, ticker) {
  resolution
    .addr(domain, ticker)
    .then((address) =>
      console.log(`Domain ${domain} has address for ${ticker}: ${address}`),
    )
    .catch(console.error);
}
getWalletAddr('homecakes.crypto', 'ETH');
// Domain homecakes.crypto has address for ETH: 0xe7474D07fD2FA286e7e0aa23cd107F8379085037
```

### Resolve multi-chain address format using `multiChainAddr`

This API is used to retrieve wallet address for multi-chain address records.
(See
[multi-chain currency](https://docs.unstoppabledomains.com/resolution/guides/records-reference/#multi-chain-currencies))

With `aaron.x` has `crypto.AAVE.version.ERC20.address` on-chain:

```javascript
function getMultiChainWalletAddr(domain, ticker, network) {
  resolution
    .multiChainAddr(domain, ticker, network)
    .then((address) =>
      console.log(
        `Domain ${domain} has address for ${ticker} on network ${network}: ${address}`,
      ),
    )
    .catch(console.error);
}
getMultiChainWalletAddr('aaron.x', 'AAVE', 'ETH');
// Domain aaron.x has address for AAVE on network ETH: 0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af
```

### Resolve wallet address using `getAddress`

This (beta) API can be used to resolve different formats

```javascript
function getWalletAddress(domain, network, token) {
  resolution
    .getAddress(domain, network, token)
    .then((address) =>
      console.log(
        `Domain ${domain} has address for ${token} on ${network}: ${address}`,
      ),
    )
    .catch(console.error);
}
```

**Resolve single address format (similar to **`addr`** API)**

With `homecakes.crypto` has a `crypto.ETH.address` record set on-chain:

```javascript
getWalletAddress('homecakes.crypto', 'ETH', 'ETH');
// Domain homecakes.crypto has address for ETH on ETH: 0xe7474D07fD2FA286e7e0aa23cd107F8379085037
```

**Resolve multi-chain currency address format (See
[multi-chain currency](https://docs.unstoppabledomains.com/resolution/guides/records-reference/#multi-chain-currencies))**

With `aaron.x` has a `crypto.AAVE.version.ERC20.address` record set to
`0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af`. The `ERC20` indicates it's a token
on `ETH` network:

```javascript
getWalletAddress('aaron.x', 'ETH', 'AAVE');
// Domain aaron.x has address for AAVE on ETH: 0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af
```

**Derive wallet addresses within the same blockchain network and blockchain
family.**

The API can also be used by crypto exchanges to infer wallet addresses. In
centralized exchanges, users have same wallet addresses on different networks
with same wallet family. (See [Blockchain Family, Network, Token Level Addresses](https://apidocs.unstoppabledomains.com/resolution/guides/records-reference/#blockchain-family-network-token-level-addresses) section for the record format)

With `blockchain-family-keys.x` only has `token.EVM.address` record on-chain.
The API resolves to same wallet address for tokens live on EVM compatible
networks.

```javascript
getWalletAddress('blockchain-family-keys.x', 'ETH', 'AAVE');
// Domain blockchain-family-keys.x has address for AAVE on ETH: 0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af

getWalletAddress('blockchain-family-keys.x', 'ETH', 'ETH');
// Domain blockchain-family-keys.x has address for ETH on ETH: 0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af

getWalletAddress('blockchain-family-keys.x', 'AVAX', 'USDT');
// Domain blockchain-family-keys.x has address for USDT on AVAX: 0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af
```

With `uns-devtest-nickshatilo-withdraw-test2.x` only has `token.EVM.ETH.address`
record on chain. The API resolves to the same wallet address for tokens
specifically on Ethereum network.

```javascript
getWalletAddress('uns-devtest-nickshatilo-withdraw-test2.x', 'ETH', 'AAVE');
// Domain blockchain-family-keys.x has address for AAVE on ETH: 0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af

getWalletAddress('uns-devtest-nickshatilo-withdraw-test2.x', 'ETH', 'MATIC');
// Domain blockchain-family-keys.x has address for ETH on ETH: 0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af

getWalletAddress('uns-devtest-nickshatilo-withdraw-test2.x', 'ETH', 'USDT');
// Domain blockchain-family-keys.x has address for USDT on ETH: 0xCD0DAdAb45bAF9a06ce1279D1342EcC3F44845af

getWalletAddress('uns-devtest-nickshatilo-withdraw-test2.x', 'MATIC', 'USDT');
// won't work
```

The API is compatible with other address formats. If a domain has multiple
address formats set, it will follow the algorithm described as follow:

if a domain has following records set:

```
token.EVM.address
crypto.USDC.version.ERC20.address
token.EVM.ETH.USDC.address
crypto.USDC.address
token.EVM.ETH.address
```

`getAddress(domain, 'ETH', 'USDC')` will lookup records in the following order:

```
1. token.EVM.ETH.USDC.address
2. crypto.USDC.address
3. crypto.USDC.version.ERC20.address
4. token.EVM.ETH.address
5. token.EVM.address
```

> **Warning** please use the API with caution as it's still in beta. Please
> submit an issue if you find a bug.

### Command Line Interface

CLI support was removed from the Resolution library starting from version 6.0.
Please use the
[standalone CLI tool](https://github.com/unstoppabledomains/resolution-cli).

## Error Handling

When resolution encounters an error it returns the error code instead of
stopping the process. Keep an eye out for return values like `RECORD_NOT_FOUND`.

## Development

Use these commands to set up a local development environment (**macOS Terminal**
or **Linux shell**).

1. Recommended NodeJs version

- Node v16

2. Clone the repository

   ```bash
   git clone https://github.com/unstoppabledomains/resolution.git
   cd resolution
   ```

3. Install dependencies

   ```bash
   yarn install
   ```

   or

   ```bash
   npm install
   ```

### Internal config

#### To update:

- Network config: `$ yarn network-config:pull`
- Resolver keys: `$ yarn resolver-keys:pull`
- Both configs: `$ yarn config:pull`

#### Unit tests:

Resolution library relies on environment variables to load **TestNet** RPC Urls.
This way, our keys don't expose directly to the code. These environment
variables are:

- L1_TEST_NET_RPC_URL
- L1_TEST_NET_RPC_WSS_URL
- L2_TEST_NET_RPC_URL
- L2_TEST_NET_RPC_WSS_URL

In order to validate the code change, copy `.env.example` file change the name
to `.env`. Then, update the values of variables.

## Free advertising for integrated apps

Once your app has a working Unstoppable Domains integration,
[register it here](https://unstoppabledomains.com/app-submission). Registered
apps appear on the Unstoppable Domains
[homepage](https://unstoppabledomains.com/) and
[Applications](https://unstoppabledomains.com/apps) page — putting your app in
front of tens of thousands of potential customers per day.

Also, every week we select a newly-integrated app to feature in the Unstoppable
Update newsletter. This newsletter is delivered straight into the inbox of
~100,000 crypto fanatics — all of whom could be new customers to grow your
business.

## Get help

[Join our discord community](https://discord.gg/unstoppabledomains) and ask
questions.

## Help us improve

We're always looking for ways to improve how developers use and integrate our
products into their applications. We'd love to hear about your experience to
help us improve by [taking our survey](https://form.typeform.com/to/uHPQyHO6).
