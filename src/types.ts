export type ResolutionResult = {
  crypto?: { [key: string]: { address: string } };
  ttl?: string;
  [key: string]: any;
};

export interface EnsSourceDefinition {
  url?: string;
  network?: string | number;
}

export type Blockchain =
  | boolean
  | {
      ens?: string | boolean | EnsSourceDefinition;
      zns?: boolean | string;
    };
