import DnsRecordsError, { DnsRecordsErrorCode } from "./errors/dnsRecordsError";
import { CryptoRecords, DnsRecord, DnsRecordType } from "./publicTypes";
import { isStringArray } from "./utils";
export default class DnsUtils {

  public toList(record: CryptoRecords): DnsRecord[] {
    const dnsTypes = this.getAllDnsTypes(record);
    return ([] as DnsRecord[]).concat(
      ...dnsTypes.map(type => this.constructDnsRecords(record, type))
    );
  }

  public toCrypto(records: DnsRecord[]): CryptoRecords {
    const cryptoRecords:CryptoRecords = {};
    for (const record of records) {
      const {type, ttl, value} = record;
      const ttlInRecord = this.getJsonNumber(cryptoRecords[`dns.${type}.ttl`]);
      const dnsInRecord = this.getJsonArray(cryptoRecords[`dns.${type}`]);
      if (dnsInRecord) {
        dnsInRecord.push(value);
        cryptoRecords[`dns.${type}`] = JSON.stringify(dnsInRecord);
      } else {
        cryptoRecords[`dns.${type}`] = JSON.stringify([value]);
        cryptoRecords[`dns.${type}.ttl`] = ttl.toString(10);
      }

      if (!!ttlInRecord && ttlInRecord !== ttl) {
        throw new DnsRecordsError(DnsRecordsErrorCode.InconsistentTtl, {recordType: type});
      }
    }
    return cryptoRecords;
  }

  private getJsonArray(rawRecord: string | undefined): string[] | undefined {
    return rawRecord ? JSON.parse(rawRecord) : undefined;
  }

  private getJsonNumber(rawRecord: string | undefined): number | undefined {
    return rawRecord ? parseInt(rawRecord, 10) : undefined;
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
    const ttl = this.parseTtl(data, type);
    const jsonValueString = data[`dns.${type}`];
    if (!jsonValueString) {
      return [];
    }
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
    if (defaultTtl) {
      return parseInt(defaultTtl, 10);
    }
    throw new DnsRecordsError(DnsRecordsErrorCode.NoTtlFound);
  }
}
