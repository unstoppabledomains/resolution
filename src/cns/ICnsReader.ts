
export type Data = {
  resolver?: string;
  owner?: string;
  values?: string[];
};


export default interface ICnsReader {
  records(tokenId: string, keys: string[]): Promise<Data>;
  resolver(tokenId: string): Promise<Data>;
}
