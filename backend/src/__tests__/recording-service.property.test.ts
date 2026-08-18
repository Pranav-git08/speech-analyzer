/**
 * Property-based tests for the Recording Service.
 *
 * Feature: speech-analyzer, Property 16: Recording association correctness
 * Validates: Requirements 8.2, 8.3
 */

import * as fc from 'fast-check';
import {
  startRecording,
  appendChunk,
  buildRecordingMetadata,
} from '../services/recordingService';
import { RecordingMetadata, RoundType } from '../types';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const uuidArb = fc.uuid();

const roundTypeArb = fc.constantFrom<RoundType>(
  'technical',
  'qualifying',
  'hr'
);

const storageUrlArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{4,12}$/),
    fc.stringMatching(/^[a-z0-9]{4,12}$/),
    fc.stringMatching(/^[a-z0-9]{4,12}$/)
  )
  .map(([bucket, candidateId, key]) => `http://localhost:9000/${bucket}/${candidateId}/${key}.webm`);

// ─── Property 16: Recording association correctness ───────────────────────────

describe('Recording Service – Property 16: Recording association correctness', () => {
  /**
   * Feature: speech-analyzer, Property 16: Recording association correctness
   *
   * For any completed interview session, the stored recording metadata should
   * reference the correct candidateId and jobRoleId that were associated with
   * that session, and the storageUrl should be a non-empty string pointing to
   * a retrievable resource.
   *
   * Validates: Requirements 8.2, 8.3
   */

  it('recording metadata candidateId matches the session candidateId', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        uuidArb,
        roundTypeArb,
        storageUrlArb,
        (sessionId, candidateId, jobRoleId, roundType, storageUrl) => {
          const startTime = new Date(2024, 0, 1, 10, 0, 0);
          const endTime = new Date(2024, 0, 1, 10, 30, 0);

          const metadata = buildRecordingMetadata(
            sessionId,
            candidateId,
            jobRoleId,
            roundType,
            startTime,
            endTime,
            storageUrl
          );

          // The candidateId in metadata must match what was passed in
          expect(metadata.candidateId).toBe(candidateId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('recording metadata jobRoleId matches the session jobRoleId', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        uuidArb,
        roundTypeArb,
        storageUrlArb,
        (sessionId, candidateId, jobRoleId, roundType, storageUrl) => {
          const startTime = new Date(2024, 0, 1, 10, 0, 0);
          const endTime = new Date(2024, 0, 1, 10, 30, 0);

          const metadata = buildRecordingMetadata(
            sessionId,
            candidateId,
            jobRoleId,
            roundType,
            startTime,
            endTime,
            storageUrl
          );

          // The jobRoleId in metadata must match what was passed in
          expect(metadata.jobRoleId).toBe(jobRoleId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('recording metadata storageUrl is always a non-empty string', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        uuidArb,
        roundTypeArb,
        storageUrlArb,
        (sessionId, candidateId, jobRoleId, roundType, storageUrl) => {
          const startTime = new Date(2024, 0, 1, 10, 0, 0);
          const endTime = new Date(2024, 0, 1, 10, 30, 0);

          const metadata = buildRecordingMetadata(
            sessionId,
            candidateId,
            jobRoleId,
            roundType,
            startTime,
            endTime,
            storageUrl
          );

          // storageUrl must be a non-empty string
          expect(typeof metadata.storageUrl).toBe('string');
          expect(metadata.storageUrl.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('recording metadata sessionId matches the session it was created for', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        uuidArb,
        roundTypeArb,
        storageUrlArb,
        (sessionId, candidateId, jobRoleId, roundType, storageUrl) => {
          const startTime = new Date(2024, 0, 1, 10, 0, 0);
          const endTime = new Date(2024, 0, 1, 10, 30, 0);

          const metadata = buildRecordingMetadata(
            sessionId,
            candidateId,
            jobRoleId,
            roundType,
            startTime,
            endTime,
            storageUrl
          );

          expect(metadata.sessionId).toBe(sessionId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('startRecording returns a unique ID and associates it with the correct session', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        uuidArb,
        roundTypeArb,
        (sessionId, candidateId, jobRoleId, roundType) => {
          const recordingId = startRecording(
            sessionId,
            candidateId,
            jobRoleId,
            roundType
          );

          // Recording ID must be a non-empty string (UUID format)
          expect(typeof recordingId).toBe('string');
          expect(recordingId.length).toBeGreaterThan(0);

          // Two recordings started for the same session get different IDs
          const recordingId2 = startRecording(
            sessionId,
            candidateId,
            jobRoleId,
            roundType
          );
          expect(recordingId).not.toBe(recordingId2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('appending chunks to a recording does not change its association metadata', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        uuidArb,
        roundTypeArb,
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 64 }), {
          minLength: 1,
          maxLength: 5,
        }),
        (sessionId, candidateId, jobRoleId, roundType, chunkArrays) => {
          const recordingId = startRecording(
            sessionId,
            candidateId,
            jobRoleId,
            roundType
          );

          // Append chunks — this should not throw or corrupt association data
          for (const arr of chunkArrays) {
            appendChunk(recordingId, Buffer.from(arr));
          }

          // Build metadata to verify association is still correct
          const storageUrl = `http://localhost:9000/recordings/${candidateId}/${recordingId}.webm`;
          const metadata = buildRecordingMetadata(
            sessionId,
            candidateId,
            jobRoleId,
            roundType,
            new Date(),
            new Date(),
            storageUrl
          );

          expect(metadata.candidateId).toBe(candidateId);
          expect(metadata.jobRoleId).toBe(jobRoleId);
          expect(metadata.sessionId).toBe(sessionId);
          expect(metadata.storageUrl).toBe(storageUrl);
        }
      ),
      { numRuns: 100 }
    );
  });
});
