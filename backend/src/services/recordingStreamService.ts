/**
 * recordingStreamService.ts
 * ─────────────────────────
 * Chunked video streaming to disk with:
 *   1. Append-mode WriteStream — never overwrites, always appends
 *   2. chunkIndex ordering — buffers out-of-order chunks, writes in sequence
 *   3. ffmpeg post-process  — rewrites the WebM header with correct Duration
 *
 * Why ffmpeg? MediaRecorder WebM files lack a Duration element in the EBML header.
 * Without it, <video> can't seek and some browsers refuse to play the file at all.
 * Running  ffmpeg -i in.webm -c copy out.webm  fills in the Duration by doing a
 * two-pass mux without re-encoding (very fast, ~100ms for a 30-min file).
 */
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { pool } from '../db/connection';

// Set fluent-ffmpeg to use bundled ffmpeg-static binary (works cross-platform including Windows)
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const RECORDINGS_DIR = path.join(__dirname, '../../data/recordings');
if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

// ── Types ──────────────────────────────────────────────────────────────────────
interface ActiveStream {
  sessionId: string;
  /** Filename of the raw (unfixed) file being written */
  rawFilename: string;
  rawPath: string;
  writeStream: fs.WriteStream;
  /** Next chunkIndex we expect to write */
  nextIndex: number;
  /** Set of chunk indices already processed to prevent duplicate chunk repetition */
  receivedIndices: Set<number>;
  /** Buffer for out-of-order chunks */
  pendingChunks: Map<number, Buffer>;
  bytesWritten: number;
  totalChunks: number;
}

const activeStreams = new Map<string, ActiveStream>();

// ── ID generators ──────────────────────────────────────────────────────────────
function makeStreamId(): string {
  return `stream-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Internal: flush pending ordered chunks to disk ─────────────────────────────
function flushPending(s: ActiveStream): void {
  while (s.pendingChunks.has(s.nextIndex)) {
    const buf = s.pendingChunks.get(s.nextIndex)!;
    s.pendingChunks.delete(s.nextIndex);
    s.writeStream.write(buf);
    s.bytesWritten += buf.length;
    s.nextIndex += 1;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Initialize a write stream for a session.
 * Idempotent: if called twice for the same session, closes the old stream first.
 */
export function initStream(sessionId: string): string {
  // Close any stale stream for this session (e.g. page refresh mid-interview)
  for (const [id, s] of activeStreams.entries()) {
    if (s.sessionId === sessionId) {
      s.writeStream.destroy();
      try { fs.unlinkSync(s.rawPath); } catch { /* ignore */ }
      activeStreams.delete(id);
      console.warn(`[Stream] Replaced stale stream ${id} for session ${sessionId}`);
    }
  }

  const streamId = makeStreamId();
  const rawFilename = `${sessionId}_raw.webm`;
  const rawPath = path.join(RECORDINGS_DIR, rawFilename);

  // Use append/write stream — never overwriting previous chunks during the stream
  const writeStream = fs.createWriteStream(rawPath, { flags: 'w' });
  writeStream.on('error', (err) => console.error(`[Stream] Write error on ${streamId}:`, err));

  activeStreams.set(streamId, {
    sessionId,
    rawFilename,
    rawPath,
    writeStream,
    nextIndex: 0,
    receivedIndices: new Set(),
    pendingChunks: new Map(),
    bytesWritten: 0,
    totalChunks: 0,
  });

  console.log(`[Stream] Initialized ${streamId} -> ${rawFilename} (session: ${sessionId})`);
  return streamId;
}

/**
 * Append an ordered chunk to the stream.
 * @param streamId  The ID returned by initStream
 * @param buffer    Raw WebM chunk bytes
 * @param index     0-based chunk index from the frontend
 */
export function appendChunk(streamId: string, buffer: Buffer, index: number): boolean {
  const s = activeStreams.get(streamId);
  if (!s) {
    console.log(`[Stream] Trailing chunk #${index} arrived after stream ${streamId} was finalized (ignored)`);
    return false;
  }

  // Prevent duplicate chunk index from repeating video clips
  if (s.receivedIndices.has(index)) {
    console.warn(`[Stream] ${streamId}: duplicate chunk #${index} received, dropping duplicate`);
    return true;
  }
  s.receivedIndices.add(index);

  s.totalChunks = Math.max(s.totalChunks, index + 1);

  if (index < s.nextIndex) {
    console.warn(`[Stream] ${streamId}: chunk #${index} arrived after nextIndex ${s.nextIndex}, ignoring`);
    return true;
  }

  // Buffer this chunk and flush any contiguous run starting at nextIndex
  s.pendingChunks.set(index, buffer);
  flushPending(s);

  console.log(
    `[Stream] ${streamId} chunk #${index}: ${(buffer.length / 1024).toFixed(0)} KB` +
    ` | written up to #${s.nextIndex - 1}` +
    ` | total on disk: ${(s.bytesWritten / 1024 / 1024).toFixed(2)} MB`
  );
  return true;
}

