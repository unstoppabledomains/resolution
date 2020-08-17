import nodeFetch from 'node-fetch';

/** @internal */
export default abstract class BaseConnection {
  protected isNode = () => {
    if (typeof process === 'object') {
      if (typeof process.versions === 'object') {
        if (typeof process.versions.node !== 'undefined') {
          return true;
        }
      }
    }
    return false;
  };

  protected async fetch(url, options) {
    return this.isNode() ? nodeFetch(url, options) : window.fetch(url, options);
  }
}
