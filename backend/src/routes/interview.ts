import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { matchSkills } from '../services/skillMatcher';
import {
  startInterview,
  getNextQuestion,
  submitAnswer,
  completeInterview,
  persistSession,
  getSession,
} from '../services/interviewService';
import { transcribeAudio } from '../services/aiAnalysisService';
import { performLinguisticAnalysis } from '../services/linguisticService';
import { analyzeProsody } from '../services/prosodyService';
import { generateAdaptiveFollowUp, generatePracticeHint } from '../services/generativeInterviewService';
import { generateGDCode } from '../services/notificationService';
import { Answer, RoundType, ConfidenceAnalysis } from '../types';



import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/interview/start
 * Start a new interview session for a candidate.
 *
 * Body: { candidateId, jobRoleId, roundType, language? }
 * Requirements: 3.1, 5.1, 6.1
 */
router.post('/start', async (req: Request, res: Response) => {
  const { candidateId, jobRoleId, roundType, language, matchedSkills } = req.body as {
    candidateId?: string;
    jobRoleId?: string;
    roundType?: string;
    language?: string;
    matchedSkills?: string[];
  };

  if (!candidateId || !jobRoleId || !roundType) {
    res.status(400).json({ error: 'candidateId, jobRoleId, and roundType are required.' });
    return;
  }

  const validRoundTypes: RoundType[] = ['technical', 'qualifying', 'hr'];
  if (!validRoundTypes.includes(roundType as RoundType)) {
    res.status(400).json({ error: `roundType must be one of: ${validRoundTypes.join(', ')}.` });
    return;
  }

  try {
    const session = await startInterview(candidateId, jobRoleId, roundType as RoundType, matchedSkills, language);
    res.status(201).json({ sessionId: session.id, status: session.status });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      console.error('POST /api/interview/start error:', err);
      res.status(500).json({ error: 'Failed to start interview session.' });
    }
  }
});

/**
 * GET /api/interview/question?sessionId=...
 * Fetch the next question for an active session.
 * Requirements: 3.1, 5.1
 */
router.get('/question', (req: Request, res: Response) => {
  const { sessionId } = req.query as { sessionId?: string };

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId query parameter is required.' });
    return;
  }

  const question = getNextQuestion(sessionId);

  if (question === null) {
    res.status(404).json({ error: 'No more questions or session is not in progress.' });
    return;
  }

  // Do not expose expectedAnswer / expectedKeywords to the candidate
  const { expectedAnswer: _ea, expectedKeywords: _ek, ...safeQuestion } = question;
  res.json({ question: safeQuestion });
});

/**
 * POST /api/interview/answer
 * Submit an answer for the current question.
 *
 * Body: { sessionId, questionId, content, type, language? }
 * Requirements: 3.3, 3.4, 3.5, 5.3, 5.4
 */
router.post('/answer', async (req: Request, res: Response) => {
  const {
    sessionId,
    questionId,
    content,
    type,
    language,
    behavioralMetrics,
    pasteOccurred,
    tabSwitchesDuringAnswer,
    proctoringEvents,
  } = req.body as {
    sessionId?: string;
    questionId?: string;
    content?: string;
    type?: string;
    language?: string;
    behavioralMetrics?: import('../types').BehavioralMetrics;
    pasteOccurred?: boolean;
    tabSwitchesDuringAnswer?: number;
    proctoringEvents?: import('../types').ProctoringEvent[];
  };

  if (!sessionId || !questionId || content === undefined || !type) {
    res.status(400).json({ error: 'sessionId, questionId, content, and type are required.' });
    return;
  }

  if (type !== 'oral' && type !== 'code_snippet') {
    res.status(400).json({ error: 'type must be "oral" or "code_snippet".' });
    return;
  }

  const answer: Answer = {
    questionId,
    candidateId: '',   // resolved inside submitAnswer via session
    type: type as 'oral' | 'code_snippet',
    content,
    timestamp: new Date(),
  };

  try {
    const evaluation = await submitAnswer(
      sessionId,
      answer,
      language,
      behavioralMetrics,
      {
        pasteOccurred,
        tabSwitchesDuringAnswer,
        proctoringEvents,
      }
    );
    
    // Check if session was terminated after this answer
    const session = getSession(sessionId);
    const sessionStatus = session?.status || 'in_progress';
    
    res.json({ evaluation, sessionStatus });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('not in progress')) {
      res.status(409).json({ error: message });
    } else {
      console.error('POST /api/interview/answer error:', err);
      res.status(500).json({ error: 'Failed to submit answer.' });
    }
  }
});

