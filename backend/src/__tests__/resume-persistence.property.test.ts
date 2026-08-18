/**
 * Property-based tests for Resume Data Persistence.
 *
 * Feature: speech-analyzer, Property 2: Resume data persistence round-trip
 * Validates: Requirements 2.5
 */

import * as fc from 'fast-check';
import { simulatePersistenceRoundTrip } from '../services/resumePersistence';
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

// ─── Property 2: Resume data persistence round-trip ───────────────────────────

describe('Resume Persistence – Property 2: resume data persistence round-trip', () => {
  /**
   * Feature: speech-analyzer, Property 2: Resume data persistence round-trip
   *
   * For any parsed ResumeData object, storing it to the database and then
   * retrieving it by candidate ID should produce an object equivalent to
   * the original.
   *
   * Validates: Requirements 2.5
   */
  it('storing then retrieving ResumeData produces an equivalent object', () => {
    fc.assert(
      fc.property(resumeDataArb, (original) => {
        const restored = simulatePersistenceRoundTrip(original);
        expect(restored).toEqual(original);
      }),
      { numRuns: 100 }
    );
  });

  it('all required fields are present after the persistence round-trip', () => {
    fc.assert(
      fc.property(resumeDataArb, (original) => {
        const restored = simulatePersistenceRoundTrip(original);

        expect(restored.name).toBeDefined();
        expect(restored.phone).toBeDefined();
        expect(restored.email).toBeDefined();
        expect(Array.isArray(restored.skills)).toBe(true);
        expect(Array.isArray(restored.experience)).toBe(true);
        expect(Array.isArray(restored.projects)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
