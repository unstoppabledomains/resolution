import nodeFetch from 'node-fetch';

export default abstract class BaseConnection {
  /** @internal */
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

  protected isBrowser = new Function("try {return this===window;}catch(e){ return false;}");

  /** @internal */
  protected async fetch(url, options) {
    return this.isBrowser() ? window.fetch(url, options) : nodeFetch(url, options);
  }
}
