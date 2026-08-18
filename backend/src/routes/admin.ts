import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import {
  generateUniqueCode,
  generateGDCode,
  generateHRCode,
  sendHRRoundCode,
  sendRejectionSMS,
  sendSelectionNotification,
  sendOfferLetterEmail,
  EmailAttachment,
} from '../services/notificationService';



import { generateCandidateIntelligenceDossier } from '../services/candidateIntelligenceService';
import { generateCandidateSWOT } from '../services/semanticMatcherService';
import { generateAntiCheatReport } from '../services/aiDetectionService';
import { getRecordingUrl } from '../services/recordingService';
import { initStream, appendChunk, finalizeStream, abortStream } from '../services/recordingStreamService';

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// ── Recording upload storage ──────────────────────────────────────────────────
const recordingsDir = path.join(__dirname, '../../data/recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const recordingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `recording-${unique}${ext}`);
  },
});
const uploadRecording = multer({
  storage: recordingStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});

// ─── Passing threshold ────────────────────────────────────────────────────────

const PASSING_THRESHOLD = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeJsonParse<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

/**
 * Fetch a candidate row with its latest session summary.
 * Requirements: 9.1
 */
async function fetchCandidateRecord(candidateId: string) {
  const { rows: candidateRows } = await pool.query<{
    id: string;
    name: string;
    email: string;
    phone: string;
    job_role_id: string;
    track: string;
    unique_code: string | null;
    gd_code: string | null;
    hr_code: string | null;
    gd_score: number | null;
    status: string;
    created_at: string;
    resume_data: unknown;
    job_role_name: string | null;
    job_role_required_skills?: string | null;
  }>(
    `SELECT c.id, c.name, c.email, c.phone, c.job_role_id, c.track,
            c.unique_code, c.gd_code, c.hr_code, c.gd_score, c.status, c.created_at, c.resume_data,
            COALESCE(jr.name, CASE WHEN c.track = 'NTJI' THEN 'Sales Executive' ELSE 'Software Engineer' END) AS job_role_name,
            jr.required_skills AS job_role_required_skills
     FROM candidates c
     LEFT JOIN job_roles jr ON jr.id = c.job_role_id
     WHERE c.id = $1`,
    [candidateId]
  );


  if (candidateRows.length === 0) return null;
  const candidate = candidateRows[0];

  // Guarantee every candidate has a distinct HR round code assigned
  let hrCode = candidate.hr_code || candidate.unique_code;
  if (!hrCode) {
    hrCode = await generateHRCode();
    pool.query(`UPDATE candidates SET hr_code = $1, unique_code = $1 WHERE id = $2`, [hrCode, candidateId]).catch(() => {});
  }

  // Fetch all sessions for this candidate (including Q&A and confidence data)

  const { rows: sessionRows } = await pool.query<{
    id: string;
    round_type: string;
    status: string;
    final_grade: number | null;
    recording_id: string | null;
    started_at: string;
    completed_at: string | null;
    questions: unknown;
    answers: unknown;
    evaluations: unknown;
    confidence_analysis: unknown;
  }>(
    `SELECT id, round_type, status, final_grade, recording_id, started_at, completed_at,
            questions, answers, evaluations, confidence_analysis
     FROM interview_sessions
     WHERE candidate_id = $1
     ORDER BY started_at ASC`,
    [candidateId]
  );

  const resolveRecording = (sessionId: string, dbRecId: string | null): string | null => {
    if (dbRecId) {
      if (fs.existsSync(path.join(recordingsDir, path.basename(dbRecId)))) return dbRecId;
    }
    const candidates = [
      `${sessionId}_final.mp4`,
      `${sessionId}_final.webm`,
      `${sessionId}_raw.webm`,
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(recordingsDir, c))) {
        pool.query(`UPDATE interview_sessions SET recording_id = $1 WHERE id = $2`, [c, sessionId]).catch(() => {});
        return c;
      }
    }
    return dbRecId;
  };

  const sessions = sessionRows.map((s) => {
    const recId = resolveRecording(s.id, s.recording_id);
    const parsedConf = safeJsonParse<any>(s.confidence_analysis, null);
    const antiCheatReport = parsedConf?.antiCheatReport || null;

    return {
      id: s.id,
      roundType: s.round_type,
      status: s.status,
      finalGrade: s.final_grade !== null ? Number(s.final_grade) : null,
      recordingId: recId,
      videoUrl: recId ? `/uploads/${recId}` : null,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      questions: safeJsonParse(s.questions, []),
      answers: safeJsonParse(s.answers, []),
      evaluations: safeJsonParse(s.evaluations, []),
      confidenceAnalysis: parsedConf,
      antiCheatReport,
    };
  });


  // Compute overall grade as average of all session grades
  const gradedSessions = sessions.filter((s) => s.finalGrade !== null);
  const overallGrade =
    gradedSessions.length > 0
      ? gradedSessions.reduce((sum, s) => sum + (s.finalGrade ?? 0), 0) / gradedSessions.length
      : null;

  // Identify recordings for initial and HR rounds so they are globally accessible
  const initialSession = sessions.find((s) => s.roundType === 'technical' || s.roundType === 'qualifying');
  const hrSession = sessions.find((s) => s.roundType === 'hr');
  const latestRecordingSession = [...sessions].reverse().find((s) => s.recordingId);
  const latestAntiCheatSession = [...sessions].reverse().find((s) => s.antiCheatReport);
  let antiCheatReport = latestAntiCheatSession?.antiCheatReport || null;
  if (!antiCheatReport) {
    const allEvals = sessions.flatMap((s) => s.evaluations || []);
    antiCheatReport = generateAntiCheatReport({ evaluations: allEvals });
  }

  // Generate 360° Candidate Intelligence Dossier
  let intelligenceDossier = null;
  try {
    const rawCandidateObj = {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      jobRoleId: candidate.job_role_id,
      track: candidate.track,
      uniqueCode: candidate.unique_code,
      status: candidate.status as any,
      createdAt: new Date(candidate.created_at),
      resumeData: safeJsonParse(candidate.resume_data, null),
    };
    intelligenceDossier = generateCandidateIntelligenceDossier(
      rawCandidateObj as any,
      sessions as any,
      candidate.job_role_name ?? 'Software Engineer'
    );
  } catch (dossierErr) {
    console.warn('[admin] Dossier generation error:', dossierErr);
  }

  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    jobRoleId: candidate.job_role_id,
    jobRoleName: candidate.job_role_name ?? 'Unknown Role',
    track: candidate.track,
    uniqueCode: candidate.unique_code || hrCode,
    gdCode: candidate.gd_code || hrCode,
    hrCode: candidate.hr_code || hrCode,
    gdScore: candidate.gd_score,


    status: candidate.status,
    createdAt: candidate.created_at,
    resumeData: safeJsonParse(candidate.resume_data, null),
    sessions,
    overallGrade,
    isPassing: overallGrade !== null && overallGrade >= PASSING_THRESHOLD,
    videoUrl: latestRecordingSession?.recordingId ? `/uploads/${latestRecordingSession.recordingId}` : null,
    initialVideoUrl: initialSession?.recordingId ? `/uploads/${initialSession.recordingId}` : null,
    hrVideoUrl: hrSession?.recordingId ? `/uploads/${hrSession.recordingId}` : null,
    intelligenceDossier,
    antiCheatReport,
  };


}



// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/candidates
 * List all candidates with optional filters.
 * Query params: track, jobRoleId, status
 * Requirements: 9.1, 9.2
 */
router.get('/candidates', async (req: Request, res: Response) => {
  const { track, jobRoleId, status } = req.query as {
    track?: string;
    jobRoleId?: string;
    status?: string;
  };

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (track) {
      conditions.push(`c.track = $${idx++}`);
      params.push(track);
    }
    if (jobRoleId) {
      conditions.push(`c.job_role_id = $${idx++}`);
      params.push(jobRoleId);
    }
    if (status) {
      conditions.push(`c.status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query<{
      id: string;
      name: string;
      email: string;
      phone: string;
      job_role_id: string;
      track: string;
      unique_code: string | null;
      hr_code: string | null;
      status: string;
      created_at: string;
      job_role_name: string | null;
      final_grade: number | null;
    }>(
      `SELECT c.id, c.name, c.email, c.phone, c.job_role_id, c.track,
              c.unique_code, c.hr_code, c.status, c.created_at,
              COALESCE(jr.name, 'Unknown Role') AS job_role_name,
              (SELECT AVG(s.final_grade)
               FROM interview_sessions s
               WHERE s.candidate_id = c.id
                 AND s.final_grade IS NOT NULL) AS final_grade
       FROM candidates c
       LEFT JOIN job_roles jr ON jr.id = c.job_role_id
       ${where}
       ORDER BY c.created_at DESC`,
      params
    );

    const candidates = rows.map((r) => {
      const rawGrade = r.final_grade !== null && r.final_grade !== undefined ? Number(r.final_grade) : null;
      const overallGrade = rawGrade !== null && !isNaN(rawGrade) ? rawGrade : null;
      const assignedHrCode = r.hr_code || r.unique_code || `HR-${r.id.substring(0, 6).toUpperCase()}`;
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        jobRoleId: r.job_role_id,
        jobRoleName: r.job_role_name ?? 'Unknown Role',
        track: r.track,
        uniqueCode: r.unique_code || assignedHrCode,
        hrCode: assignedHrCode,
        status: r.status,
        createdAt: r.created_at,
        overallGrade,
        isPassing: overallGrade !== null && overallGrade >= PASSING_THRESHOLD,
      };
    });


    res.json({ candidates, passingThreshold: PASSING_THRESHOLD });
  } catch (err) {
    console.error('GET /api/admin/candidates error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates.' });
  }
});

/**
 * GET /api/admin/candidate/:id
 * Get detailed candidate record including sessions and grades.
 * Requirements: 9.1
 */
router.get('/candidate/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const record = await fetchCandidateRecord(id);

    if (!record) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    res.json({ candidate: record, passingThreshold: PASSING_THRESHOLD });
  } catch (err) {
    console.error('GET /api/admin/candidate/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch candidate record.' });
  }
});

/**
 * POST /api/admin/candidate/:id/approve-initial
 * Approve a candidate's Round 1 (Technical / Qualifying) and generate/send GD round code.
 */
router.post('/candidate/:id/approve-initial', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query<{
      id: string;
      phone: string;
      email: string;
      status: string;
      hr_code: string | null;
      unique_code: string | null;
    }>(
      'SELECT id, phone, email, status, hr_code, unique_code FROM candidates WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    const candidate = rows[0];

    // Generate unique distinct HR code (e.g. HR-XXXXXX)
    const hrCode = candidate.hr_code ?? candidate.unique_code ?? (await generateHRCode());

    // Update candidate status to pending_hr and set hr_code
    await pool.query(
      `UPDATE candidates SET status = 'pending_hr', hr_code = $1, unique_code = $1 WHERE id = $2`,
      [hrCode, id]
    );

    try {
      await sendHRRoundCode(candidate.phone, hrCode);
      res.json({ message: 'Candidate approved for HR Round. Distinct HR Code dispatched via SMS.', hrCode });
    } catch (notifErr) {
      res.json({ message: 'Candidate approved for HR Round.', hrCode });
    }
  } catch (err) {
    console.error('POST /api/admin/candidate/:id/approve-initial error:', err);
    res.status(500).json({ error: 'Failed to approve candidate for HR round.' });
  }
});

/**
 * POST /api/admin/candidate/:id/disapprove-hr
 * Deny/disapprove a candidate for the HR round (sets status to 'rejected').
 */
router.post('/candidate/:id/disapprove-hr', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query<{ id: string; status: string }>(
      'SELECT id, status FROM candidates WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    await pool.query(`UPDATE candidates SET status = 'rejected' WHERE id = $1`, [id]);
    res.json({ message: 'Candidate disapproved for HR round. Status updated to Rejected.' });
  } catch (err) {
    console.error('POST /api/admin/candidate/:id/disapprove-hr error:', err);
    res.status(500).json({ error: 'Failed to disapprove candidate.' });
  }
});



/**
 * POST /api/admin/candidate/:id/approve-gd
 * Approve a candidate after completing the AI Group Discussion Round and generate/send distinct HR round code.
 */
router.post('/candidate/:id/approve-gd', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query<{
      id: string;
      phone: string;
      email: string;
      status: string;
      hr_code: string | null;
      unique_code: string | null;
    }>(
      'SELECT id, phone, email, status, hr_code, unique_code FROM candidates WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    const candidate = rows[0];

    // Generate distinct HR round code (e.g. HR-XXXXXX)
    const hrCode = candidate.hr_code ?? (await generateHRCode());

    // Update candidate status to pending_hr and set hr_code
    await pool.query(
      `UPDATE candidates SET status = 'pending_hr', hr_code = $1, unique_code = $1 WHERE id = $2`,
      [hrCode, id]
    );

    try {
      await sendHRRoundCode(candidate.phone, hrCode);
      res.json({ message: 'Candidate approved for HR Round. Distinct HR Code dispatched via SMS.', hrCode });
    } catch (notifErr) {
      res.json({ message: 'Candidate approved for HR Round.', hrCode });
    }
  } catch (err) {
    console.error('POST /api/admin/candidate/:id/approve-gd error:', err);
    res.status(500).json({ error: 'Failed to approve candidate for HR round.' });
  }
});


/**
 * POST /api/admin/candidate/:id/approve-final
 * Approve a candidate's final HR round evaluation and send offer letter.
 * Body: { offerLetter?: { content: string (base64), filename: string, type: string } }
 * Requirements: 9.4, 9.6
 */
router.post('/candidate/:id/approve-final', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { offerLetter } = req.body as {
    offerLetter?: { content: string; filename: string; type: string };
  };

  try {
    const { rows } = await pool.query<{
      id: string;
      phone: string;
      email: string;
      status: string;
    }>(
      'SELECT id, phone, email, status FROM candidates WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    const candidate = rows[0];

    if (candidate.status !== 'pending_hr' && candidate.status !== 'approved') {
      res.status(409).json({
        error: `Candidate is not eligible for final approval (current status: ${candidate.status}).`,
      });
      return;
    }

    // Update status to approved
    await pool.query(`UPDATE candidates SET status = 'approved' WHERE id = $1`, [id]);

    // Build attachment if provided
    const attachment: EmailAttachment | undefined = offerLetter
      ? {
          content: offerLetter.content,
          filename: offerLetter.filename,
          type: offerLetter.type,
          disposition: 'attachment',
        }
      : undefined;

    // Try to send selection SMS + offer email (gracefully handle missing credentials)
    try {
      await sendSelectionNotification(candidate.phone, candidate.email, attachment);
      res.json({ message: 'Candidate approved. Selection SMS and offer email sent.' });
    } catch (notifErr) {
      console.warn('Notification failed (continuing anyway):', notifErr);
      res.json({ message: 'Candidate approved. (Notifications not configured)' });
    }
  } catch (err) {
    console.error('POST /api/admin/candidate/:id/approve-final error:', err);
    res.status(500).json({ error: 'Failed to approve candidate.' });
  }
});

/**
 * POST /api/admin/candidate/:id/send-offer-letter
 * Send a customized offer letter to the candidate via email and SMS.
 */
router.post('/candidate/:id/send-offer-letter', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    candidateEmail,
    salary = '₹8,50,000 LPA',
    joiningDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
    location = 'Hyderabad / Hybrid',
    customMessage,
    offerLetter,
  } = req.body as {
    candidateEmail?: string;
    salary?: string;
    joiningDate?: string;
    location?: string;
    customMessage?: string;
    offerLetter?: { content: string; filename: string; type: string };
  };

  try {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      email: string;
      phone: string;
      status: string;
      job_role_name: string | null;
    }>(
      `SELECT c.id, c.name, c.email, c.phone, c.status,
              COALESCE(jr.name, 'Software Developer') AS job_role_name
       FROM candidates c
       LEFT JOIN job_roles jr ON jr.id = c.job_role_id
       WHERE c.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    const candidate = rows[0];
    const targetEmail = (candidateEmail && candidateEmail.trim()) || candidate.email;

    // Update candidate status to approved
    await pool.query(`UPDATE candidates SET status = 'approved' WHERE id = $1`, [id]);

    const attachment: EmailAttachment | undefined = offerLetter
      ? {
          content: offerLetter.content,
          filename: offerLetter.filename,
          type: offerLetter.type,
          disposition: 'attachment',
        }
      : undefined;

    const result = await sendOfferLetterEmail({
      candidateName: candidate.name,
      email: targetEmail,
      phone: candidate.phone,
      jobRoleName: candidate.job_role_name ?? 'Software Engineer',
      salary,
      joiningDate,
      location,
      customMessage,
      offerLetterAttachment: attachment,
    });

    res.json({
      success: true,
      message: result.message,
      details: {
        candidateName: candidate.name,
        email: targetEmail,
        jobRole: candidate.job_role_name,
        salary,
        joiningDate,
        location,
        mode: result.mode,
        fileName: result.fileName,
      },
    });
  } catch (err) {
    console.error('POST /api/admin/candidate/:id/send-offer-letter error:', err);
    res.status(500).json({ error: 'Failed to send offer letter email.' });
  }
});

/**
 * GET /api/admin/candidate/:id/offer-letter
 * Download or view the candidate's generated offer letter.
 */
router.get('/candidate/:id/offer-letter', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query<{ id: string; name: string }>(
      'SELECT id, name FROM candidates WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    const candidate = rows[0];
    const safeName = candidate.name.replace(/[^a-zA-Z0-9]/g, '_');
    const offerLettersDir = path.join(__dirname, '../../data/offer_letters');
    const filename = `Offer_Letter_${safeName}.html`;
    const filePath = path.join(offerLettersDir, filename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      return fs.createReadStream(filePath).pipe(res);
    }

    res.status(404).json({ error: 'Offer letter has not been generated for this candidate yet.' });
  } catch (err) {
    console.error('GET /api/admin/candidate/:id/offer-letter error:', err);
    res.status(500).json({ error: 'Failed to retrieve offer letter' });
  }
});