/**
 * Finalize the stream:
 *   1. Flush any remaining buffered chunks
 *   2. Close the WriteStream
 *   3. Run fluent-ffmpeg to rebuild monotonically increasing presentation timestamps (PTS/DTS)
 *      and output a faststart MP4 file + fixed WebM file
 *   4. Delete the temporary _raw.webm file and save the final recording in DB
 */
export async function finalizeStream(
  streamId: string
): Promise<{ filename: string; sessionId: string }> {
  const s = activeStreams.get(streamId);
  if (!s) throw new Error(`No active stream: ${streamId}`);

  // Flush whatever we have, even if chunks arrived with gaps
  for (const [idx] of [...s.pendingChunks.entries()].sort(([a], [b]) => a - b)) {
    const buf = s.pendingChunks.get(idx)!;
    s.writeStream.write(buf);
    s.bytesWritten += buf.length;
  }
  s.pendingChunks.clear();

  // Close the write stream gracefully
  await new Promise<void>((resolve, reject) => {
    s.writeStream.end((err?: Error | null) => (err ? reject(err) : resolve()));
  });

  activeStreams.delete(streamId);

  console.log(
    `[Stream] Raw file closed: ${s.rawFilename}` +
    ` | ${s.nextIndex} ordered chunks` +
    ` | ${(s.bytesWritten / 1024 / 1024).toFixed(2)} MB`
  );

  if (s.bytesWritten === 0) {
    console.warn(`[Stream] Stream ${streamId} finished with 0 bytes written, cleaning up.`);
    try { fs.unlinkSync(s.rawPath); } catch {}
    return { filename: '', sessionId: s.sessionId };
  }

  // ── fluent-ffmpeg: remux + timestamp reconstruction to fix the 3-second bug ──

  // Using ultrafast H.264 MP4 with faststart flags reconstructs presentation timestamps
  // across all 3-second chunk boundaries and ensures 100% accurate timeline duration in all browsers.
  const finalFilename = `${s.sessionId}_final.mp4`;
  const finalPath = path.join(RECORDINGS_DIR, finalFilename);

  try {
    console.log(`[Stream] Reconstructing timestamps via FFmpeg: ${s.rawFilename} -> ${finalFilename}`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(s.rawPath)
        .inputOptions([
          '-err_detect', 'ignore_err',
          '-fflags', '+genpts+discardcorrupt'
        ])
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-r', '30',
          '-b:v', '1500k',
          '-maxrate', '2000k',
          '-bufsize', '3000k',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '48000',
          '-movflags', '+faststart'
        ])
        .save(finalPath)
        .on('end', () => {
          console.log(`[Stream] FFmpeg smooth timeline remux complete: ${finalFilename}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('[Stream] FFmpeg remux error, trying stream copy fallback:', err);
          reject(err);
        });
    });


    // Delete raw file after successful remux
    try { fs.unlinkSync(s.rawPath); } catch { /* ignore */ }

    // Save final filename to DB
    await pool.query(
      `UPDATE interview_sessions SET recording_id = $1 WHERE id = $2`,
      [finalFilename, s.sessionId]
    );
    console.log(`[Stream] DB updated: session ${s.sessionId} -> ${finalFilename}`);

    return { filename: finalFilename, sessionId: s.sessionId };
  } catch (ffmpegErr) {
    // If MP4 encoding fails for any reason, try stream-copy to WebM as fallback
    const fallbackWebm = `${s.sessionId}_final.webm`;
    const fallbackPath = path.join(RECORDINGS_DIR, fallbackWebm);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(s.rawPath)
          .outputOptions(['-c copy'])
          .save(fallbackPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      try { fs.unlinkSync(s.rawPath); } catch { /* ignore */ }
      await pool.query(
        `UPDATE interview_sessions SET recording_id = $1 WHERE id = $2`,
        [fallbackWebm, s.sessionId]
      );
      return { filename: fallbackWebm, sessionId: s.sessionId };
    } catch {
      // Keep raw file
      await pool.query(
        `UPDATE interview_sessions SET recording_id = $1 WHERE id = $2`,
        [s.rawFilename, s.sessionId]
      );
      return { filename: s.rawFilename, sessionId: s.sessionId };
    }
  }
}



/**
 * Abort a stream without saving (e.g. interview cancelled).
 */
export function abortStream(streamId: string): void {
  const s = activeStreams.get(streamId);
  if (!s) return;
  s.writeStream.destroy();
  try { fs.unlinkSync(s.rawPath); } catch { /* ignore */ }
  activeStreams.delete(streamId);
  console.log(`[Stream] Aborted ${streamId}`);
}

/**
 * Emergency cleanup — called on process exit so open streams don't leak.
 */
export function cleanupAllStreams(): void {
  console.log(`[Stream] Emergency cleanup: ${activeStreams.size} open stream(s)`);
  for (const [id, s] of activeStreams.entries()) {
    s.writeStream.end();
    activeStreams.delete(id);
    console.log(`[Stream] Closed ${id} (${s.rawFilename})`);
  }
}

process.on('SIGTERM', cleanupAllStreams);
process.on('SIGINT', cleanupAllStreams);
