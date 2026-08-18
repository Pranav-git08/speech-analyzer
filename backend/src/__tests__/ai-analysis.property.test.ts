/**
 * Property-based tests for the AI Analysis Service.
 *
 * Feature: speech-analyzer, Property 13: Filler word detection accuracy
 * Feature: speech-analyzer, Property 14: Confidence score monotonicity
 * Feature: speech-analyzer, Property 12: Composure classification validity
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

import * as fc from 'fast-check';
import {
  detectFillerWords,
  computeConfidenceScore,
  analyseFacialExpression,
  isValidComposureState,
  COMPOSURE_SCORES,
  FILLER_PENALTY_PER_WORD,
  DEFAULT_FILLER_WORDS,
} from '../services/aiAnalysisService';
import { ComposureState } from '../types';

// ─── Property 13: Filler word detection accuracy ──────────────────────────────

describe('AI Analysis Service – Property 13: Filler word detection accuracy', () => {
  /**
   * Feature: speech-analyzer, Property 13: Filler word detection accuracy
   * For any transcribed text containing a known number of filler words from
   * the defined filler word list, detectFillerWords should return a count
   * equal to the actual number of filler word occurrences.
   * Validates: Requirements 7.2
   */

  // Use only single-word fillers for controlled injection (avoids phrase overlap)
  const singleWordFillers = DEFAULT_FILLER_WORDS.filter((f) => !f.includes(' '));

  it('count equals the number of filler words injected into a clean sentence', () => {
    // Pre-build a pattern to exclude any word that would accidentally match a filler
    const fillerPattern = new RegExp(
      singleWordFillers
        .map((f) => `\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
        .join('|'),
      'i'
    );

    fc.assert(
      fc.property(
        // Pick a random subset of single-word fillers to inject
        fc.array(fc.constantFrom(...singleWordFillers), {
          minLength: 1,
          maxLength: 6,
        }),
        // Non-filler words: pure alphabetic only, no accidental filler matches
        fc.array(
          fc.stringMatching(/^[a-z]{3,10}$/).filter((w) => !fillerPattern.test(w)),
          { minLength: 2, maxLength: 8 }
        ),
        (fillers, context) => {
          // Build a sentence: interleave context words with filler words
          const words: string[] = [];
          for (let i = 0; i < fillers.length; i++) {
            if (context[i % context.length]) {
              words.push(context[i % context.length]);
            }
            words.push(fillers[i]);
          }
          words.push(context[0]); // trailing non-filler word
          const text = words.join(' ');

          const result = detectFillerWords(text, singleWordFillers);
          expect(result.count).toBe(fillers.length);
          expect(result.words).toHaveLength(fillers.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns count 0 for text with no filler words', () => {
    // Build a regex that matches any filler at a word boundary so we can
    // exclude generated words that would accidentally trigger a filler match.
    const fillerPattern = new RegExp(
      singleWordFillers
        .map((f) => `\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
        .join('|'),
      'i'
    );

    fc.assert(
      fc.property(
        fc.array(
          // Only use pure alphabetic words to avoid word-boundary surprises
          fc.stringMatching(/^[a-z]{3,10}$/).filter(
            (w) => !fillerPattern.test(w)
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (words) => {
          const text = words.join(' ');
          const result = detectFillerWords(text, singleWordFillers);
          expect(result.count).toBe(0);
          expect(result.words).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns count 0 for empty or whitespace-only text', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 }).map((s) => s.replace(/\S/g, ' '))),
        (text) => {
          const result = detectFillerWords(text);
          expect(result.count).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('count and words array length are always consistent', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (text) => {
          const result = detectFillerWords(text);
          expect(result.count).toBe(result.words.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14: Confidence score monotonicity ───────────────────────────────

describe('AI Analysis Service – Property 14: Confidence score monotonicity', () => {
  /**
   * Feature: speech-analyzer, Property 14: Confidence score monotonicity
   * For composure states ranked composed > slightly_positive > neutral > distressed,
   * a higher-ranked state should produce a confidence score >= a lower-ranked state
   * (with the same filler word count).
   * For filler word counts, fewer fillers should produce a score >= more fillers
   * (with the same composure state).
   * Validates: Requirements 7.3, 7.4
   */

  // Ordered from highest to lowest composure
  const composureOrder: ComposureState[] = [
    'composed',
    'slightly_positive',
    'neutral',
    'distressed',
  ];

  it('higher composure state produces >= confidence score than lower state (same filler count)', () => {
    fc.assert(
      fc.property(
        // Pick two indices where higherIdx < lowerIdx (higher rank = lower index)
        fc.integer({ min: 0, max: composureOrder.length - 2 }).chain((higherIdx) =>
          fc.integer({ min: higherIdx + 1, max: composureOrder.length - 1 }).map(
            (lowerIdx) => ({ higherIdx, lowerIdx })
          )
        ),
        fc.integer({ min: 0, max: 20 }),
        ({ higherIdx, lowerIdx }, fillerCount) => {
          const higherState = composureOrder[higherIdx];
          const lowerState = composureOrder[lowerIdx];

          const higherScore = computeConfidenceScore(
            COMPOSURE_SCORES[higherState],
            fillerCount
          );
          const lowerScore = computeConfidenceScore(
            COMPOSURE_SCORES[lowerState],
            fillerCount
          );

          expect(higherScore).toBeGreaterThanOrEqual(lowerScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('fewer filler words produce >= confidence score than more filler words (same composure)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...composureOrder),
        fc.integer({ min: 0, max: 10 }).chain((fewerFillers) =>
          fc.integer({ min: fewerFillers + 1, max: 20 }).map((moreFillers) => ({
            fewerFillers,
            moreFillers,
          }))
        ),
        (composureState, { fewerFillers, moreFillers }) => {
          const baseScore = COMPOSURE_SCORES[composureState];
          const scoreWithFewer = computeConfidenceScore(baseScore, fewerFillers);
          const scoreWithMore = computeConfidenceScore(baseScore, moreFillers);

          expect(scoreWithFewer).toBeGreaterThanOrEqual(scoreWithMore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('confidence score is always in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...composureOrder),
        fc.integer({ min: 0, max: 50 }),
        (composureState, fillerCount) => {
          const baseScore = COMPOSURE_SCORES[composureState];
          const score = computeConfidenceScore(baseScore, fillerCount);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('zero filler words produces the maximum score for a given composure state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...composureOrder),
        fc.integer({ min: 1, max: 20 }),
        (composureState, fillerCount) => {
          const baseScore = COMPOSURE_SCORES[composureState];
          const scoreZeroFillers = computeConfidenceScore(baseScore, 0);
          const scoreWithFillers = computeConfidenceScore(baseScore, fillerCount);
          expect(scoreZeroFillers).toBeGreaterThanOrEqual(scoreWithFillers);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 12: Composure classification validity ───────────────────────────

describe('AI Analysis Service – Property 12: Composure classification validity', () => {
  /**
   * Feature: speech-analyzer, Property 12: Composure classification validity
   * For any video frame input, the returned composure classification should be
   * exactly one of the four valid values: composed, slightly_positive, neutral,
   * or distressed.
   * Validates: Requirements 7.1
   */

  it('analyseFacialExpression always returns a valid composure state', async () => {
    // Run multiple calls to cover the random stub output
    const results = await Promise.all(
      Array.from({ length: 50 }, () => analyseFacialExpression(null))
    );

    for (const result of results) {
      // The function may return null on failure (graceful skip)
      if (result !== null) {
        expect(isValidComposureState(result.emotion)).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it('isValidComposureState returns true for all valid states', () => {
    const validStates: ComposureState[] = [
      'composed',
      'slightly_positive',
      'neutral',
      'distressed',
    ];
    for (const state of validStates) {
      expect(isValidComposureState(state)).toBe(true);
    }
  });

  it('isValidComposureState returns false for arbitrary invalid strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          (s) =>
            !['composed', 'slightly_positive', 'neutral', 'distressed'].includes(s)
        ),
        (invalidState) => {
          expect(isValidComposureState(invalidState)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