/**
 * POST /api/admin/candidate/:id/reject
 * Reject a candidate and send rejection SMS.
 * Requirements: 9.5
 */
router.post('/candidate/:id/reject', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query<{
      id: string;
      phone: string;
      status: string;
    }>(
      'SELECT id, phone, status FROM candidates WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    const candidate = rows[0];

    if (candidate.status === 'rejected') {
      res.status(409).json({ error: 'Candidate is already rejected.' });
      return;
    }

    // Update status to rejected
    await pool.query(`UPDATE candidates SET status = 'rejected' WHERE id = $1`, [id]);

    // Try to send rejection SMS (gracefully handle missing credentials)
    try {
      await sendRejectionSMS(candidate.phone);
      res.json({ message: 'Candidate rejected. Rejection SMS sent.' });
    } catch (notifErr) {
      console.warn('Rejection SMS failed (continuing anyway):', notifErr);
      res.json({ message: 'Candidate rejected. (SMS not configured)' });
    }
  } catch (err) {
    console.error('POST /api/admin/candidate/:id/reject error:', err);
    res.status(500).json({ error: 'Failed to reject candidate.' });
  }
});

/**
 * POST /api/admin/recording/upload
 * Legacy bulk upload — kept as fallback. New flow uses /stream/* endpoints.
 */
