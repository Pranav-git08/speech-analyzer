import { ResumeData, Experience, Project } from '../types';

// ─── Schema validation helpers ────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function validateExperience(v: unknown): v is Experience {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    isString(e.company) &&
    isString(e.role) &&
    isString(e.duration) &&
    isString(e.description)
  );
}

function validateProject(v: unknown): v is Project {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    isString(p.title) &&
    isString(p.description) &&
    isStringArray(p.technologies)
  );
}

function validateResumeData(v: unknown): v is ResumeData {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    isString(r.name) &&
    isString(r.phone) &&
    isString(r.email) &&
    isStringArray(r.skills) &&
    Array.isArray(r.experience) &&
    (r.experience as unknown[]).every(validateExperience) &&
    Array.isArray(r.projects) &&
    (r.projects as unknown[]).every(validateProject)
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Serialise a ResumeData object to a JSON string.
 * Requirements 11.2
 */
export function serialiseResumeData(data: ResumeData): string {
  return JSON.stringify(data);
}

/**
 * Deserialise a JSON string back to a ResumeData object.
 * Throws if the string is not valid JSON or does not conform to the schema.
 * Requirements 11.3
 */
export function deserialiseResumeData(serialised: string): ResumeData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialised);
  } catch {
    throw new Error('deserialiseResumeData: invalid JSON string');
  }

  if (!validateResumeData(parsed)) {
    throw new Error(
      'deserialiseResumeData: parsed value does not conform to ResumeData schema'
    );
  }

  return parsed;
}
