import DnsRecordsError, { DnsRecordsErrorCode } from "./errors/dnsRecordsError";
import { CryptoRecords, DnsRecord, DnsRecordType } from "./publicTypes";
import { isStringArray } from "./utils";

export default class DnsUtils {

  public toClassical(record: CryptoRecords): DnsRecord[] {
    const dnsTypes = this.getAllDnsTypes(record);
    return ([] as DnsRecord[]).concat(
      ...dnsTypes.map(type => this.constructDnsRecords(record, type))
    );
  }

  public toCrypto(records: DnsRecord[]): CryptoRecords {
    const cryptoRecords:CryptoRecords = {};
    for (const record of records) {
      const { ttl, type, value } = record;
      
      const dnsRecord = cryptoRecords[`dns.${type}`];
      const ttlInRecord = cryptoRecords[`dns.${type}.ttl`] as number | undefined;

      if (isStringArray(dnsRecord)) {
        dnsRecord.push(value);
      } else {
        cryptoRecords[`dns.${type}`] = [value];
      }

      if (!!ttlInRecord && ttlInRecord !== ttl) {
        throw new DnsRecordsError(DnsRecordsErrorCode.NotCommonTtl, {recordType: type});
      } 
      cryptoRecords[`dns.${type}.ttl`] = ttl;
    }
    return cryptoRecords;
  }

  private getAllDnsTypes(records: CryptoRecords): DnsRecordType[] {
    const keys = new Set<DnsRecordType>();
    Object.keys(records).forEach(key => {
      const chunks = key.split('.');
      const type = chunks[1] && chunks[1] !== 'ttl';
      if (type) {
        keys.add(DnsRecordType[chunks[1]]);
      }
    });
    return Array.from(keys);
  }

  private constructDnsRecords(data: CryptoRecords, type: DnsRecordType ): DnsRecord[] {
    const ttl = !!data[`dns.${type}.ttl`] ? Number(data[`dns.${type}.ttl`]) : Number(data['dns.ttl']);
    const jsonValueString = data[`dns.${type}`];
    if (!jsonValueString) return [];
    const typeData = JSON.parse(jsonValueString);
    if (!isStringArray(typeData)) {
      return [];
    }
    return typeData.map(value => ({ttl, value, type}));
  }

  private parseTtl(data: CryptoRecords, type: DnsRecordType): number {
    const defaultTtl = data['dns.ttl'];
    const recordTtl = data[`dns.${type}.ttl`];
    if (recordTtl) {
      return parseInt(recordTtl, 10);
    }
    return parseInt(defaultTtl || "", 10);
  }
}