router.post('/recording/upload', uploadRecording.single('recording'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Recording file is required.' });
      return;
    }

    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'sessionId is required.' });
      return;
    }

    const recordingId = req.file.filename;
    await pool.query(
      `UPDATE interview_sessions SET recording_id = $1 WHERE id = $2`,
      [recordingId, sessionId]
    );
    console.log(`[Admin] Recording saved: ${recordingId} for session ${sessionId}`);
    res.json({ recordingId, message: 'Recording saved successfully.' });
  } catch (err) {
    console.error('POST /api/admin/recording/upload error:', err);
    res.status(500).json({ error: 'Failed to save recording.' });
  }
});

// ─── Chunked Streaming Upload Endpoints ───────────────────────────────────────

/**
 * POST /api/admin/recording/stream/start
 * Initialize a write stream for real-time chunked recording.
 * Body: { sessionId: string }
 * Response: { streamId: string }
 */
router.post('/recording/stream/start', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required.' });
      return;
    }
    const streamId = initStream(sessionId);
    res.json({ streamId });
  } catch (err) {
    console.error('POST /api/admin/recording/stream/start error:', err);
    res.status(500).json({ error: 'Failed to start recording stream.' });
  }
});

// Multer for binary chunk uploads (memory storage — chunks are small ~500KB each)
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max per chunk
});

