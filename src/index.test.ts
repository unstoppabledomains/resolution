import * as Index from '.';

describe('Exported variables', () => {
  it('works', async () => {
    expect(Index.default).toBeDefined();
    expect(Index.Namicorn).toBeDefined();
    expect(Index.ResolutionError).toBeDefined();
    expect(Index.ResolutionErrorCode).toBeDefined();
    expect(Index.UnclaimedDomainResponse).toBeDefined();
  });
});
