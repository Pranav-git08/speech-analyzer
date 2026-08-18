/**
 * Property-based tests for the Question Generator.
 *
 * Feature: speech-analyzer, Property 3: Question generation relevance
 * Validates: Requirements 3.1, 5.1, 10.1
 */

import * as fc from 'fast-check';
import { generateQuestionSet, QuestionBankEntry } from '../services/questionGenerator';
import { RoundType } from '../types';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** A non-empty skill name (lowercase letters only for simplicity). */
const skillArb = fc
  .stringMatching(/^[a-z]{2,15}$/)
  .filter((s) => s.trim().length > 0);

/** A single question bank entry for a given skill and type. */
function questionEntryArb(
  skill: string,
  type: 'oral' | 'code_snippet'
): fc.Arbitrary<QuestionBankEntry> {
  return fc.record({
    id: fc.uuid(),
    questionBankId: fc.uuid(),
    type: fc.constant(type),
    text: fc.string({ minLength: 5, maxLength: 60 }),
    skill: fc.constant(skill),
    expectedAnswer: fc.string({ minLength: 1, maxLength: 80 }),
    expectedKeywords: fc.array(fc.string({ minLength: 1, maxLength: 15 }), {
      minLength: 1,
      maxLength: 5,
    }),
  });
}

/**
 * Builds an arbitrary question bank containing entries for a given set of
 * skills. Each skill gets at least one oral and one code_snippet entry so
 * that technical-round composition tests can pass.
 */
function questionBankArb(skills: string[]): fc.Arbitrary<QuestionBankEntry[]> {
  if (skills.length === 0) return fc.constant([]);

  const perSkillArbs = skills.flatMap((skill) => [
    questionEntryArb(skill, 'oral'),
    questionEntryArb(skill, 'code_snippet'),
  ]);

  return fc.tuple(...(perSkillArbs as [fc.Arbitrary<QuestionBankEntry>, ...fc.Arbitrary<QuestionBankEntry>[]])).map(
    (entries) => entries as QuestionBankEntry[]
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Question Generator – Property 3: Question generation relevance', () => {
  /**
   * Feature: speech-analyzer, Property 3: Question generation relevance
   * For any job role and set of matched skills, every question in the generated
   * question set should have its `skill` field set to a value present in the
   * matched skills set.
   * Validates: Requirements 3.1, 5.1, 10.1
   */
  it('every generated question skill is in the matched skills set (technical round)', () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { minLength: 1, maxLength: 5 }).chain((skills) =>
          fc.tuple(
            fc.constant(skills),
            questionBankArb(skills)
          )
        ),
        ([matchedSkills, bank]) => {
          const result = generateQuestionSet(bank, matchedSkills, 'technical', bank.length);

          const normMatched = new Set(matchedSkills.map((s) => s.toLowerCase().trim()));
          for (const q of result) {
            expect(normMatched.has(q.skill.toLowerCase().trim())).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every generated question skill is in the matched skills set (qualifying round)', () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { minLength: 1, maxLength: 5 }).chain((skills) =>
          fc.tuple(
            fc.constant(skills),
            questionBankArb(skills)
          )
        ),
        ([matchedSkills, bank]) => {
          const result = generateQuestionSet(bank, matchedSkills, 'qualifying', bank.length);

          const normMatched = new Set(matchedSkills.map((s) => s.toLowerCase().trim()));
          for (const q of result) {
            expect(normMatched.has(q.skill.toLowerCase().trim())).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('questions for unmatched skills are never included', () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { minLength: 1, maxLength: 4 }).chain((matchedSkills) =>
          fc.array(skillArb, { minLength: 1, maxLength: 4 })
            .filter((unmatchedSkills) =>
              unmatchedSkills.every((s) => !matchedSkills.includes(s))
            )
            .chain((unmatchedSkills) =>
              fc.tuple(
                fc.constant(matchedSkills),
                questionBankArb([...matchedSkills, ...unmatchedSkills])
              )
            )
        ),
        ([matchedSkills, bank]) => {
          const roundTypes: RoundType[] = ['technical', 'qualifying', 'hr'];
          const normMatched = new Set(matchedSkills.map((s) => s.toLowerCase().trim()));

          for (const roundType of roundTypes) {
            const result = generateQuestionSet(bank, matchedSkills, roundType, bank.length);
            for (const q of result) {
              expect(normMatched.has(q.skill.toLowerCase().trim())).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns fallback questions when no questions match the given skills', () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { minLength: 1, maxLength: 4 }).chain((bankSkills) =>
          fc.array(skillArb, { minLength: 1, maxLength: 4 })
            .filter((matchedSkills) =>
              matchedSkills.every((s) => !bankSkills.includes(s))
            )
            .chain((matchedSkills) =>
              fc.tuple(
                fc.constant(matchedSkills),
                questionBankArb(bankSkills)
              )
            )
        ),
        ([matchedSkills, bank]) => {
          // For technical rounds, fallback returns all questions
          const technicalResult = generateQuestionSet(bank, matchedSkills, 'technical', bank.length);
          expect(technicalResult.length).toBeGreaterThan(0);
          expect(technicalResult.length).toBeLessThanOrEqual(bank.length);
          
          // For qualifying/hr rounds, fallback returns oral questions
          const qualifyingResult = generateQuestionSet(bank, matchedSkills, 'qualifying', bank.length);
          expect(qualifyingResult.length).toBeGreaterThan(0);
          expect(qualifyingResult.every((q) => q.type === 'oral' || bank.every((b) => b.type !== 'oral'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
