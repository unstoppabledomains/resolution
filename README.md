# Resolution

[![NPM version](https://img.shields.io/npm/v/@unstoppabledomains/resolution.svg?style=flat)](https://www.npmjs.com/package/@unstoppabledomains/resolution)
[![CircleCI](https://circleci.com/gh/unstoppabledomains/resolution.svg?style=shield)](https://circleci.com/gh/unstoppabledomains/resolution)
[![Bundle Size Minified](https://img.shields.io/bundlephobia/min/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)
[![Bundle Size Minified Zipped](https://img.shields.io/bundlephobia/minzip/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)


A library for interacting with blockchain domain names.

Supported domain zones:

- .crypto 
- .zil
- .eth
- .kred
- .xyz
- .luxe


[API Referrence](https://unstoppabledomains.github.io/resolution/)

You can use Resolution in a `<script>` tag from a
[CDN](https://unpkg.com/browse/@unstoppabledomains/resolution/build/index.js), or as the `Resolution`

# CLI


You can install CLI by installing this package as a global. 

```
yarn global add @unstoppabledomains/resolution
```

```
npm install -g @unstoppabledomains/resolution
```
---

It should install binary named resolution in the default folder for your package manager. You can check it by running 

```
resolution -V
```
command. If everything is fine you will see the version installed.

---
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

## Note

When resolution hits an error it returns the error code instead of throwing. So if you see something like RECORD_NOT_FOUND you know exactly that record was not found for this query.

# Contributor guide

Paste that in a macOS Terminal or Linux shell prompt.
--

1) Install NVM

```bash
 curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
```

2) Install concrete version of node.js

```bash
 nvm install 12.12.0
```

3) Install ```yarn```

```bash
 npm install -g yarn
```

4) Download dependencies 

```bash
yarn install
```
