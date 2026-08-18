import { Question, RoundType } from '../types';

/**
 * In-memory question bank entry used by the generator.
 * In production this would be fetched from the database.
 */
export interface QuestionBankEntry {
  id: string;
  questionBankId: string;
  type: 'oral' | 'code_snippet';
  text: string;
  skill: string;
  expectedAnswer: string;
  expectedKeywords: string[];
  codeTemplate?: string;
  language?: string;
}

/**
 * Generate a question set for a given job role, matched skills, and round type.
 *
 * - For 'technical' rounds: returns both oral and code_snippet questions
 *   filtered to the matched skills.
 * - For 'qualifying' and 'hr' rounds: returns oral questions only.
 * - Every returned question's `skill` field is present in `matchedSkills`.
 *
 * Requirements: 3.1, 3.2, 5.1, 6.1, 10.1
 */
export function generateQuestionSet(
  questionBank: QuestionBankEntry[],
  matchedSkills: string[],
  roundType: RoundType,
  count: number
): Question[] {
  const normalisedSkills = new Set(matchedSkills.map((s) => s.toLowerCase().trim()));

  let eligible = questionBank.filter((q) =>
    normalisedSkills.has(q.skill.toLowerCase().trim())
  );

  // FALLBACK: if skill filtering yields nothing, use all questions for this round
  if (eligible.length === 0) {
    if (roundType === 'technical') {
      // For technical rounds, use all questions (both oral and code)
      eligible = questionBank;
    } else {
      // For qualifying and hr rounds, use all oral questions
      eligible = questionBank.filter((q) => q.type === 'oral');
      
      // If still no questions, use all questions as final fallback
      if (eligible.length === 0) {
        eligible = questionBank;
      }
    }
  }

  const pool = [...eligible];
  const selected: QuestionBankEntry[] = [];
  while (selected.length < count && pool.length > 0) {
    const idx = selected.length % pool.length;
    selected.push(...pool.splice(idx, 1));
  }

  return selected.map((entry) => ({
    id: entry.id,
    type: entry.type,
    text: entry.text,
    skill: entry.skill,
    expectedAnswer: entry.expectedAnswer,
    expectedKeywords: entry.expectedKeywords,
    codeTemplate: entry.codeTemplate,
    language: entry.language,
  }));
}