/**
 * POST /api/admin/recording/stream/chunk
 * Append a binary video chunk to an active stream.
 * Body: FormData with 'chunk' (binary blob) and 'streamId'
 */
router.post('/recording/stream/chunk', chunkUpload.single('chunk'), async (req: Request, res: Response) => {
  try {
    const { streamId, chunkIndex } = req.body as { streamId?: string; chunkIndex?: string };
    if (!streamId) {
      res.status(400).json({ error: 'streamId is required.' });
      return;
    }
    if (!req.file || req.file.size === 0) {
      res.json({ ok: true, bytes: 0 });
      return;
    }
    const index = chunkIndex !== undefined ? parseInt(chunkIndex, 10) : 0;
    appendChunk(streamId, req.file.buffer, index);
    res.json({ ok: true, bytes: req.file.buffer.length, index });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('POST /api/admin/recording/stream/chunk error:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/admin/recording/stream/complete
 * Finalize the stream, close the file, save recording_id to DB.
 * Body: { streamId: string }
 * Response: { recordingId: string }
 */
router.post('/recording/stream/complete', async (req: Request, res: Response) => {
  try {
    const { streamId } = req.body as { streamId?: string };
    if (!streamId) {
      res.status(400).json({ error: 'streamId is required.' });
      return;
    }
    const { filename } = await finalizeStream(streamId);
    res.json({ recordingId: filename, message: 'Recording finalized.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('POST /api/admin/recording/stream/complete error:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/admin/recording/stream/abort
 * Abort a stream and delete the partial file.
 * Body: { streamId: string }
 */
router.post('/recording/stream/abort', (req: Request, res: Response) => {
  const { streamId } = req.body as { streamId?: string };
  if (streamId) abortStream(streamId);
  res.json({ ok: true });
});


router.options('/recording/:id', (req: Request, res: Response) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Authorization',
    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    'Access-Control-Max-Age': '86400',
  });
  res.sendStatus(204);
});

/**
 * GET /api/admin/recording/:id
 * Serve a recording file for playback in the admin panel.
 */
router.get('/recording/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Sanitise filename — only allow safe characters to prevent path traversal
  const safe = path.basename(id);
  const localPath = path.join(recordingsDir, safe);

  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // CORS headers so the <video> element can load from a direct
    // localhost:3001 URL even when the page is on localhost:3000
    const corsHeaders: Record<string, string | number> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    };

    if (fileSize === 0) {
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Length': 0,
        'Content-Type': safe.endsWith('.mp4') ? 'video/mp4' : 'video/webm',
      });
      res.end();
      return;
    }

    const contentType = safe.endsWith('.mp4') ? 'video/mp4' : 'video/webm';

    // Support HTTP range requests for video seeking
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const rawStart = parseInt(parts[0], 10);
      const rawEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const start = isNaN(rawStart) ? 0 : Math.max(0, Math.min(rawStart, fileSize - 1));
      const end = isNaN(rawEnd) ? fileSize - 1 : Math.max(start, Math.min(rawEnd, fileSize - 1));
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        ...corsHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      const stream = fs.createReadStream(localPath, { start, end });
      stream.on('error', (err) => {
        console.error(`[Recording] Stream error on ${safe}:`, err);
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });

      const stream = fs.createReadStream(localPath);
      stream.on('error', (err) => {
        console.error(`[Recording] Stream error on ${safe}:`, err);
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    }
    return;
  }


  // Fall back to external storage URL
  try {
    const url = await getRecordingUrl(id);
    res.json({ recordingId: id, storageUrl: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      console.error('GET /api/admin/recording/:id error:', err);
      res.status(500).json({ error: 'Failed to fetch recording.' });
    }
  }
});

/**
 * DELETE /api/admin/candidate/:id
 * Delete a candidate and all their associated data (sessions, recordings).
 * Also deletes the recording file from disk if it exists.
 */
router.delete('/candidate/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Get all session recording IDs before deleting
    const { rows: sessions } = await pool.query<{ recording_id: string | null }>(
      'SELECT recording_id FROM interview_sessions WHERE candidate_id = $1',
      [id]
    );

    // Delete recording files from disk
    for (const session of sessions) {
      if (session.recording_id) {
        const filePath = path.join(recordingsDir, path.basename(session.recording_id));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[Admin] Deleted recording file: ${session.recording_id}`);
        }
      }
    }

    // Delete candidate (cascades to sessions via FK if set, otherwise delete manually)
    await pool.query('DELETE FROM interview_sessions WHERE candidate_id = $1', [id]);
    const { rowCount } = await pool.query('DELETE FROM candidates WHERE id = $1', [id]);

    if (rowCount === 0) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    console.log(`[Admin] Deleted candidate ${id} and ${sessions.length} session(s)`);
    res.json({ message: 'Candidate and all associated data deleted successfully.' });
  } catch (err) {
    console.error('DELETE /api/admin/candidate/:id error:', err);
    res.status(500).json({ error: 'Failed to delete candidate.' });
  }
});

/**
 * DELETE /api/admin/recording/:id
 * Delete just the recording file for a session (keeps candidate/session data).
 */
router.delete('/recording/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const safe = path.basename(id);
    const filePath = path.join(recordingsDir, safe);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Clear the recording_id on the session so the UI no longer shows the player
    await pool.query(
      'UPDATE interview_sessions SET recording_id = NULL WHERE recording_id = $1',
      [id]
    );

    console.log(`[Admin] Deleted recording: ${id}`);
    res.json({ message: 'Recording deleted successfully.' });
  } catch (err) {
    console.error('DELETE /api/admin/recording/:id error:', err);
    res.status(500).json({ error: 'Failed to delete recording.' });
  }
});

/**
 * POST /api/admin/cleanup
 * Bulk cleanup: delete recordings and/or candidates matching a status filter.
 * Body: { deleteRecordings?: boolean, deleteCandidates?: boolean, statuses: string[] }
 * statuses: array of candidate statuses to target (e.g. ['approved', 'rejected'])
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  const { deleteRecordings = false, deleteCandidates = false, statuses = [] } = req.body as {
    deleteRecordings?: boolean;
    deleteCandidates?: boolean;
    statuses?: string[];
  };

  if (statuses.length === 0) {
    res.status(400).json({ error: 'At least one status must be specified.' });
    return;
  }

  const validStatuses = ['pending_initial', 'pending_hr', 'approved', 'rejected'];
  const invalid = statuses.filter((s) => !validStatuses.includes(s));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Invalid statuses: ${invalid.join(', ')}` });
    return;
  }

  try {
    const placeholders = statuses.map((_, i) => `$${i + 1}`).join(', ');

    // Get candidates matching the statuses
    const { rows: candidates } = await pool.query<{ id: string }>(
      `SELECT id FROM candidates WHERE status IN (${placeholders})`,
      statuses
    );
    const candidateIds = candidates.map((c) => c.id);

    if (candidateIds.length === 0) {
      res.json({ message: 'No candidates matched the specified statuses.', deletedCandidates: 0, deletedRecordings: 0 });
      return;
    }

    let deletedRecordings = 0;

    if (deleteRecordings || deleteCandidates) {
      // Get all recording IDs for these candidates
      const idPlaceholders = candidateIds.map((_, i) => `$${i + 1}`).join(', ');
      const { rows: sessions } = await pool.query<{ recording_id: string | null }>(
        `SELECT recording_id FROM interview_sessions WHERE candidate_id IN (${idPlaceholders})`,
        candidateIds
      );

      for (const session of sessions) {
        if (session.recording_id) {
          const filePath = path.join(recordingsDir, path.basename(session.recording_id));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deletedRecordings++;
          }
        }
      }

      if (!deleteCandidates) {
        // Clear recording references but keep candidate/session data
        await pool.query(
          `UPDATE interview_sessions SET recording_id = NULL WHERE candidate_id IN (${idPlaceholders})`,
          candidateIds
        );
      }
    }

    let deletedCandidates = 0;
    if (deleteCandidates) {
      const idPlaceholders = candidateIds.map((_, i) => `$${i + 1}`).join(', ');
      await pool.query(
        `DELETE FROM interview_sessions WHERE candidate_id IN (${idPlaceholders})`,
        candidateIds
      );
      const { rowCount } = await pool.query(
        `DELETE FROM candidates WHERE id IN (${idPlaceholders})`,
        candidateIds
      );
      deletedCandidates = rowCount ?? 0;
    }

    res.json({
      message: `Cleanup complete.`,
      deletedCandidates,
      deletedRecordings,
      affectedCandidates: candidateIds.length,
    });
  } catch (err) {
    console.error('POST /api/admin/cleanup error:', err);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
});

/**
 * POST /api/admin/candidates/bulk-delete
 * Delete recordings and/or full candidate records for a specific list of candidate IDs.
 * Body: { candidateIds: string[], deleteRecordings: boolean, deleteCandidates: boolean }
 */
router.post('/candidates/bulk-delete', async (req: Request, res: Response) => {
  const { candidateIds = [], deleteRecordings = false, deleteCandidates = false } = req.body as {
    candidateIds?: string[];
    deleteRecordings?: boolean;
    deleteCandidates?: boolean;
  };

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    res.status(400).json({ error: 'candidateIds must be a non-empty array.' });
    return;
  }

  if (!deleteRecordings && !deleteCandidates) {
    res.status(400).json({ error: 'At least one of deleteRecordings or deleteCandidates must be true.' });
    return;
  }

  try {
    const idPlaceholders = candidateIds.map((_, i) => `$${i + 1}`).join(', ');

    // Verify these candidates exist
    const { rows: existingCandidates } = await pool.query<{ id: string }>(
      `SELECT id FROM candidates WHERE id IN (${idPlaceholders})`,
      candidateIds
    );
    const validIds = existingCandidates.map((c) => c.id);

    if (validIds.length === 0) {
      res.json({ message: 'No matching candidates found.', deletedCandidates: 0, deletedRecordings: 0, affectedCandidates: 0 });
      return;
    }

    const validPlaceholders = validIds.map((_, i) => `$${i + 1}`).join(', ');
    let deletedRecordings = 0;

    if (deleteRecordings || deleteCandidates) {
      // Get all recording IDs for these candidates
      const { rows: sessions } = await pool.query<{ recording_id: string | null }>(
        `SELECT recording_id FROM interview_sessions WHERE candidate_id IN (${validPlaceholders})`,
        validIds
      );

      for (const session of sessions) {
        if (session.recording_id) {
          const filePath = path.join(recordingsDir, path.basename(session.recording_id));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deletedRecordings++;
            console.log(`[Admin] Bulk-delete: removed recording ${session.recording_id}`);
          }
        }
      }

      if (!deleteCandidates) {
        // Clear recording references but keep candidate/session rows
        await pool.query(
          `UPDATE interview_sessions SET recording_id = NULL WHERE candidate_id IN (${validPlaceholders})`,
          validIds
        );
      }
    }

    let deletedCandidatesCount = 0;
    if (deleteCandidates) {
      await pool.query(
        `DELETE FROM interview_sessions WHERE candidate_id IN (${validPlaceholders})`,
        validIds
      );
      const { rowCount } = await pool.query(
        `DELETE FROM candidates WHERE id IN (${validPlaceholders})`,
        validIds
      );
      deletedCandidatesCount = rowCount ?? 0;
      console.log(`[Admin] Bulk-delete: removed ${deletedCandidatesCount} candidate(s)`);
    }

    res.json({
      message: 'Bulk delete complete.',
      deletedCandidates: deletedCandidatesCount,
      deletedRecordings,
      affectedCandidates: validIds.length,
    });
  } catch (err) {
    console.error('POST /api/admin/candidates/bulk-delete error:', err);
    res.status(500).json({ error: 'Bulk delete failed.' });
  }
});

