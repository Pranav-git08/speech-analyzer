import { pool } from '../db/connection';
import { ResumeData } from '../types';
import { serialiseResumeData, deserialiseResumeData } from './resumeSerialiser';

/**
 * Store parsed ResumeData as JSON text in the candidates table.
 * Requirements: 2.5
 */
export async function storeResumeData(
  candidateId: string,
  resumeData: ResumeData
): Promise<void> {
  const serialised = serialiseResumeData(resumeData);

  const result = await pool.query(
    `UPDATE candidates SET resume_data = $1 WHERE id = $2`,
    [serialised, candidateId]
  );

  if (result.rowCount === 0) {
    throw new Error(`Candidate not found: ${candidateId}`);
  }
}

/**
 * Retrieve the stored ResumeData for a candidate by their ID.
 * Requirements: 2.5
 */
export async function retrieveResumeData(candidateId: string): Promise<ResumeData> {
  const { rows } = await pool.query<{ resume_data: string }>(
    `SELECT resume_data FROM candidates WHERE id = $1`,
    [candidateId]
  );

  if (rows.length === 0) {
    throw new Error(`Candidate not found: ${candidateId}`);
  }

  const raw = rows[0].resume_data;
  const serialised = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return deserialiseResumeData(serialised);
}

// ─── Test helper ─────────────────────────────────────────────────────────────

export function simulatePersistenceRoundTrip(resumeData: ResumeData): ResumeData {
  const serialised = serialiseResumeData(resumeData);
  const jsonbObject = JSON.parse(serialised);
  const afterJsonb = JSON.stringify(jsonbObject);
  return deserialiseResumeData(afterJsonb);
}
