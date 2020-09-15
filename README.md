# Resolution

[![NPM version](https://img.shields.io/npm/v/@unstoppabledomains/resolution.svg?style=flat)](https://www.npmjs.com/package/@unstoppabledomains/resolution)
[![CircleCI](https://circleci.com/gh/unstoppabledomains/resolution.svg?style=shield)](https://circleci.com/gh/unstoppabledomains/resolution)
[![Bundle Size Minified](https://img.shields.io/bundlephobia/min/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)
[![Bundle Size Minified Zipped](https://img.shields.io/bundlephobia/minzip/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)
[![Chat on Telegram](https://img.shields.io/badge/Chat%20on-Telegram-brightgreen.svg)](https://t.me/unstoppabledev)

A library for interacting with blockchain domain names.

Supported domain zones:

* CNS
  - .crypto 
* ZNS
  - .zil
* ENS
  - .eth
  - .kred
  - .xyz
  - .luxe

[API Referrence](https://unstoppabledomains.github.io/resolution/)

## Installation

Use the `npm` or `yarn` to install resolution.

```
yarn global add @unstoppabledomains/resolution
```

```
npm install -g @unstoppabledomains/resolution
```

It should install binary named resolution in the default folder for your package manager. You can check it by running command `resolution -V` in command line. If everything is fine you will see the version installed.

## Usage

Create a new project.

```shell
mkdir test-out-resolution && cd $_
yarn init -y
yarn add @unstoppabledomains/resolution
```

Make a file, `script.js`.

```javascript
const {default: Resolution} = require('@unstoppabledomains/resolution')
const resolution = new Resolution()
function resolve(domain, currency) {
  resolution.address(domain, currency)
    .then(address => console.log(domain, 'resolves to', address))
    .catch(console.error)
}
resolve('resolver.eth', "ETH")
resolve('brad.zil', "ZIL")
```

Execute the script.

```
node script.js
# brad.zil  resolves to zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj
# resolver.eth resolves to 0xD3ddcCDD3b25A8a7423B5bEe360a42146eb4Baf3
```

### How to resolve

Resolution library provides a way to resolve a domain name using a direct blockchain call.
For this purpose there are two main methods to look for: ** Resolution.resolve ** and ** Resolution.address **

#### Resolution#resolve

This method accept the domain name and returns following object or null in case of error
```javascript
  {
    addresses: {}, // if domain will resolve to anything it will be here
    meta: {
      owner: null, // this means the domain is avalable for purchase
      ttl: 0,
    },
  }
```

#### Resolution#address

This method accepts two arguments:
 - domain name
 - currency ticker in which address you are interested like ( BTC, ETH, ZIL )
 
It returns you the address if such exists or simply null if such address wasn't found.
Beside the resolution there are also methods to test whether the domain is in valid format or supported by the network

#### Resolution#isSupportedDomain

Accepts domain name and returns boolean if such domain is supported by ens, .crypto, or .zil

#### Resolution#isSupportedDomainInNetwork

Accepts the domain name and tests it against the current blockchain network specified in constructor of Resolution.
It will also check if the domain is in valid format

### CLI

Once you have installed the CLI you can go ahead and use it without any extra configuration. By default the cli is
using https://main-rpc.linkpool.io service as a gateway to blockchain. If you want to change it to some other providers
including your own you can do so by utilizing resolution -C flag.

As an argument to -C type the following structure url:< https://.... >

Example of usage
```
resolution -C url:https://...
```

You can find all of the options for resolution cli within -h, --help flag. 

Example:
```
resolution -mc eth,btc,DODGE,unknown -d brad.zil
```

### JavaScript/NodeJs

Install dependency
```
npm install @unstoppabledomains/resolution --save
```

Example:
```
const { Resolution } = require('@unstoppabledomains/resolution');

const resolution = new Resolution();
resolution.addr('resolver.crypto', "ETH")
    .then(console.log)
    .catch(console.error);
```

## Note

When resolution hits an error it returns the error code instead of throwing. So if you see something like RECORD_NOT_FOUND you know exactly that record was not found for this query.

## Development

Use next commands for setting up development environment. (**macOS Terminal** or **Linux shell**).

1. Install NVM
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
    ```

2. Install concrete version of node.js
    ```bash
    nvm install 12.12.0
    ```

3. Install ```yarn```
    ```bash
    npm install -g yarn
    ```
4. Clone repo
    ```
    git clone https://github.com/unstoppabledomains/resolution.git
    cd resolution
    ```

5. Install dependencies 
    ```bash
    yarn install
    ```
