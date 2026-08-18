import { Router, Request, Response } from 'express';
import {
  GD_AGENTS,
  startGDSession,
  getGDSession,
  evaluateGDTurn,
} from '../services/gdRoundService';
import { verifyGDCode } from '../services/notificationService';
import { pool } from '../db/connection';

const router = Router();

/**
 * GET /api/gd-round/agents
 * List the 4 AI agent panelists participating in the Group Discussion.
 */
router.get('/agents', (_req: Request, res: Response) => {
  res.json({ agents: GD_AGENTS });
});

/**
 * POST /api/gd-round/verify-code
 * Verify candidate's GD Access Code (earned by passing Round 1).
 * Body: { code }
 */
router.post('/verify-code', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== 'string' || !code.trim()) {
    res.status(400).json({ error: 'GD Access Code is required.' });
    return;
  }

  try {
    const candidate = await verifyGDCode(code);

    if (!candidate) {
      res.status(401).json({
        error: 'Invalid or expired GD Access Code. You must clear the Technical or Non-Technical round first.',
      });
      return;
    }

    res.json({
      valid: true,
      message: 'GD Access Code verified successfully! Welcome to the AI Group Discussion arena.',
      candidate: {
        candidateId: candidate.id,
        candidateName: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        track: candidate.track,
        jobRoleId: candidate.job_role_id,
      },
    });
  } catch (err) {
    console.error('POST /api/gd-round/verify-code error:', err);
    res.status(500).json({ error: 'Failed to verify GD Access Code.' });
  }
});

/**
 * POST /api/gd-round/start
 * Initialize a multi-agent GD round session.
 * Body: { candidateId, candidateName?, track?, jobRoleId? }
 */
router.post('/start', (req: Request, res: Response) => {
  const { candidateId, candidateName, track, jobRoleId } = req.body as {
    candidateId?: string;
    candidateName?: string;
    track?: string;
    jobRoleId?: string;
  };

  if (!candidateId) {
    res.status(400).json({ error: 'candidateId is required.' });
    return;
  }

  const session = startGDSession({
    candidateId,
    candidateName,
    track,
    jobRoleId,
  });

  const firstQuestion = session.questions[0];
  const firstAgent = GD_AGENTS.find((a) => a.id === firstQuestion.agentId) || GD_AGENTS[0];

  res.status(201).json({
    sessionId: session.sessionId,
    agents: GD_AGENTS,
    firstAgent,
    firstQuestion,
    totalQuestions: session.questions.length,
  });
});

/**
 * GET /api/gd-round/session/:sessionId
 * Fetch current state of a GD session.
 */
router.get('/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = getGDSession(sessionId);

  if (!session) {
    res.status(404).json({ error: `GD Session not found: ${sessionId}` });
    return;
  }

  const currentQ = session.questions[session.currentAgentIndex];
  const currentAgent = currentQ ? GD_AGENTS.find((a) => a.id === currentQ.agentId) : null;

  res.json({
    session,
    currentAgent,
    currentQuestion: currentQ,
  });
});

/**
 * POST /api/gd-round/answer
 * Submit candidate's voice/text response to the speaking AI agent.
 * Body: { sessionId, answer }
 */
router.post('/answer', async (req: Request, res: Response) => {
  const { sessionId, answer } = req.body as {
    sessionId?: string;
    answer?: string;
  };

  if (!sessionId || answer === undefined) {
    res.status(400).json({ error: 'sessionId and answer are required.' });
    return;
  }

  try {
    const result = evaluateGDTurn({
      sessionId,
      candidateAnswer: answer,
    });

    const session = getGDSession(sessionId);

    // If session just completed, persist GD result to SQLite DB
    if (result.isComplete && result.finalReport && session) {
      const isPassed = result.finalReport.passed ? 1 : 0;
      const score = result.finalReport.compositeGDScore;

      try {
        await pool.query(
          `UPDATE candidates 
           SET gd_score = $1, 
               status = CASE WHEN $2 = 1 THEN 'pending_hr' ELSE 'rejected' END 
           WHERE id = $3`,
          [score, isPassed, session.candidateId]
        );

        // Store GD session in interview_sessions
        await pool.query(
          `INSERT INTO interview_sessions 
             (id, candidate_id, job_role_id, round_type, status, questions, answers, evaluations, final_grade, started_at, completed_at)
           VALUES ($1, $2, $3, 'qualifying', 'completed', $4, $5, $6, $7, datetime('now'), datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             status = 'completed',
             final_grade = excluded.final_grade,
             completed_at = excluded.completed_at`,
          [
            sessionId,
            session.candidateId,
            session.jobRoleId,
            JSON.stringify(session.questions),
            JSON.stringify(session.turns.map((t) => ({ questionId: t.question.id, content: t.candidateAnswer }))),
            JSON.stringify(session.turns.map((t) => ({ score: t.evaluation.overallScore, feedback: t.evaluation.turnFeedback }))),
            score,
          ]
        );
      } catch (dbErr) {
        console.warn('[gdRound] DB persistence warning:', dbErr);
      }
    }


    res.json(result);
  } catch (err: any) {
    console.error('POST /api/gd-round/answer error:', err);
    res.status(500).json({ error: err?.message || 'Failed to evaluate GD turn.' });
  }
});

export default router;
