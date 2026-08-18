import { v4 as uuidv4 } from 'uuid';
import {
  InterviewSession,
  Question,
  Answer,
  EvaluationResult,
  RoundType,
  Track,
  SessionStatus,
  RoundSummary,
  ConfidenceAnalysis,
} from '../types';
import { generateQuestionSet, QuestionBankEntry } from './questionGenerator';
import { evaluateOralAnswer, evaluateCodeAnswer, evaluateHRAnswer, extractMetricsFromTranscription, shouldTerminateRound } from './evaluationEngine';
import { translateText } from './aiAnalysisService';
import { performLinguisticAnalysis } from './linguisticService';
import { analyzeProsody } from './prosodyService';
import { analyzeVisionNonVerbal } from './visionAnalysisService';
import { analyzeAnswerIntegrity, generateAntiCheatReport } from './aiDetectionService';
import { computeRoundGrade } from './gradeComputation';




import { pool } from '../db/connection';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_QUESTION_COUNT = 10;

// ─── In-memory session store ──────────────────────────────────────────────────
// Sessions are kept in memory during the interview and persisted on completion.

const activeSessions = new Map<string, InterviewSession>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch question bank entries for a given question bank ID from the database.
 */
async function fetchQuestionBank(questionBankId: string): Promise<QuestionBankEntry[]> {
  const { rows } = await pool.query<{
    id: string;
    question_bank_id: string;
    type: 'oral' | 'code_snippet';
    text: string;
    skill: string;
    expected_answer: string;
    expected_keywords: string | string[];
    code_template: string | null;
    language: string | null;
  }>(
    `SELECT id, question_bank_id, type, text, skill, expected_answer,
            expected_keywords, code_template, language
     FROM questions
     WHERE question_bank_id = $1`,
    [questionBankId]
  );

  return rows.map((r) => ({
    id: r.id,
    questionBankId: r.question_bank_id,
    type: r.type,
    text: r.text,
    skill: r.skill,
    expectedAnswer: r.expected_answer,
    expectedKeywords: typeof r.expected_keywords === 'string'
      ? JSON.parse(r.expected_keywords)
      : r.expected_keywords,
    codeTemplate: r.code_template ?? undefined,
    language: r.language ?? undefined,
  }));
}

/**
 * Fetch the job role record from the database.
 */
async function fetchJobRole(jobRoleId: string): Promise<{
  id: string;
  track: Track;
  questionBankId: string;
  requiredSkills: string[];
}> {
  const { rows } = await pool.query<{
    id: string;
    track: Track;
    question_bank_id: string;
    required_skills: string | string[];
  }>(
    'SELECT id, track, question_bank_id, required_skills FROM job_roles WHERE id = $1',
    [jobRoleId]
  );

  if (rows.length === 0) {
    throw new Error(`Job role not found: ${jobRoleId}`);
  }

  const raw = rows[0].required_skills;
  const requiredSkills: string[] = typeof raw === 'string' ? JSON.parse(raw) : raw;

  return {
    id: rows[0].id,
    track: rows[0].track,
    questionBankId: rows[0].question_bank_id,
    requiredSkills,
  };
}

/**
 * Fetch the matched skills for a candidate from their stored resume data.
 */
async function fetchMatchedSkills(
  candidateId: string,
  requiredSkills: string[]
): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ resume_data: string }>(
      'SELECT resume_data FROM candidates WHERE id = $1',
      [candidateId]
    );

    if (rows.length === 0 || !rows[0].resume_data) {
      return requiredSkills;
    }

    // resume_data is stored as JSON text in SQLite — parse it before accessing .skills
    const rawResumeData = rows[0].resume_data;
    const resumeDataObj: { skills?: string[] } =
      typeof rawResumeData === 'string'
        ? (JSON.parse(rawResumeData) as { skills?: string[] })
        : (rawResumeData as unknown as { skills?: string[] });
    const candidateSkills: string[] = resumeDataObj?.skills ?? [];
    const normCandidate = new Set(candidateSkills.map((s) => s.toLowerCase().trim()));

    const matched = requiredSkills.filter((req) =>
      normCandidate.has(req.toLowerCase().trim())
    );

    return matched.length > 0 ? matched : requiredSkills;
  } catch {
    return requiredSkills;
  }
}
// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start a new interview session for a candidate.
 *
 * - Fetches the job role and question bank from the database.
 * - Generates a question set based on matched skills and round type.
 * - Creates an in-memory session record.
 *
 * Requirements: 3.1, 5.1, 6.1
 */
