import type {BlockchainType} from '../types/publicTypes';
import Networking from './Networking';

type TldsMeta = Record<
  string,
  {
    namingService: 'UNS' | 'ENS' | 'ZNS' | 'DNS';
    registrationBlockchain: BlockchainType;
  }
>;

export default class Tlds {
  private static supportedTlds: string[];
  private static tldsMeta: TldsMeta;

  private static async loadSupportedTldsData() {
    try {
      const res = await Networking.fetch(
        'https://api.unstoppabledomains.com/resolve/supported_tlds',
      );
      const data: {tlds: string[]; meta: TldsMeta} = await res.json();
      Tlds.supportedTlds = data.tlds;
      Tlds.tldsMeta = data.meta;
    } catch (error) {
      throw new Error(`Failed to load supported TLDs data: ${error}`);
    }
  }

  public static async getSupportedTlds(): Promise<ReadonlyArray<string>> {
    if (!Tlds.supportedTlds) {
      await Tlds.loadSupportedTldsData();
    }
    return Tlds.supportedTlds;
  }

  public static async getTldsMeta(): Promise<Readonly<TldsMeta>> {
    if (!Tlds.tldsMeta) {
      await Tlds.loadSupportedTldsData();
    }
    return Tlds.tldsMeta;
  }
}
