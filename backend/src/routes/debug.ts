import { Router } from 'express';
import { pool } from '../db/connection';

const router = Router();

router.get('/debug/db-state', async (req, res) => {
  try {
    // Check job roles
    const jobRoles = await pool.query('SELECT id, name, track, required_skills, question_bank_id FROM job_roles');
    
    // Check questions count per bank
    const questionCounts = await pool.query(`
      SELECT question_bank_id, COUNT(*) as count 
      FROM questions 
      GROUP BY question_bank_id
    `);
    
    // Check candidates
    const candidates = await pool.query(`
      SELECT id, name, resume_data, job_role_id 
      FROM candidates 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    // Parse resume_data for the latest candidate
    let latestCandidate = null;
    if (candidates.rows.length > 0) {
      const c = candidates.rows[0];
      const resumeData = typeof c.resume_data === 'string' 
        ? JSON.parse(c.resume_data) 
        : c.resume_data;
      latestCandidate = {
        id: c.id,
        name: c.name,
        job_role_id: c.job_role_id,
        skills: resumeData.skills || [],
        experienceCount: (resumeData.experience || []).length,
        projectsCount: (resumeData.projects || []).length,
      };
    }

    res.json({
      jobRoles: jobRoles.rows,
      questionCounts: questionCounts.rows,
      latestCandidate,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;