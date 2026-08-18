/**
 * Property-based tests for the Resume Serialiser.
 *
 * Feature: speech-analyzer, Property 19: Resume serialisation round-trip
 * Validates: Requirements 11.2, 11.3
 */

import * as fc from 'fast-check';
import { serialiseResumeData, deserialiseResumeData } from '../services/resumeSerialiser';
import { ResumeData } from '../types';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const experienceArb = fc.record({
  company: fc.string({ minLength: 1, maxLength: 80 }),
  role: fc.string({ minLength: 1, maxLength: 80 }),
  duration: fc.string({ minLength: 1, maxLength: 40 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
});

const projectArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 80 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
  technologies: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
});

const resumeDataArb: fc.Arbitrary<ResumeData> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  phone: fc.string({ minLength: 1, maxLength: 20 }),
  email: fc.string({ minLength: 1, maxLength: 100 }),
  skills: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 20 }),
  experience: fc.array(experienceArb, { maxLength: 5 }),
  projects: fc.array(projectArb, { maxLength: 5 }),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Resume Serialiser – Property 19: serialisation round-trip', () => {
  /**
   * Feature: speech-analyzer, Property 19: Resume serialisation round-trip
   * For any valid ResumeData object, serialising then deserialising should
   * produce an object structurally and value-equivalent to the original.
   * Validates: Requirements 11.2, 11.3
   */
  it('serialise then deserialise returns an equivalent ResumeData object', () => {
    fc.assert(
      fc.property(resumeDataArb, (original) => {
        const serialised = serialiseResumeData(original);
        const restored = deserialiseResumeData(serialised);
        expect(restored).toEqual(original);
      }),
      { numRuns: 100 }
    );
  });

  it('deserialise rejects invalid JSON', () => {
    expect(() => deserialiseResumeData('not-json')).toThrow();
  });

  it('deserialise rejects JSON that does not conform to ResumeData schema', () => {
    // Missing required fields
    expect(() => deserialiseResumeData(JSON.stringify({ name: 'Alice' }))).toThrow();
  });
});
