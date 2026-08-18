import { SkillMatchResult } from '../types';

/**
 * Normalise a skill string for comparison: lowercase and trim whitespace.
 */
function normalise(skill: string): string {
  return skill.toLowerCase().trim();
}

/**
 * Compare candidate skills against required skills for a job role.
 *
 * Returns the list of matched skills (normalised) and whether the candidate
 * is eligible (at least one skill matches).
 *
 * Requirements: 2.2, 2.3, 2.4
 */
export function matchSkills(
  candidateSkills: string[],
  requiredSkills: string[]
): SkillMatchResult {
  const normalisedRequired = new Set(requiredSkills.map(normalise));

  const matched = candidateSkills
    .map(normalise)
    .filter((s) => normalisedRequired.has(s));

  // Deduplicate matched skills
  const uniqueMatched = [...new Set(matched)];

  return {
    matched: uniqueMatched,
    isEligible: uniqueMatched.length > 0,
  };
}
