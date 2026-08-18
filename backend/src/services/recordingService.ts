import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/connection';
import { config } from '../config/env';
import { RecordingMetadata, RoundType } from '../types';

// ─── Storage Client (MinIO / S3-compatible) ───────────────────────────────────

/**
 * Upload a buffer to object storage using the MinIO/S3-compatible HTTP API.
 *
 * Uses a minimal PUT request so we avoid adding a heavy SDK dependency.
 * The endpoint, bucket, access key, and secret key are read from config.
 */
async function uploadToStorage(
  objectKey: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const { endpoint, bucket, accessKey, secretKey } = config.storage;

  // Build the storage URL that will be persisted
  const storageUrl = `${endpoint}/${bucket}/${objectKey}`;

  // Use Node's built-in https/http module to PUT the object
  const url = new URL(storageUrl);
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? await import('https') : await import('http');

  await new Promise<void>((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port, 10) : isHttps ? 443 : 80,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': data.length,
        // Basic auth for MinIO (access key as user, secret key as password)
        Authorization:
          'Basic ' +
          Buffer.from(`${accessKey}:${secretKey}`).toString('base64'),
      },
    };

    const req = transport.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(
          new Error(
            `Storage upload failed with status ${res.statusCode} for key ${objectKey}`
          )
        );
      }
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });

  return storageUrl;
}

// ─── In-memory active recording store ────────────────────────────────────────

interface ActiveRecording {
  id: string;
  sessionId: string;
  candidateId: string;
  jobRoleId: string;
  roundType: RoundType;
  startTime: Date;
  chunks: Buffer[];
}

const activeRecordings = new Map<string, ActiveRecording>();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start a new recording for an interview session.
 *
 * Creates an in-memory recording entry keyed by a new recording ID.
 * The session must have candidateId and jobRoleId available; these are
 * passed in so the recording service remains decoupled from the interview
 * service's in-memory store.
 *
 * Requirements: 8.1, 8.2
 */
export function startRecording(
  sessionId: string,
  candidateId: string,
  jobRoleId: string,
  roundType: RoundType
): string {
  const recordingId = uuidv4();

  activeRecordings.set(recordingId, {
    id: recordingId,
    sessionId,
    candidateId,
    jobRoleId,
    roundType,
    startTime: new Date(),
    chunks: [],
  });

  return recordingId;
}

/**
 * Append a chunk of audio/video data to an active recording.
 *
 * Requirements: 8.1
 */
export function appendChunk(recordingId: string, chunk: Buffer): void {
  const recording = activeRecordings.get(recordingId);
  if (!recording) {
    throw new Error(`Recording not found: ${recordingId}`);
  }
  recording.chunks.push(chunk);
}

/**
 * Stop a recording, upload it to object storage, and persist metadata to the
 * recordings table.
 *
 * Associates the recording with the candidateId and jobRoleId that were
 * provided when startRecording was called.
 *
 * Requirements: 8.1, 8.2
 */
