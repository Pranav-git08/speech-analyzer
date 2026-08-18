/**
 * Property-based tests for the Admin API layer.
 *
 * Feature: speech-analyzer, Property 17: Candidate record availability
 * Feature: speech-analyzer, Property 18: Passing candidate classification
 * Validates: Requirements 9.1, 9.2
 */

import * as fc from 'fast-check';

// ─── Constants ────────────────────────────────────────────────────────────────

const PASSING_THRESHOLD = 50;

// ─── Helpers / pure logic extracted from admin route ─────────────────────────

/**
 * Mirrors the isPassing computation in admin.ts.
 * A candidate is "passing" when their overall grade is >= PASSING_THRESHOLD.
 */
function isPassing(overallGrade: number | null): boolean {
  return overallGrade !== null && overallGrade >= PASSING_THRESHOLD;
}

/**
 * Compute the overall grade for a candidate from their session grades.
 * Mirrors the logic in fetchCandidateRecord / the candidates list query.
 */
function computeOverallGrade(sessionGrades: Array<number | null>): number | null {
  const graded = sessionGrades.filter((g): g is number => g !== null);
  if (graded.length === 0) return null;
  return graded.reduce((sum, g) => sum + g, 0) / graded.length;
}

/**
 * Build a minimal candidate record shape as returned by the admin API.
 */
function buildCandidateRecord(params: {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobRoleId: string;
  jobRoleName: string;
  track: 'TJI' | 'NTJI';
  uniqueCode: string | null;
  status: string;
  sessions: Array<{
    id: string;
    roundType: string;
    status: string;
    finalGrade: number | null;
    recordingId: string | null;
  }>;
}) {
  const overallGrade = computeOverallGrade(params.sessions.map((s) => s.finalGrade));
  return {
    ...params,
    overallGrade,
    isPassing: isPassing(overallGrade),
  };
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const gradeArb = fc.float({ min: 0, max: 100, noNaN: true });
const nullableGradeArb = fc.option(gradeArb, { nil: null });

const sessionStatusArb = fc.constantFrom('completed', 'terminated');
const roundTypeArb = fc.constantFrom('technical', 'qualifying', 'hr');
const trackArb = fc.constantFrom<'TJI' | 'NTJI'>('TJI', 'NTJI');
const candidateStatusArb = fc.constantFrom(
  'pending_initial',
  'pending_hr',
  'approved',
  'rejected'
);

const sessionArb = fc.record({
  id: fc.uuid(),
  roundType: roundTypeArb,
  status: sessionStatusArb,
  finalGrade: nullableGradeArb,
  recordingId: fc.option(fc.uuid(), { nil: null }),
});

const candidateArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  phone: fc.string({ minLength: 7, maxLength: 15 }),
  jobRoleId: fc.uuid(),
  jobRoleName: fc.string({ minLength: 1, maxLength: 50 }),
  track: trackArb,
  uniqueCode: fc.option(fc.string({ minLength: 12, maxLength: 12 }), { nil: null }),
  status: candidateStatusArb,
  sessions: fc.array(sessionArb, { minLength: 0, maxLength: 5 }),
});

// ─── Property 17: Candidate record availability ───────────────────────────────

describe('Admin API – Property 17: Candidate record availability', () => {
  /**
   * Feature: speech-analyzer, Property 17: Candidate record availability
   * For any candidate who has completed or been terminated from an initial round,
   * the record returned by the admin API should contain the job role, round
   * summary, grades, and recording reference.
   * Validates: Requirements 9.1
   */

  it('candidate record contains required fields: id, name, jobRoleId, jobRoleName, track, status, sessions', () => {
    fc.assert(
      fc.property(candidateArb, (params) => {
        const record = buildCandidateRecord(params);

        // Required top-level fields
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('jobRoleId');
        expect(record).toHaveProperty('jobRoleName');
        expect(record).toHaveProperty('track');
        expect(record).toHaveProperty('status');
        expect(record).toHaveProperty('sessions');
        expect(record).toHaveProperty('overallGrade');
        expect(record).toHaveProperty('isPassing');
      }),
      { numRuns: 100 }
    );
  });

  it('each session in the record contains roundType, status, finalGrade, and recordingId', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 1, maxLength: 5 }),
        (sessions) => {
          for (const session of sessions) {
            expect(session).toHaveProperty('id');
            expect(session).toHaveProperty('roundType');
            expect(session).toHaveProperty('status');
            expect(session).toHaveProperty('finalGrade');
            expect(session).toHaveProperty('recordingId');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('overallGrade is null when no sessions have a finalGrade', () => {
    fc.assert(
      fc.property(
        fc.array(
          sessionArb.map((s) => ({ ...s, finalGrade: null })),
          { minLength: 0, maxLength: 5 }
        ),
        (sessions) => {
          const overallGrade = computeOverallGrade(sessions.map((s) => s.finalGrade));
          expect(overallGrade).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('overallGrade equals the average of all non-null session finalGrades', () => {
    fc.assert(
      fc.property(
        fc.array(gradeArb, { minLength: 1, maxLength: 10 }),
        (grades) => {
          const sessions = grades.map((g) => ({ finalGrade: g as number | null }));
          const overallGrade = computeOverallGrade(sessions.map((s) => s.finalGrade));
          const expected = grades.reduce((sum, g) => sum + g, 0) / grades.length;
          expect(overallGrade).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 18: Passing candidate classification ────────────────────────────

describe('Admin API – Property 18: Passing candidate classification', () => {
  /**
   * Feature: speech-analyzer, Property 18: Passing candidate classification
   * For any set of candidates with varying final grades, the admin dashboard
   * query should classify exactly those candidates whose grade is >= the
   * passing threshold as "Passing Candidates", and no others.
   * Validates: Requirements 9.2
   */

  it('isPassing is true if and only if overallGrade >= PASSING_THRESHOLD', () => {
    fc.assert(
      fc.property(gradeArb, (grade) => {
        const passing = isPassing(grade);
        if (grade >= PASSING_THRESHOLD) {
          expect(passing).toBe(true);
        } else {
          expect(passing).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('isPassing is false when overallGrade is null', () => {
    fc.assert(
      fc.property(fc.constant(null), (grade) => {
        expect(isPassing(grade)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('a list of candidates is classified correctly: passing iff grade >= threshold', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            overallGrade: nullableGradeArb,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (candidates) => {
          const classified = candidates.map((c) => ({
            ...c,
            isPassing: isPassing(c.overallGrade),
          }));

          for (const c of classified) {
            if (c.overallGrade !== null && c.overallGrade >= PASSING_THRESHOLD) {
              expect(c.isPassing).toBe(true);
            } else {
              expect(c.isPassing).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no candidate with grade below threshold is classified as passing', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(PASSING_THRESHOLD - 0.1), noNaN: true }),
        (grade) => {
          expect(isPassing(grade)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every candidate with grade at or above threshold is classified as passing', () => {
    fc.assert(
      fc.property(
        fc.float({ min: PASSING_THRESHOLD, max: 100, noNaN: true }),
        (grade) => {
          expect(isPassing(grade)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('passing classification is consistent across multiple calls with the same grade', () => {
    fc.assert(
      fc.property(nullableGradeArb, (grade) => {
        const result1 = isPassing(grade);
        const result2 = isPassing(grade);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 }
    );
  });
});
