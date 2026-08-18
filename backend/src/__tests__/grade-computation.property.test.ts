/**
 * Property-based tests for Grade Computation.
 *
 * Feature: speech-analyzer, Property 15: Confidence score inclusion in grade
 * Feature: speech-analyzer, Property 11: Final grade computation bounds
 * Validates: Requirements 7.5, 6.4
 */

import * as fc from 'fast-check';
import {
  computeRoundGrade,
  computeFinalGrade,
  CONFIDENCE_WEIGHT,
  ANSWER_WEIGHT,
} from '../services/gradeComputation';
import { EvaluationResult } from '../types';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** A score in [0, 100]. */
const scoreArb = fc.float({ min: 0, max: 100, noNaN: true });

/** Build a minimal EvaluationResult with a given score. */
function makeEval(score: number): EvaluationResult {
  return {
    questionId: 'q',
    grade: score >= 50 ? 'pass' : 'poor',
    score,
    matchedKeywords: [],
    feedback: '',
  };
}

/** A non-empty array of EvaluationResults with scores in [0, 100]. */
const evaluationsArb = fc.array(scoreArb, { minLength: 1, maxLength: 10 }).map(
  (scores) => scores.map(makeEval)
);

// ─── Property 15: Confidence score inclusion in grade ────────────────────────

describe('Grade Computation – Property 15: Confidence score inclusion in grade', () => {
  /**
   * Feature: speech-analyzer, Property 15: Confidence score inclusion in grade
   * For any completed round that includes confidence analysis, the round's
   * overall grade should differ from a grade computed without confidence
   * analysis, confirming the confidence score has a non-zero weight.
   * Validates: Requirements 7.5
   */

  it('grade with confidence differs from grade without when confidence score differs from average answer score', () => {
    fc.assert(
      fc.property(
        evaluationsArb,
        scoreArb,
        (evaluations, confidenceScore) => {
          const avgAnswerScore =
            evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length;

          const gradeWithConfidence = computeRoundGrade(evaluations, confidenceScore);
          const gradeWithoutConfidence = computeRoundGrade(evaluations);

          // The grade difference is scaled by CONFIDENCE_WEIGHT (0.2).
          // Use a tolerance of 0.01 to avoid floating-point noise.
          const expectedDiff =
            Math.abs(confidenceScore - avgAnswerScore) * CONFIDENCE_WEIGHT;

          if (expectedDiff > 0.01) {
            expect(Math.abs(gradeWithConfidence - gradeWithoutConfidence)).toBeGreaterThan(0.001);
          } else {
            // Difference is negligible — grades should be approximately equal
            expect(gradeWithConfidence).toBeCloseTo(gradeWithoutConfidence, 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('grade with confidence uses the correct weighted formula', () => {
    fc.assert(
      fc.property(
        evaluationsArb,
        scoreArb,
        (evaluations, confidenceScore) => {
          const avgAnswerScore =
            evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length;

          const expected = Math.min(
            100,
            Math.max(0, avgAnswerScore * ANSWER_WEIGHT + confidenceScore * CONFIDENCE_WEIGHT)
          );

          const actual = computeRoundGrade(evaluations, confidenceScore);
          expect(actual).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round grade is always in [0, 100] with or without confidence score', () => {
    fc.assert(
      fc.property(
        evaluationsArb,
        fc.option(scoreArb, { nil: undefined }),
        (evaluations, confidenceScore) => {
          const grade = computeRoundGrade(evaluations, confidenceScore);
          expect(grade).toBeGreaterThanOrEqual(0);
          expect(grade).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 11: Final grade computation bounds ──────────────────────────────

describe('Grade Computation – Property 11: Final grade computation bounds', () => {
  /**
   * Feature: speech-analyzer, Property 11: Final grade computation bounds
   * For any initial round grade and HR round grade, both in [0, 100], the
   * computed final grade should also be in [0, 100] and should be deterministic
   * (same inputs always produce the same output).
   * Validates: Requirements 6.4
   */

  it('final grade is always in [0, 100]', () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, (initialGrade, hrGrade) => {
        const finalGrade = computeFinalGrade(initialGrade, hrGrade);
        expect(finalGrade).toBeGreaterThanOrEqual(0);
        expect(finalGrade).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });

  it('final grade is deterministic — same inputs always produce the same output', () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, (initialGrade, hrGrade) => {
        const grade1 = computeFinalGrade(initialGrade, hrGrade);
        const grade2 = computeFinalGrade(initialGrade, hrGrade);
        expect(grade1).toBe(grade2);
      }),
      { numRuns: 100 }
    );
  });

  it('final grade equals the average of the two input grades when both are in [0, 100]', () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, (initialGrade, hrGrade) => {
        const expected = (initialGrade + hrGrade) / 2;
        const actual = computeFinalGrade(initialGrade, hrGrade);
        expect(actual).toBeCloseTo(expected, 5);
      }),
      { numRuns: 100 }
    );
  });
});
