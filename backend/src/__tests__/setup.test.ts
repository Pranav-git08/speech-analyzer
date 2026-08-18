import * as fc from 'fast-check';

/**
 * Smoke test: verifies fast-check and Jest are correctly configured.
 * This test does not validate any business logic.
 */
describe('Project setup', () => {
  it('fast-check is available and functional', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return typeof n === 'number';
      }),
      { numRuns: 10 }
    );
  });

  it('TypeScript types are importable', async () => {
    // Dynamically import the types module to confirm it resolves without error
    const types = await import('../types/index');
    expect(types).toBeDefined();
  });
});
