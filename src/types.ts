export type ResolutionResult = {
  crypto?: { [key: string]: { address: string } };
  ttl?: string;
  [key: string]: any;
};

/**
 * SourceDefinition object
 * @typedef {Object} SourceDefinition
 * @property {string} [url] - main blockchain api url
 * @property {string | number} [network] - blockchain network
 */

export interface SourceDefinition {
  url?: string;
  network?: string | number;
}

/**
 * NamicornResulution
 * @typedef {Object} NamicornResolution
 * @property {Object} addresses - resolution addresses for various currency addresses attached to the domain
 * @property {Object} meta - meta information about the owner of the domain 
 */

export type NamicornResolution = {
    addresses: {
      [key: string]: string
    },
    meta: {
      owner: string, //available domain
      ttl: number,
    },
  }

export type NetworkIdMap = {
  [key: number]: string;
};

export type DefaultSource = {
  url: string;
  networkIdMap: NetworkIdMap;
  registryMap: NetworkIdMap;
  defaultNetwork: string;
};

export type Blockchain =
  | boolean
  | {
      ens?: string | boolean | SourceDefinition;
      zns?: string | boolean | SourceDefinition;
    };
