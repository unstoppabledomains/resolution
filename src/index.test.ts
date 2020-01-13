import * as Index from '.';

describe('Exported variables', () => {
  it('works', async () => {
    expect(Index.default).toBeDefined();
    expect(Index.Resolution).toBeDefined();
    expect(Index.ResolutionError).toBeDefined();
    expect(Index.ResolutionErrorCode).toBeDefined();
    expect(Index.UnclaimedDomainResponse).toBeDefined();
    expect(Index.NamingServiceName).toBeDefined();
  });
});
