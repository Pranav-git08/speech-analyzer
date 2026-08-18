import { EvaluationResult } from '../types';

/**
 * Weight applied to the confidence score when computing a round grade that
 * includes confidence analysis.
 * Requirements: 7.5
 */
export const CONFIDENCE_WEIGHT = 0.2;

/**
 * Weight applied to the answer scores when computing a round grade that
 * includes confidence analysis.
 * Requirements: 7.5
 */
export const ANSWER_WEIGHT = 0.8;

/**
 * Compute a round's overall grade from individual answer evaluation results.
 *
 * When `confidenceScore` is provided the formula is:
 *   roundGrade = (averageAnswerScore * ANSWER_WEIGHT) + (confidenceScore * CONFIDENCE_WEIGHT)
 *
 * When `confidenceScore` is omitted the formula is:
 *   roundGrade = averageAnswerScore
 *
 * The result is always clamped to [0, 100].
 *
 * Requirements: 7.5
 */
export function computeRoundGrade(
  evaluations: EvaluationResult[],
  confidenceScore?: number
): number {
  if (evaluations.length === 0) {
    const base = 0;
    if (confidenceScore !== undefined) {
      return Math.min(100, Math.max(0, base * ANSWER_WEIGHT + confidenceScore * CONFIDENCE_WEIGHT));
    }
    return base;
  }

  const averageAnswerScore =
    evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;

  if (confidenceScore !== undefined) {
    const grade = averageAnswerScore * ANSWER_WEIGHT + confidenceScore * CONFIDENCE_WEIGHT;
    return Math.min(100, Math.max(0, grade));
  }

  return Math.min(100, Math.max(0, averageAnswerScore));
}

/**
 * Compute the final grade for a candidate by combining the initial round grade
 * and the HR round grade with equal weighting.
 *
 * finalGrade = (initialRoundGrade + hrRoundGrade) / 2
 *
 * The result is always in [0, 100] and is deterministic.
 *
 * Requirements: 6.4
 */
export function computeFinalGrade(
  initialRoundGrade: number,
  hrRoundGrade: number
): number {
  const grade = (initialRoundGrade + hrRoundGrade) / 2;
  return Math.min(100, Math.max(0, grade));
}