/**
 * POST /api/interview/complete
 * Complete an interview session and persist the summary.
 *
 * Body: { sessionId, confidenceAnalysis? }
 * Requirements: 3.7, 5.6, 6.3, 6.4
 */
router.post('/complete', async (req: Request, res: Response) => {
  const { sessionId, confidenceAnalysis } = req.body as {
    sessionId?: string;
    confidenceAnalysis?: ConfidenceAnalysis;
  };

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required.' });
    return;
  }

  try {
    const { summary, finalGrade } = completeInterview(sessionId, confidenceAnalysis);
    await persistSession(sessionId, finalGrade);

    let passed = false;
    let message = 'You have completed the interview session.';

    const sessionObj = await pool.query<{ candidate_id: string }>(
      'SELECT candidate_id FROM interview_sessions WHERE id = $1',
      [sessionId]
    );
    const candId = sessionObj.rows[0]?.candidate_id;

    if (summary.roundType === 'technical' || summary.roundType === 'qualifying') {
      if (finalGrade >= 60 && candId) {
        passed = true;
        await pool.query(
          `UPDATE candidates 
           SET status = 'pending_initial'
           WHERE id = $1`,
          [candId]
        );
        message = `🎉 Congratulations! You cleared Round 1 with a grade of ${finalGrade.toFixed(1)}%. Your profile is now under Admin Review. Upon approval, your distinct HR Code will be issued to attend the Executive HR Round.`;
      } else if (candId) {
        await pool.query(`UPDATE candidates SET status = 'rejected' WHERE id = $1`, [candId]);
        message = `Thank you for completing the interview. Your score (${finalGrade.toFixed(1)}%) did not meet the 60% qualifying threshold.`;
      }
    } else if (summary.roundType === 'hr') {
      if (finalGrade >= 60 && candId) {
        passed = true;
        message = `🎉 Congratulations! You completed the Executive HR Round with a grade of ${finalGrade.toFixed(1)}%. The hiring committee will dispatch your final result shortly.`;
      } else if (candId) {
        message = `Thank you for completing the Executive HR Round. Your results are under final committee evaluation.`;
      }
    }

    res.json({
      summary,
      finalGrade,
      passed,
      message,
    });


  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      console.error('POST /api/interview/complete error:', err);
      res.status(500).json({ error: 'Failed to complete interview session.' });
    }
  }
});

/**
 * POST /api/interview/transcribe
 * Transcribe audio recording using STT service.
 *
 * Body: FormData with 'audio' file and optional 'language' field (e.g. 'hi-IN')
 * Returns: { transcription: string }
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Audio file is required.' });
      return;
    }

    const language = (req.body as { language?: string }).language || 'en';

    // Convert buffer to Blob
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    const transcription = await transcribeAudio(audioBlob, language);

    res.json({ transcription: transcription || '' });
  } catch (err) {
    console.error('POST /api/interview/transcribe error:', err);
    res.json({ transcription: '' });
  }
});


/**
 * GET /api/interview/tts
 * Generate and stream high quality native speech audio for the question in any language.
 * Query: text, language
 */
