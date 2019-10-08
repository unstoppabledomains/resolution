export type ResolutionResult = {
  crypto?: { [key: string]: { address: string } };
  ttl?: string;
  [key: string]: any;
};

export interface SourceDefinition {
  url?: string;
  network?: string | number;
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

export enum NameService {
  zns = 0,
  ens = 1,
}

export type Blockchain =
  | boolean
  | {
      ens?: string | boolean | SourceDefinition;
      zns?: string | boolean | SourceDefinition;
    };