export async function startInterview(
  candidateId: string,
  jobRoleId: string,
  roundType: RoundType,
  matchedSkills?: string[],
  language?: string
): Promise<InterviewSession> {
  const jobRole = await fetchJobRole(jobRoleId);

  // Ensure candidate record exists in DB to prevent foreign key errors
  try {
    const existing = await pool.query('SELECT id FROM candidates WHERE id = $1', [candidateId]);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO candidates (id, name, email, phone, resume_data, job_role_id, track, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_initial')`,
        [
          candidateId,
          'Candidate',
          `${candidateId}@interview.local`,
          '+1 (555) 019-2834',
          JSON.stringify({ name: 'Candidate', email: `${candidateId}@interview.local`, skills: jobRole.requiredSkills }),
          jobRoleId,
          jobRole.track,
        ]
      );
    }
  } catch (dbErr) {
    console.warn('[interviewService] Candidate auto-creation error (continuing):', dbErr);
  }

  const skills = (matchedSkills && matchedSkills.length > 0)
    ? matchedSkills
    : (await fetchMatchedSkills(candidateId, jobRole.requiredSkills));

  // For HR rounds, use the common HR question bank instead of role-specific bank
  const questionBankId = roundType === 'hr' ? 'qb-hr-common' : jobRole.questionBankId;
  const questionBank = await fetchQuestionBank(questionBankId);
  let questions = generateQuestionSet(questionBank, skills, roundType, DEFAULT_QUESTION_COUNT);


  // Translate questions if a non-English language was selected
  if (language && language !== 'English') {
    console.log(`[interviewService] Translating ${questions.length} questions to ${language}...`);
    questions = await Promise.all(
      questions.map(async (q) => ({
        ...q,
        text: await translateText(q.text, language),
      }))
    );
    console.log(`[interviewService] Translation complete.`);
  }

  const session: InterviewSession = {
    id: uuidv4(),
    candidateId,
    jobRoleId,
    track: jobRole.track,
    roundType,
    status: 'in_progress',
    questions,
    answers: [],
    evaluations: [],
    recordingId: '',
    currentQuestionIndex: 0,
    consecutivePoorGrades: 0,
  };

  activeSessions.set(session.id, session);

  // Persist initial session record to DB immediately so streaming and recording finalization can update the row
  try {
    await pool.query(
      `INSERT INTO interview_sessions
         (id, candidate_id, job_role_id, round_type, status,
          questions, answers, evaluations, confidence_analysis,
          recording_id, final_grade, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, datetime('now'))
       ON CONFLICT(id) DO NOTHING`,
      [
        session.id,
        session.candidateId,
        session.jobRoleId,
        session.roundType,
        session.status,
        JSON.stringify(session.questions),
        JSON.stringify(session.answers),
        JSON.stringify(session.evaluations),
        null,
        null,
        null,
      ]
    );
  } catch (dbErr) {
    console.error('[interviewService] Initial session DB insert warning:', dbErr);
  }

  return session;
}

/**
 * Get the next unanswered question for a session.
 *
 * Returns null when all questions have been answered or the session is not
 * in progress.
 *
 * Requirements: 3.1, 5.1
 */
export function getNextQuestion(sessionId: string): Question | null {
  const session = activeSessions.get(sessionId);
  if (!session || session.status !== 'in_progress') return null;
  if (session.currentQuestionIndex >= session.questions.length) return null;
  return session.questions[session.currentQuestionIndex];
}