/**
 * GET /api/admin/candidate/:id/intelligence-dossier
 * Fetch the 360° Candidate Intelligence Dossier & Hiring Decision.
 */
router.get('/candidate/:id/intelligence-dossier', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const record = await fetchCandidateRecord(id);
    if (!record) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }
    res.json({ dossier: record.intelligenceDossier });
  } catch (err) {
    console.error('GET /api/admin/candidate/:id/intelligence-dossier error:', err);
    res.status(500).json({ error: 'Failed to generate intelligence dossier' });
  }
});

/**
 * POST /api/admin/candidate/:id/generate-swot
 * Regenerate or customize AI candidate SWOT analysis.
 */
router.post('/candidate/:id/generate-swot', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const record = await fetchCandidateRecord(id);
    if (!record) {
      res.status(404).json({ error: `Candidate not found: ${id}` });
      return;
    }

    const swot = generateCandidateSWOT({
      resumeData: record.resumeData as any,
      overallGrade: record.overallGrade,
      jobRoleName: record.jobRoleName,
    });

    res.json({ swot });
  } catch (err) {
    console.error('POST /api/admin/candidate/:id/generate-swot error:', err);
    res.status(500).json({ error: 'Failed to generate candidate SWOT' });
  }
});

/**
 * POST /api/admin/candidate/:id/generate-feedback-letter
 * Returns structured candidate developmental feedback letter.
 */
router.post('/candidate/:id/generate-feedback-letter', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const record = await fetchCandidateRecord(id);
    if (!record || !record.intelligenceDossier) {
      res.status(404).json({ error: `Candidate dossier not found for: ${id}` });
      return;
    }

    res.json({
      candidateName: record.name,
      jobRoleName: record.jobRoleName,
      letter: record.intelligenceDossier.candidateFeedbackLetter,
      strengths: record.intelligenceDossier.strengthsAndHighlights,
      areasForDevelopment: record.intelligenceDossier.areasForDevelopment,
    });
  } catch (err) {
    console.error('POST /api/admin/candidate/:id/generate-feedback-letter error:', err);
    res.status(500).json({ error: 'Failed to generate feedback letter' });
  }
});

export default router;

