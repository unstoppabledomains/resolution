/** @internal */
export type Data = {
  resolver?: string
  owner?: string,
  values?: string[]
};

/** @internal */
export default interface ICnsReader {
  record(tokenId: string, key: string): Promise<Data>;
  resolver(tokenId: string): Promise<Data>;
};
