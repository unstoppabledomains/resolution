# 🦄 Namicorn

[![npm version](https://badge.fury.io/js/namicorn.svg)](https://badge.fury.io/js/namicorn)
[![](https://img.shields.io/github/license/mashape/apistatus.svg)](./LICENSE)

A library for interacting with blockchain domain names.

## Installation

You can use Namicorn in a `<script>` tag from a
[CDN](https://unpkg.com/namicorn/build/index.browser.js), or as the `namicorn`
package on the [npm](https://www.npmjs.com/package/namicorn) registry.

<!-- Namicorn uses multiple blockchains and projects, look here for the
[list of project integrations](./INTEGRATIONS.md). -->

## Example

```javascript
import Namicorn from 'namicorn'

const namicorn = new Namicorn()

namicorn.use(
  namicorn.middleware.ens({ url: 'http:localhost:8545' }),
  namicorn.middleware.zns({ url: 'http:localhost:40013' }),
)

namicorn
  .resolve(namicorn.util.normalize('🦄.zil'), {
    filter: { onlyLdh: true },
    data: { ttl: true },
  })
  .then(nameData => {
    console.log(nameData)
  })
  .catch(() => {
    console.error('failed to perform lookup')
  })
```

## Contributing

<!-- If you want to contribute to Namicorn you can create an issue or you can take a
look at our [development guide](./DEVELOPMENT.md). -->

Feel free to reach out directly to myself braden@buyethdomains.com or the team
contact@buyethdomains.com.

We will have a development guide.

### License

Namicorn is [MIT licensed](./LICENSE).