/**
 * Submit an answer for the current question in a session.
 *
 * - Evaluates the answer using the appropriate evaluator.
 * - Advances the question index.
 * - Checks for three-strike termination.
 * - Returns the evaluation result.
 *
 * Requirements: 3.3, 3.4, 3.5, 5.3, 5.4
 */
export async function submitAnswer(
  sessionId: string,
  answer: Answer,
  language?: string,
  behavioralMetrics?: import('../types').BehavioralMetrics,
  proctoringParams?: {
    pasteOccurred?: boolean;
    tabSwitchesDuringAnswer?: number;
    proctoringEvents?: import('../types').ProctoringEvent[];
  }
): Promise<EvaluationResult> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  if (session.status !== 'in_progress') {
    throw new Error(`Session ${sessionId} is not in progress (status: ${session.status})`);
  }

  const question = session.questions.find((q) => q.id === answer.questionId);
  if (!question) throw new Error(`Question not found: ${answer.questionId}`);

  // Track proctoring events
  if (proctoringParams?.proctoringEvents && proctoringParams.proctoringEvents.length > 0) {
    if (!session.proctoringEvents) session.proctoringEvents = [];
    session.proctoringEvents.push(...proctoringParams.proctoringEvents);
  }

  // For non-English oral answers, translate back to English before keyword evaluation
  let contentForEvaluation = answer.content;
  if (language && language !== 'English' && question.type === 'oral' && session.roundType !== 'hr') {
    try {
      console.log(`[interviewService] Translating ${language} answer to English for evaluation...`);
      contentForEvaluation = await translateText(answer.content, 'English');
      console.log(`[interviewService] Translated answer: "${contentForEvaluation.substring(0, 80)}..."`);
    } catch (err) {
      console.warn('[interviewService] Answer translation failed, evaluating original:', err);
    }
  }

  // Evaluate the answer
  let evaluation: EvaluationResult;
  if (question.type === 'code_snippet') {
    evaluation = evaluateCodeAnswer(
      question.id,
      contentForEvaluation,
      question.expectedAnswer,
      question.language ?? 'javascript'
    );
  } else if (session.roundType === 'hr') {
    // HR round: behavioral evaluation — confidence, eye contact, fluency, tone
    // Use metrics from frontend if available, otherwise extract from transcription
    const metrics = behavioralMetrics ?? extractMetricsFromTranscription(
      answer.content,
      0 // duration unknown server-side without frontend metrics
    );
    evaluation = evaluateHRAnswer(question.id, answer.content, metrics);
  } else {
    // Technical / qualifying rounds: keyword matching
    const useFuzzyMatching = session.roundType === 'qualifying';
    evaluation = evaluateOralAnswer(
      question.id,
      contentForEvaluation,
      question.expectedKeywords,
      useFuzzyMatching
    );
  }

  // ── Strict Proctoring & AI Answer Integrity Layer ─────────────────────────
  try {
    const integrity = analyzeAnswerIntegrity({
      text: answer.content,
      type: question.type,
      pasteOccurred: proctoringParams?.pasteOccurred,
      tabSwitchesDuringAnswer: proctoringParams?.tabSwitchesDuringAnswer,
      wordCount: answer.content?.split(/\s+/).filter(Boolean).length,
    });
    evaluation.integrityAnalysis = integrity;
  } catch (integErr) {
    console.warn('[interviewService] Anti-cheat analysis error (continuing):', integErr);
  }

  // ── Linguistic Analysis Layer (What they say: filler words, vocabulary, summary)
  if (question.type === 'oral' && answer.content && answer.content.trim().length > 0) {
    try {
      const linguistic = await performLinguisticAnalysis({
        transcription: answer.content,
        language: language || 'en',
      });
      evaluation.linguisticAnalysis = linguistic;
    } catch (lingErr) {
      console.warn('[interviewService] Linguistic analysis error (continuing):', lingErr);
    }

    try {
      const prosody = analyzeProsody({
        transcription: answer.content,
        durationSec: behavioralMetrics?.recordingDurationSec,
        pauseCount: behavioralMetrics?.pauseCount,
        speakingPaceWpm: behavioralMetrics?.speakingPaceWpm,
      });
      evaluation.prosodyAnalysis = prosody;
    } catch (prosErr) {
      console.warn('[interviewService] Prosody analysis error (continuing):', prosErr);
    }

    try {
      const vision = analyzeVisionNonVerbal({
        behavioralMetrics,
        durationSec: behavioralMetrics?.recordingDurationSec,
      });
      evaluation.visionAnalysis = vision;
    } catch (visErr) {
      console.warn('[interviewService] Vision analysis error (continuing):', visErr);
    }
  }

  // Record answer and evaluation
  session.answers.push(answer);
  session.evaluations.push(evaluation);
  session.currentQuestionIndex += 1;

  // Update consecutive poor grade counter
  if (evaluation.grade === 'poor') {
    session.consecutivePoorGrades += 1;
  } else {
    session.consecutivePoorGrades = 0;
  }

  // Check three-strike termination
  if (shouldTerminateRound(session.evaluations)) {
    session.status = 'terminated';
  } else if (session.currentQuestionIndex >= session.questions.length) {
    session.status = 'completed';
  }

  return evaluation;
}


