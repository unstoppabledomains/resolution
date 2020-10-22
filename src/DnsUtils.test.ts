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
        'dns.ttl': 128,
        'dns.A': [ '10.0.0.1', '10.0.0.2' ],
        'dns.A.ttl': 90,
        'dns.AAAA': [ '10.0.0.120' ],
        'dns.AAAA.ttl': undefined    
    };
    const classic: DnsRecord[] = dnsUtils.toClassical(record);
    expect(classic).toStrictEqual([
      { ttl: 90, value: '10.0.0.1', type: 'A' },
      { ttl: 90, value: '10.0.0.2', type: 'A' },
      { ttl: 128, value: '10.0.0.120', type: 'AAAA' }
    ]);
  });

  it('toCrypto', () => {
    const classicalRecords: DnsRecord[] =[
      { ttl: 90, value: '10.0.0.1', type: 'A' as DnsRecordType },
      { ttl: 90, value: '10.0.0.2', type: 'A' as DnsRecordType },
      { ttl: 128, value: '10.0.0.120', type: 'AAAA' as DnsRecordType }
    ]; 
    const cryptoRecords: CryptoRecords = dnsUtils.toCrypto(classicalRecords);
      expect(cryptoRecords).toStrictEqual({
        'dns.A': [ '10.0.0.1', '10.0.0.2' ],
        'dns.A.ttl': 90,
        'dns.AAAA': [ '10.0.0.120' ],
        'dns.AAAA.ttl': 128    
    });
  });

  it('toCrypto with wrong ttl', () => {
    const classicalRecords: DnsRecord[] = [
      { ttl: 90, value: '10.0.0.20', type: 'A' as DnsRecordType },
      { ttl: 900, value: '10.0.0.20', type: 'A' as DnsRecordType }
    ];
    expect(() => dnsUtils.toCrypto(classicalRecords)).toThrow(DnsRecordsError);
  });
});