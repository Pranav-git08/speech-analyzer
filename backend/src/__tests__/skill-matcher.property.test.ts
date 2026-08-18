/**
 * Property-based tests for the Skill Matcher.
 *
 * Feature: speech-analyzer, Property 1: Skill eligibility correctness
 * Validates: Requirements 2.3, 2.4
 */

import * as fc from 'fast-check';
import { matchSkills } from '../services/skillMatcher';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** A non-empty skill string (no leading/trailing whitespace in the core value). */
const skillArb = fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0);

const skillsArrayArb = fc.array(skillArb, { minLength: 0, maxLength: 15 });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Skill Matcher – Property 1: Skill eligibility correctness', () => {
  /**
   * Feature: speech-analyzer, Property 1: Skill eligibility correctness
   * For any candidate skills list and required skills list, isEligible should
   * be true if and only if the normalised intersection is non-empty.
   * Validates: Requirements 2.3, 2.4
   */
  it('isEligible is true iff the normalised intersection is non-empty', () => {
    fc.assert(
      fc.property(skillsArrayArb, skillsArrayArb, (candidateSkills, requiredSkills) => {
        const result = matchSkills(candidateSkills, requiredSkills);

        const normCandidate = new Set(candidateSkills.map((s) => s.toLowerCase().trim()));
        const normRequired = new Set(requiredSkills.map((s) => s.toLowerCase().trim()));
        const hasIntersection = [...normCandidate].some((s) => normRequired.has(s));

        expect(result.isEligible).toBe(hasIntersection);
      }),
      { numRuns: 100 }
    );
  });

  it('matched contains only skills present in both lists (normalised)', () => {
    fc.assert(
      fc.property(skillsArrayArb, skillsArrayArb, (candidateSkills, requiredSkills) => {
        const result = matchSkills(candidateSkills, requiredSkills);

        const normRequired = new Set(requiredSkills.map((s) => s.toLowerCase().trim()));
        for (const skill of result.matched) {
          expect(normRequired.has(skill)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('when candidate has no skills, isEligible is false', () => {
    fc.assert(
      fc.property(skillsArrayArb, (requiredSkills) => {
        const result = matchSkills([], requiredSkills);
        expect(result.isEligible).toBe(false);
        expect(result.matched).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('when required skills list is empty, isEligible is false', () => {
    fc.assert(
      fc.property(skillsArrayArb, (candidateSkills) => {
        const result = matchSkills(candidateSkills, []);
        expect(result.isEligible).toBe(false);
        expect(result.matched).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});