/**
 * Complete an interview session and return the round summary.
 *
 * If the session is still in_progress (caller explicitly ends it), it is
 * marked as completed.
 *
 * Requirements: 3.7, 5.6, 6.3, 6.4
 */
export function completeInterview(
  sessionId: string,
  confidenceAnalysis?: ConfidenceAnalysis
): { summary: RoundSummary; finalGrade: number } {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  if (session.status === 'in_progress') {
    session.status = 'completed';
  }

  if (confidenceAnalysis) {
    session.confidenceAnalysis = confidenceAnalysis;
  }

  const confidenceScore = confidenceAnalysis?.overallConfidenceScore;
  const overallGrade = computeRoundGrade(session.evaluations, confidenceScore);

  const summary: RoundSummary = {
    sessionId: session.id,
    roundType: session.roundType,
    totalQuestions: session.questions.length,
    answeredQuestions: session.answers.length,
    overallGrade,
    confidenceScore,
    status: session.status,
  };

  return { summary, finalGrade: overallGrade };
}

/**
 * Retrieve an active session by ID (read-only snapshot).
 */
export function getSession(sessionId: string): InterviewSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Associate a recording ID with a session in memory and SQLite DB.
 * Requirements: 8.2
 */
export function setRecordingId(sessionId: string, recordingId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.recordingId = recordingId;
  }
  pool.query(`UPDATE interview_sessions SET recording_id = $1 WHERE id = $2`, [recordingId, sessionId]).catch(() => {});
}


/**
 * Start an interview session using a pre-built question bank (no DB access).
 *
 * Used in tests and scenarios where the question bank is already available
 * in memory, bypassing the database fetch.
 *
 * Requirements: 3.1, 5.1, 6.1
 */
export function startInterviewWithBank(
  candidateId: string,
  jobRoleId: string,
  roundType: RoundType,
  questionBank: QuestionBankEntry[],
  matchedSkills: string[]
): InterviewSession {
  const questions = generateQuestionSet(questionBank, matchedSkills, roundType, DEFAULT_QUESTION_COUNT);

  const session: InterviewSession = {
    id: uuidv4(),
    candidateId,
    jobRoleId,
    track: 'TJI',
    roundType,
    status: 'in_progress',
    questions,
    answers: [],
    evaluations: [],
    recordingId: '',
    currentQuestionIndex: 0,
    consecutivePoorGrades: 0,
  };

  activeSessions.set(session.id, session);
  return session;
}

// ─── Session Persistence ──────────────────────────────────────────────────────

