import { DnsRecord } from "./publicTypes";

export default class DnsUtils {
  private DnsUtils() {}

  public static toClassical(record: Record<string, string>): DnsRecord[] {
    return []
  }

  public static toCrypto(records: DnsRecord[]): Record<string, string> {
    return {}
  }
}
