# Resolution

[![NPM version](https://img.shields.io/npm/v/@unstoppabledomains/resolution.svg?style=flat)](https://www.npmjs.com/package/@unstoppabledomains/resolution)
[![CircleCI](https://circleci.com/gh/unstoppabledomains/resolution.svg?style=shield)](https://circleci.com/gh/unstoppabledomains/resolution)
[![Bundle Size Minified](https://img.shields.io/bundlephobia/min/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)
[![Bundle Size Minified Zipped](https://img.shields.io/bundlephobia/minzip/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)


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

# Installation
Use the `npm` or `yarn` to install resolution.

```
yarn global add @unstoppabledomains/resolution
```

```
npm install -g @unstoppabledomains/resolution
```

It should install binary named resolution in the default folder for your package manager. You can check it by running command `resolution -V` in command line. If everything is fine you will see the version installed.

# Usage

## CLI

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
resolution.address('resolver.crypto', "ETH")
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
