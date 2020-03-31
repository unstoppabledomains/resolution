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
[Documentation](https://docs.unstoppabledomains.com/#tag/npm_library)

You can use Resolution in a `<script>` tag from a
[CDN](https://unpkg.com/browse/@unstoppabledomains/resolution/build/index.js), or as the `Resolution`

# CLI

Once you have cloned the repo use yarn build to install all of the dependacies and cli tool. It will create a symlink into /usr/local/bin/resolution and set up the permissions to run the file as executable. 

Before you have started to use the CLI please configure it with -C flag.  In order to use the ens or cns resolution you will need to provide either an INFURA project ID or a custom node url via -C.

```
resolution -C infura:12312313....
or 
resolution -C url:https://...
```

You can find all of the options for resolution cli within -h, --help flag. 

Example:
```
resolution -mc eth,btc,DODGE,unknown -d brad.zil
```

## Note

When resolution hits an error it returns the error code instead of throwing. So if you see something like RECORD_NOT_FOUND you know exactly that record was not found for this query.
