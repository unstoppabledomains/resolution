import DnsUtils from "./DnsUtils";
import DnsRecordsError from "./errors/dnsRecordsError";
import { CryptoRecords, DnsRecord, DnsRecordType } from "./publicTypes";

let dnsUtils: DnsUtils;
beforeAll(() => {
  dnsUtils = new DnsUtils();
});

describe('DnsUtils', () => {
  it('toClassical', () => {
    const record: CryptoRecords = {
      "dns.ttl": "128",
      "dns.A": '["10.0.0.1","10.0.0.2"]',
      "dns.A.ttl": "90",
      "dns.AAAA": '["10.0.0.120"]'
    };
    const classic: DnsRecord[] = dnsUtils.toList(record);
    expect(classic).toStrictEqual([
      { TTL: 90, data: '10.0.0.1', type: 'A' },
      { TTL: 90, data: '10.0.0.2', type: 'A' },
      { TTL: 128, data: '10.0.0.120', type: 'AAAA' }
    ]);
  });

  it('toCrypto', () => {
    const classicalRecords: DnsRecord[] =[
      { TTL: 90, data: '10.0.0.1', type: 'A' as DnsRecordType },
      { TTL: 90, data: '10.0.0.2', type: 'A' as DnsRecordType },
      { TTL: 128, data: '10.0.0.120', type: 'AAAA' as DnsRecordType }
    ]; 
    const cryptoRecords: CryptoRecords = dnsUtils.toCrypto(classicalRecords);
    expect(cryptoRecords).toStrictEqual({
      'dns.A': "[\"10.0.0.1\",\"10.0.0.2\"]",
      'dns.A.ttl': "90",
      'dns.AAAA': "[\"10.0.0.120\"]",
      'dns.AAAA.ttl': "128"
    });
  });

  it('toCrypto with wrong ttl', () => {
    const classicalRecords: DnsRecord[] = [
      { TTL: 90, data: '10.0.0.20', type: 'A' as DnsRecordType },
      { TTL: 900, data: '10.0.0.20', type: 'A' as DnsRecordType }
    ];
    expect(() => dnsUtils.toCrypto(classicalRecords)).toThrow(DnsRecordsError);
  });
});