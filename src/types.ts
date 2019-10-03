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
