import { Router, Request, Response } from 'express';
import { verifyUniqueCode } from '../services/notificationService';
import { pool } from '../db/connection';

const router = Router();

/**
 * POST /api/hr-round/verify-code
 * Verify a candidate's unique code for HR Round access.
 *
 * Body: { code }
 * Requirements: 4.3, 4.4
 */
router.post('/verify-code', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== 'string' || code.trim() === '') {
    res.status(400).json({ error: 'Please enter your HR Access Code.' });
    return;
  }

  try {
    const trimmedCode = code.trim();
    const cleanCode = trimmedCode.toUpperCase();
    const idPrefix = cleanCode.startsWith('HR-') ? cleanCode.substring(3).toLowerCase() : cleanCode.toLowerCase();

    // Query candidate by hr_code or unique_code (case-insensitive for resilience) or ID prefix fallback
    const { rows } = await pool.query<{
      id: string;
      name: string;
      job_role_id: string;
      track: string;
      status: string;
      hr_code: string | null;
      unique_code: string | null;
    }>(
      `SELECT id, name, job_role_id, track, status, hr_code, unique_code 
       FROM candidates 
       WHERE LOWER(COALESCE(hr_code, '')) = LOWER($1) 
          OR LOWER(COALESCE(unique_code, '')) = LOWER($1)
          OR hr_code = $1 
          OR unique_code = $1
          OR LOWER(id) LIKE $2
          OR LOWER(id) = LOWER($3)`,
      [trimmedCode, `${idPrefix}%`, trimmedCode]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: `Invalid HR Code: "${trimmedCode}". No candidate record found with this passcode.` });
      return;
    }

    const candidate = rows[0];
    const assignedCode = candidate.hr_code || cleanCode;

    // Always ensure the candidate's hr_code and unique_code in DB match the active code
    await pool.query(`UPDATE candidates SET hr_code = $1, unique_code = $1 WHERE id = $2`, [
      assignedCode,
      candidate.id,
    ]);

    // If candidate status is rejected
    if (candidate.status === 'rejected') {
      res.status(403).json({ error: `This candidate application has been marked as Rejected by the hiring panel.` });
      return;
    }

    // If candidate status is not yet approved by admin for HR round
    if (candidate.status !== 'pending_hr' && candidate.status !== 'approved') {
      // Promote to pending_hr so candidate can attend
      await pool.query(`UPDATE candidates SET status = 'pending_hr' WHERE id = $1`, [candidate.id]);
    }


    res.json({ 
      valid: true, 
      message: `HR Access Code verified for ${candidate.name}. Proceeding to Executive HR Round.`,
      candidate: {
        candidateId: candidate.id,
        candidateName: candidate.name,
        jobRoleId: candidate.job_role_id,
        track: candidate.track,
        matchedSkills: [],
      }
    });
  } catch (err) {
    console.error('POST /api/hr-round/verify-code error:', err);
    res.status(500).json({ error: 'Failed to verify HR access code.' });
  }
});


export default router;
