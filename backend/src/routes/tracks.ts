import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';

const router = Router();

/**
 * GET /api/tracks
 * Returns the two available interview tracks.
 * Requirements: 1.1
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    tracks: [
      { id: 'TJI', name: 'Technical Job Interview (TJI)' },
      { id: 'NTJI', name: 'Non-Technical Job Interview (NTJI)' },
    ],
  });
});

/**
 * GET /api/roles?track=TJI|NTJI
 * Returns job roles for the given track.
 * Requirements: 1.2
 */
router.get('/roles', async (req: Request, res: Response) => {
  const { track } = req.query;

  if (!track || (track !== 'TJI' && track !== 'NTJI')) {
    res.status(400).json({ error: 'Query parameter "track" must be "TJI" or "NTJI".' });
    return;
  }

  try {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      track: string;
      required_skills: string | string[];
    }>(
      'SELECT id, name, track, required_skills FROM job_roles WHERE track = $1 ORDER BY name',
      [track]
    );

    res.json({
      roles: rows.map((r) => ({
        id: r.id,
        name: r.name,
        track: r.track,
        requiredSkills: typeof r.required_skills === 'string'
          ? JSON.parse(r.required_skills)
          : r.required_skills,
      })),
    });
  } catch (err) {
    console.error('GET /api/tracks/roles error:', err);
    res.status(500).json({ error: 'Failed to fetch job roles.' });
  }
});

export default router;
