const labelDomain = "label.crypto";
import Namicorn, { ResolutionError, ResolutionErrorCode } from '.';
import { Dictionary } from './types';

const mockAsyncMethod = (object: any, method: string, value) => {
  if (!process.env.LIVE)
    return jest.spyOn(object, method).mockResolvedValue(value);
  else return jest.spyOn(object, method);
};

const mockAsyncMethods = (object: any, methods: Dictionary<any>) => {
  return Object.entries(methods).map(method =>
    mockAsyncMethod(object, method[0], method[1]),
  );
};

beforeEach(() => {
  jest.restoreAllMocks();
});


describe("CNS", () => {

  it('should define the default cns contract', () => {
    const namicorn = new Namicorn();
    expect(namicorn.cns).toBeDefined();
  });

  it('checks the ipfs record', async () => {
    const namicorn = new Namicorn();
    // TODO: Create something to get ipfs from cns!
    expect(false).toBeTruthy();
  });

  it('checks the ipfs redirect_domain record', async () => {
    const namicorn = new Namicorn();
    // TODO: Create something to get ipfs from cns!
    expect(false).toBeTruthy();
  });

  it(`checks the BCH address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const addr = await namicorn.cns.address(labelDomain, 'BCH');
    console.log({addr});
    
    expect(addr).toBe('qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6');
  });

  it(`checks the BTC address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const addr = await namicorn.cns.address(labelDomain, 'BTC');
    expect(addr).toBe('1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB');
  });

  it(`checks the DASH address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const addr = await namicorn.cns.address(labelDomain, 'DASH');
    expect(addr).toBe('XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j');
  });

  it(`checks the ETH address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const addr = await namicorn.cns.address(labelDomain, 'ETH');
    expect(addr).toBe('0x45b31e01AA6f42F0549aD482BE81635ED3149abb');
  });

  it(`checks the LTC address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const addr = await namicorn.cns.address(labelDomain, 'LTC');
    expect(addr).toBe('LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL');
  });

  it(`checks the XMR address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const addr = await namicorn.cns.address(labelDomain, 'XMR');
    expect(addr).toBe('447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d');
  });

  it(`checks the ZEC address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const addr = await namicorn.cns.address(labelDomain, 'ZEC');
    expect(addr).toBe('t1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV');
  });

  it(`checks the ZIL address on ${labelDomain}`, async () => {
    const namicorn = new Namicorn();
    const addr = await namicorn.cns.address(labelDomain, 'ZIL');
    expect(addr).toBe('zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj');
  });

})