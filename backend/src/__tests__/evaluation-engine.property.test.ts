/**
 * Property-based tests for the Evaluation Engine.
 *
 * Feature: speech-analyzer, Property 5: Keyword matching grading
 * Feature: speech-analyzer, Property 6: Three-strike termination
 * Validates: Requirements 3.3, 3.5, 5.3, 5.4, 10.2, 10.4, 10.5
 */

import * as fc from 'fast-check';
import { evaluateOralAnswer, shouldTerminateRound } from '../services/evaluationEngine';
import { EvaluationResult } from '../types';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** A non-empty keyword string (no leading/trailing whitespace). */
const keywordArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0 && !s.includes(' '));

const keywordsArb = fc.array(keywordArb, { minLength: 1, maxLength: 10 });

/** Build an answer that contains exactly `n` of the provided keywords. */
function answerContainingN(keywords: string[], n: number): string {
  const chosen = keywords.slice(0, n);
  const rest = keywords.slice(n);
  // Include chosen keywords and exclude the rest by not mentioning them
  return chosen.join(' ') + (rest.length > 0 ? ' filler text here' : '');
}

// ─── Property 5: Keyword matching grading ────────────────────────────────────

describe('Evaluation Engine – Property 5: Keyword matching grading', () => {
  /**
   * Feature: speech-analyzer, Property 5: Keyword matching grading
   * For any oral answer and expected keywords list, the score should be in
   * [0, 100] and the grade should be 'pass' iff score >= 50.
   * Validates: Requirements 3.3, 5.3, 10.2, 10.4, 10.5
   */
  it('score is always in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        keywordsArb,
        (answer, keywords) => {
          const result = evaluateOralAnswer('q1', answer, keywords);
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('grade is pass when score >= 50, poor when score < 50', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        keywordsArb,
        (answer, keywords) => {
          const result = evaluateOralAnswer('q1', answer, keywords);
          if (result.score >= 50) {
            expect(result.grade).toBe('pass');
          } else {
            expect(result.grade).toBe('poor');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('answer containing all keywords scores 100 and passes', () => {
    fc.assert(
      fc.property(
        fc.array(keywordArb, { minLength: 1, maxLength: 8 }),
        (keywords) => {
          const answer = keywords.join(' ');
          const result = evaluateOralAnswer('q1', answer, keywords);
          expect(result.score).toBe(100);
          expect(result.grade).toBe('pass');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('answer containing no keywords scores 0 and is poor', () => {
    fc.assert(
      fc.property(
        fc.array(keywordArb, { minLength: 1, maxLength: 8 }),
        (keywords) => {
          // Answer is completely unrelated
          const result = evaluateOralAnswer('q1', 'zzzzz', keywords);
          expect(result.score).toBe(0);
          expect(result.grade).toBe('poor');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('matchedKeywords length is consistent with the reported score', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        keywordsArb,
        (answer, keywords) => {
          const result = evaluateOralAnswer('q1', answer, keywords);
          const expectedScore =
            (result.matchedKeywords.length / keywords.length) * 100;
          expect(result.score).toBeCloseTo(expectedScore, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 6: Three-strike termination ────────────────────────────────────

/** Build an EvaluationResult with a given grade. */
function makeEval(grade: 'pass' | 'poor'): EvaluationResult {
  return {
    questionId: 'q',
    grade,
    score: grade === 'pass' ? 100 : 0,
    matchedKeywords: [],
    feedback: '',
  };
}

describe('Evaluation Engine – Property 6: Three-strike termination', () => {
  /**
   * Feature: speech-analyzer, Property 6: Three-strike termination
   * For any sequence where the last 3 evaluations are all 'poor', the function
   * returns true. Otherwise it returns false.
   * Validates: Requirements 3.5, 5.4
   */
  it('returns true when the last 3 evaluations are all poor', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<'pass' | 'poor'>('pass', 'poor'), {
          minLength: 0,
          maxLength: 10,
        }),
        (prefix) => {
          const evaluations = [
            ...prefix.map(makeEval),
            makeEval('poor'),
            makeEval('poor'),
            makeEval('poor'),
          ];
          expect(shouldTerminateRound(evaluations)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns false when fewer than 3 evaluations exist', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }).chain((n) =>
          fc.array(
            fc.constantFrom<'pass' | 'poor'>('pass', 'poor'),
            { minLength: n, maxLength: n }
          )
        ),
        (grades) => {
          const evaluations = grades.map(makeEval);
          expect(shouldTerminateRound(evaluations)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns false when the last 3 are not all poor (at least one pass)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<'pass' | 'poor'>('pass', 'poor'), {
          minLength: 0,
          maxLength: 10,
        }),
        fc.integer({ min: 0, max: 2 }),
        (prefix, passPosition) => {
          // Build a tail of 3 where at least one is 'pass'
          const tail: ('pass' | 'poor')[] = ['poor', 'poor', 'poor'];
          tail[passPosition] = 'pass';
          const evaluations = [...prefix.map(makeEval), ...tail.map(makeEval)];
          expect(shouldTerminateRound(evaluations)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
