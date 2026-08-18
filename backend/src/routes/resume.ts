import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parseResume, UnsupportedFormatError, ResumeParseError } from '../services/resumeParser';
import { serialiseResumeData } from '../services/resumeSerialiser';
import { generateHRCode } from '../services/notificationService';
import { pool } from '../db/connection';

const router = Router();

// Store file in memory so we can pass the buffer to the parser
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/resume/parse-preview
 * Accepts a multipart/form-data request with 'resume' file.
 * Returns parsed candidate details immediately without saving to database.
 */
router.post('/parse-preview', upload.single('resume'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Please attach a resume file.' });
    return;
  }

  try {
    const resumeData = await parseResume(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.status(200).json(resumeData);
  } catch (err) {
    if (err instanceof UnsupportedFormatError) {
      res.status(400).json({ error: err.message });
    } else if (err instanceof ResumeParseError) {
      res.status(422).json({ error: 'Resume could not be parsed. Please ensure the file is a valid PDF or DOCX.' });
    } else {
      console.error('Resume preview parse error:', err);
      res.status(500).json({ error: 'An unexpected error occurred during preview parsing.' });
    }
  }
});

/**
 * POST /api/resume/upload
 * Accepts a multipart/form-data request with fields:
 *   - resume (file)
 *   - jobRoleId (string)
 *   - track (string: TJI | NTJI)
 *
 * Parses the resume, creates a candidate record, and returns:
 *   { candidateId, resumeData }
 *
 * HTTP 400 – unsupported file format or missing fields
 * HTTP 422 – file could not be parsed
 */
router.post('/upload', upload.single('resume'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Please attach a resume file.' });
    return;
  }


  const { jobRoleId, track } = req.body as { jobRoleId?: string; track?: string };

  if (!jobRoleId || !track) {
    res.status(400).json({ error: 'jobRoleId and track are required fields.' });
    return;
  }

  try {
    const resumeData = await parseResume(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const serialised = serialiseResumeData(resumeData);

    // Create a candidate record so the interview service can look it up
    const candidateId = uuidv4();
    const hrCode = await generateHRCode();
    await pool.query(
      `INSERT INTO candidates (id, name, email, phone, resume_data, job_role_id, track, status, hr_code, unique_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_initial', $8, $8)`,
      [
        candidateId,
        resumeData.name || 'Unknown',
        resumeData.email || `${candidateId}@unknown.local`,
        resumeData.phone || '0000000000',
        serialised,
        jobRoleId,
        track,
        hrCode,
      ]
    );

    res.status(200).json({ candidateId, resumeData, serialised, hrCode });
  } catch (err) {
    if (err instanceof UnsupportedFormatError) {
      res.status(400).json({ error: err.message });
    } else if (err instanceof ResumeParseError) {
      res.status(422).json({ error: 'Resume could not be parsed. Please ensure the file is a valid PDF or DOCX.' });
    } else {
      console.error('Resume upload error:', err);
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
});

/**
 * POST /api/candidates/register-direct
 * Direct registration without resume upload.
 */
router.post('/register-direct', async (req: Request, res: Response) => {
  const { name, email, phone, jobRoleId, track } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    jobRoleId?: string;
    track?: string;
  };

  if (!jobRoleId || !track) {
    res.status(400).json({ error: 'jobRoleId and track are required.' });
    return;
  }

  try {
    const candidateId = uuidv4();
    const hrCode = await generateHRCode();
    const defaultResume = {
      name: name || 'Candidate',
      email: email || `${candidateId}@interview.local`,
      phone: phone || '+1 (555) 019-2834',
      skills: [],
    };
    const serialised = serialiseResumeData(defaultResume as any);

    await pool.query(
      `INSERT INTO candidates (id, name, email, phone, resume_data, job_role_id, track, status, hr_code, unique_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_initial', $8, $8)`,
      [
        candidateId,
        defaultResume.name,
        defaultResume.email,
        defaultResume.phone,
        serialised,
        jobRoleId,
        track,
        hrCode,
      ]
    );

    res.status(200).json({ candidateId, resumeData: defaultResume, hrCode });
  } catch (err) {
    console.error('Direct candidate registration error:', err);
    res.status(500).json({ error: 'Failed to register candidate.' });
  }
});

export default router;
