export type ResolutionResult = {
  crypto?: { [key: string]: { address: string } };
  ttl?: string;
  [key: string]: any;
};

export interface SourceDefinition {
  url?: string;
  network?: string | number;
}

export type Blockchain =
  | boolean
  | {
      ens?: string | boolean | SourceDefinition;
      zns?: string | boolean | SourceDefinition;
    };