/**
 * Persist a completed or terminated session to the interview_sessions table.
 *
 * Writes all questions, answers, evaluations, confidence analysis, recording
 * ID, and final grade. Associates the recording ID with the session record.
 *
 * Requirements: 3.7, 5.6, 6.3, 8.2
 */
export async function persistSession(
  sessionId: string,
  finalGrade?: number
): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  if (session.status === 'in_progress') {
    throw new Error(`Cannot persist session ${sessionId}: still in progress`);
  }

  const confidenceScore = session.confidenceAnalysis?.overallConfidenceScore;
  const grade =
    finalGrade ??
    computeRoundGrade(session.evaluations, confidenceScore);

  // Generate session AntiCheat report
  const antiCheat = generateAntiCheatReport({
    events: session.proctoringEvents || [],
    evaluations: session.evaluations || [],
  });
  session.antiCheatReport = antiCheat;

  const mergedConfidenceAnalysis = {
    ...(session.confidenceAnalysis || {
      composureScore: 70,
      fillerWordCount: 0,
      fillerWords: [],
      overallConfidenceScore: 70,
    }),
    antiCheatReport: antiCheat,
  };

  await pool.query(
    `INSERT INTO interview_sessions
       (id, candidate_id, job_role_id, round_type, status,
        questions, answers, evaluations, confidence_analysis,
        recording_id, final_grade, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       status              = excluded.status,
       questions           = excluded.questions,
       answers             = excluded.answers,
       evaluations         = excluded.evaluations,
       confidence_analysis = excluded.confidence_analysis,
       recording_id        = COALESCE(excluded.recording_id, interview_sessions.recording_id),
       final_grade         = excluded.final_grade,
       completed_at        = excluded.completed_at`,
    [
      session.id,
      session.candidateId,
      session.jobRoleId,
      session.roundType,
      session.status,
      JSON.stringify(session.questions),
      JSON.stringify(session.answers),
      JSON.stringify(session.evaluations),
      JSON.stringify(mergedConfidenceAnalysis),
      session.recordingId || null,
      grade,
    ]
  );


  // Remove from in-memory store after successful persistence
  activeSessions.delete(sessionId);
}

/**
 * Load a persisted session from the database by session ID.
 * Useful for admin queries and re-hydrating sessions after a restart.
 *
 * Requirements: 3.7, 5.6
 */
export async function loadPersistedSession(sessionId: string): Promise<{
  id: string;
  candidateId: string;
  jobRoleId: string;
  roundType: RoundType;
  status: SessionStatus;
  questions: Question[];
  answers: Answer[];
  evaluations: EvaluationResult[];
  confidenceAnalysis: ConfidenceAnalysis | null;
  recordingId: string | null;
  finalGrade: number | null;
  startedAt: Date;
  completedAt: Date | null;
} | null> {
  const { rows } = await pool.query<{
    id: string;
    candidate_id: string;
    job_role_id: string;
    round_type: RoundType;
    status: SessionStatus;
    questions: Question[];
    answers: Answer[];
    evaluations: EvaluationResult[];
    confidence_analysis: ConfidenceAnalysis | null;
    recording_id: string | null;
    final_grade: string | null;
    started_at: Date;
    completed_at: Date | null;
  }>(
    `SELECT id, candidate_id, job_role_id, round_type, status,
            questions, answers, evaluations, confidence_analysis,
            recording_id, final_grade, started_at, completed_at
     FROM interview_sessions
     WHERE id = $1`,
    [sessionId]
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: r.id,
    candidateId: r.candidate_id,
    jobRoleId: r.job_role_id,
    roundType: r.round_type,
    status: r.status,
    questions: r.questions,
    answers: r.answers,
    evaluations: r.evaluations,
    confidenceAnalysis: r.confidence_analysis,
    recordingId: r.recording_id,
    finalGrade: r.final_grade !== null ? parseFloat(r.final_grade) : null,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  };
}
