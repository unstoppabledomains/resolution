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


[API Referrence](https://unstoppabledomains.github.io/resolution/)
[Documentation](https://docs.unstoppabledomains.com/#tag/Resolution)

You can use Resolution in a `<script>` tag from a
[CDN](https://unpkg.com/browse/@unstoppabledomains/resolution/build/index.js), or as the `Resolution`

# CLI

You should be able to install the library as global dependacy and use the command line tool resolution

Before you have started to use the library please configure it with -C flag.  In order to use the ens or cns resolution you will need to provide either an INFURA project ID or a custom node url via -C.

```
resolution -C infura:12312313....
```

You can find all of the options for resolution cli within -h, --help flag. 

Example:
```
resolution -iers -c eth,btc,DODGE,unknown -d brad.zil
```

When resolution hits an error it returns the error code instead of throwing. So if you see something like RECORD_NOT_FOUND you know exactly that record was not found for this query.