export async function stopRecording(recordingId: string): Promise<RecordingMetadata> {
  const recording = activeRecordings.get(recordingId);
  if (!recording) {
    throw new Error(`Recording not found: ${recordingId}`);
  }

  const endTime = new Date();
  const durationSeconds = Math.round(
    (endTime.getTime() - recording.startTime.getTime()) / 1000
  );

  // Combine all chunks into a single buffer
  const data = Buffer.concat(recording.chunks);
  const objectKey = `${recording.candidateId}/${recording.sessionId}/${recordingId}.webm`;

  // Upload to object storage
  const storageUrl = await uploadToStorage(objectKey, data, 'video/webm');

  // Persist metadata to the recordings table
  await pool.query(
    `INSERT INTO recordings
       (id, candidate_id, session_id, job_role_id, storage_url,
        duration_seconds, file_size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,    [
      recording.id,
      recording.candidateId,
      recording.sessionId,
      recording.jobRoleId,
      storageUrl,
      durationSeconds,
      data.length,
    ]
  );

  // Remove from in-memory store
  activeRecordings.delete(recordingId);

  const metadata: RecordingMetadata = {
    candidateId: recording.candidateId,
    sessionId: recording.sessionId,
    jobRoleId: recording.jobRoleId,
    roundType: recording.roundType,
    startTime: recording.startTime,
    endTime,
    storageUrl,
  };

  return metadata;
}

/**
 * Retrieve the storage URL for a completed recording from the database.
 *
 * Requirements: 8.3
 */
export async function getRecordingUrl(recordingId: string): Promise<string> {
  const { rows } = await pool.query<{ storage_url: string }>(
    'SELECT storage_url FROM recordings WHERE id = $1',
    [recordingId]
  );

  if (rows.length === 0) {
    throw new Error(`Recording not found: ${recordingId}`);
  }

  return rows[0].storage_url;
}

/**
 * Retrieve full recording metadata from the database by recording ID.
 *
 * Requirements: 8.2, 8.3
 */
export async function getRecordingMetadata(recordingId: string): Promise<{
  id: string;
  candidateId: string;
  sessionId: string;
  jobRoleId: string;
  storageUrl: string;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  createdAt: Date;
} | null> {
  const { rows } = await pool.query<{
    id: string;
    candidate_id: string;
    session_id: string;
    job_role_id: string;
    storage_url: string;
    duration_seconds: number | null;
    file_size_bytes: string | null;
    created_at: Date;
  }>(
    `SELECT id, candidate_id, session_id, job_role_id, storage_url,
            duration_seconds, file_size_bytes, created_at
     FROM recordings WHERE id = $1`,
    [recordingId]
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: r.id,
    candidateId: r.candidate_id,
    sessionId: r.session_id,
    jobRoleId: r.job_role_id,
    storageUrl: r.storage_url,
    durationSeconds: r.duration_seconds,
    fileSizeBytes: r.file_size_bytes !== null ? parseInt(r.file_size_bytes, 10) : null,
    createdAt: r.created_at,
  };
}

/**
 * Retrieve all recording metadata for a given candidate from the database.
 *
 * Requirements: 8.2, 8.3
 */
export async function getRecordingsByCandidate(candidateId: string): Promise<Array<{
  id: string;
  candidateId: string;
  sessionId: string;
  jobRoleId: string;
  storageUrl: string;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  createdAt: Date;
}>> {
  const { rows } = await pool.query<{
    id: string;
    candidate_id: string;
    session_id: string;
    job_role_id: string;
    storage_url: string;
    duration_seconds: number | null;
    file_size_bytes: string | null;
    created_at: Date;
  }>(
    `SELECT id, candidate_id, session_id, job_role_id, storage_url,
            duration_seconds, file_size_bytes, created_at
     FROM recordings WHERE candidate_id = $1
     ORDER BY created_at DESC`,
    [candidateId]
  );

  return rows.map((r) => ({
    id: r.id,
    candidateId: r.candidate_id,
    sessionId: r.session_id,
    jobRoleId: r.job_role_id,
    storageUrl: r.storage_url,
    durationSeconds: r.duration_seconds,
    fileSizeBytes: r.file_size_bytes !== null ? parseInt(r.file_size_bytes, 10) : null,
    createdAt: r.created_at,
  }));
}

// ─── Test helpers (exported for property tests) ───────────────────────────────

/**
 * Build a RecordingMetadata object from an active recording entry and a
 * storage URL. Used in property tests to validate association correctness
 * without hitting the database.
 *
 * Requirements: 8.2, 8.3
 */
export function buildRecordingMetadata(
  sessionId: string,
  candidateId: string,
  jobRoleId: string,
  roundType: RoundType,
  startTime: Date,
  endTime: Date,
  storageUrl: string
): RecordingMetadata {
  return {
    candidateId,
    sessionId,
    jobRoleId,
    roundType,
    startTime,
    endTime,
    storageUrl,
  };
}