router.get('/tts', async (req: Request, res: Response) => {

  const { text, language } = req.query as { text?: string; language?: string };

  if (!text || !text.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const LANG_CODE_MAP: Record<string, string> = {
    'Hindi':   'hi',
    'Kannada': 'kn',
    'Telugu':  'te',
    'English': 'en',
    'hi-IN':   'hi',
    'kn-IN':   'kn',
    'te-IN':   'te',
    'en-US':   'en',
  };

  const tl = LANG_CODE_MAP[language || 'English'] || 'en';

  try {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(text.trim())}`;
    const ttsRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*',
      },
    });

    if (!ttsRes.ok) {
      throw new Error(`Google TTS failed with status: ${ttsRes.status}`);
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });

    res.send(buffer);
  } catch (err) {
    console.error('GET /api/interview/tts error:', err);
    res.status(500).json({ error: 'Failed to generate speech audio' });
  }
});

/**
 * POST /api/interview/linguistic-analysis
 * Perform deep linguistic analysis on audio file or text transcript.
 * Powered by AssemblyAI / Whisper / NLP.
 */
router.post('/linguistic-analysis', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const text = req.body.text as string | undefined;
    const language = (req.body.language as string) || 'English';
    const audioBuffer = req.file ? req.file.buffer : undefined;
    const mimeType = req.file ? req.file.mimetype : 'audio/webm';

    let transcription = text;
    if (!transcription && audioBuffer) {
      const blob = new Blob([audioBuffer], { type: mimeType });
      transcription = await transcribeAudio(blob, language);
    }

    const analysis = await performLinguisticAnalysis({
      audioBuffer,
      mimeType,
      transcription: transcription || '',
      language,
    });

    res.json({ analysis });
  } catch (err) {
    console.error('POST /api/interview/linguistic-analysis error:', err);
    res.status(500).json({ error: 'Failed to perform linguistic analysis' });
  }
});

/**
 * POST /api/interview/prosody-analysis
 * Acoustic & prosody extraction for vocal pitch, pacing, and stress.
 */
router.post('/prosody-analysis', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const transcription = (req.body.text as string) || '';
    const durationSec = req.body.durationSec ? parseFloat(req.body.durationSec as string) : undefined;
    const pauseCount = req.body.pauseCount ? parseInt(req.body.pauseCount as string, 10) : undefined;
    const speakingPaceWpm = req.body.speakingPaceWpm ? parseInt(req.body.speakingPaceWpm as string, 10) : undefined;
    const audioBuffer = req.file ? req.file.buffer : undefined;

    const analysis = analyzeProsody({
      transcription,
      durationSec,
      audioBuffer,
      pauseCount,
      speakingPaceWpm,
    });

    res.json({ analysis });
  } catch (err) {
    console.error('POST /api/interview/prosody-analysis error:', err);
    res.status(500).json({ error: 'Failed to perform prosody analysis' });
  }
});

/**
 * POST /api/interview/generate-follow-up
 * Dynamic AI adaptive probing question based on candidate response.
 */
router.post('/generate-follow-up', async (req: Request, res: Response) => {
  try {
    const { questionText, candidateAnswer, jobRoleName, skill } = req.body as {
      questionText?: string;
      candidateAnswer?: string;
      jobRoleName?: string;
      skill?: string;
    };

    if (!questionText || !candidateAnswer) {
      res.status(400).json({ error: 'questionText and candidateAnswer are required.' });
      return;
    }

    const followUp = await generateAdaptiveFollowUp({
      questionText,
      candidateAnswer,
      jobRoleName,
      skill,
    });

    res.json({ followUp });
  } catch (err) {
    console.error('POST /api/interview/generate-follow-up error:', err);
    res.status(500).json({ error: 'Failed to generate follow-up question' });
  }
});

/**
 * GET /api/interview/practice-hint
 * Generate instant smart practice hint for questions.
 */
router.get('/practice-hint', (req: Request, res: Response) => {
  const { questionText, skill } = req.query as { questionText?: string; skill?: string };
  if (!questionText) {
    res.status(400).json({ error: 'questionText is required' });
    return;
  }
  const hint = generatePracticeHint(questionText, skill || 'General');
  res.json({ hint });
});

export default router;



