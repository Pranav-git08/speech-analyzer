import { EvaluationResult, Grade, BehavioralMetrics } from '../types';

const PASS_THRESHOLD = 50; // score >= 50 → pass

// Filler words to detect in transcription
const FILLER_WORDS = [
  'umm', 'um', 'uh', 'ah', 'er', 'like', 'you know', 'i mean',
  'basically', 'literally', 'actually', 'so', 'right', 'okay', 'well',
  'kind of', 'sort of', 'you see',
];

/**
 * Normalise a keyword for comparison: lowercase and trim whitespace.
 */
function normalise(word: string): string {
  return word.toLowerCase().trim();
}

/**
 * Evaluate an oral answer using keyword matching.
 *
 * Score = (matchedKeywords.length / expectedKeywords.length) * 100
 * Grade = 'pass' when score >= 50, 'poor' when score < 50
 *
 * For HR-style questions, uses fuzzy matching (substring) to be more lenient.
 * For technical questions, uses exact word matching.
 *
 * Requirements: 3.3, 5.3, 10.2, 10.4, 10.5
 */
export function evaluateOralAnswer(
  questionId: string,
  answer: string,
  expectedKeywords: string[],
  useFuzzyMatching: boolean = false
): EvaluationResult {
  if (expectedKeywords.length === 0) {
    return {
      questionId,
      grade: 'pass',
      score: 100,
      matchedKeywords: [],
      feedback: 'Answer accepted. No specific keywords required for this question.',
    };
  }

  const normAnswer = normalise(answer);
  let matchedKeywords: string[];

  if (useFuzzyMatching) {
    // For HR rounds: use substring matching (more lenient)
    // Keywords like "experience" will match phrases like "I have experience in"
    matchedKeywords = expectedKeywords.filter((kw) => {
      const normKw = normalise(kw);
      return normAnswer.includes(normKw);
    });
  } else {
    // For technical rounds: use exact word matching
    const answerWords = new Set(normAnswer.split(/\s+/).filter((w) => w.length > 0));
    matchedKeywords = expectedKeywords.filter((kw) =>
      answerWords.has(normalise(kw))
    );
  }

  const score = (matchedKeywords.length / expectedKeywords.length) * 100;
  const grade: Grade = score >= PASS_THRESHOLD ? 'pass' : 'poor';

  return {
    questionId,
    grade,
    score,
    matchedKeywords,
    feedback:
      grade === 'pass'
        ? `Good answer. Matched ${matchedKeywords.length} of ${expectedKeywords.length} keywords.`
        : `Needs improvement. Matched only ${matchedKeywords.length} of ${expectedKeywords.length} keywords.`,
  };
}

/**
 * Determine whether the round should be terminated due to three consecutive
 * poor grades.
 *
 * Returns true when the last 3 evaluations all have grade 'poor'.
 *
 * Requirements: 3.5, 5.4
 */
export function shouldTerminateRound(evaluations: EvaluationResult[]): boolean {
  if (evaluations.length < 3) return false;
  const last3 = evaluations.slice(-3);
  return last3.every((e) => e.grade === 'poor');
}

/**
 * Evaluate an HR round answer based on behavioral signals:
 * eye contact, fluency (filler words + pace), confidence (composure),
 * and content completeness (answer length).
 *
 * Does NOT use keyword matching — measures HOW the candidate answers,
 * not just WHAT they say.
 */
export function evaluateHRAnswer(
  questionId: string,
  transcription: string,
  metrics: BehavioralMetrics
): EvaluationResult {
  const words = transcription.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // ── 1. Eye Contact Score (0–100) ─────────────────────────────────────────
  // Based on % of recording time face was detected looking forward
  const eyeContactScore = Math.min(100, Math.max(0, metrics.eyeContactPercent));

  // ── 2. Fluency Score (0–100) ──────────────────────────────────────────────
  // Penalise filler words and irregular pace
  // Ideal pace: 120–160 wpm. Too fast (>180) or too slow (<80) penalised.
  const fillerRatio = wordCount > 0 ? metrics.fillerWordCount / wordCount : 0;
  const fillerPenalty = Math.min(40, fillerRatio * 200); // up to 40 pts penalty

  let pacePenalty = 0;
  if (metrics.speakingPaceWpm > 0) {
    if (metrics.speakingPaceWpm > 180) pacePenalty = 10;
    else if (metrics.speakingPaceWpm < 80) pacePenalty = 15;
  }

  const pausePenalty = Math.min(15, metrics.pauseCount * 3); // 3 pts per long pause, max 15
  const fluencyScore = Math.max(0, 100 - fillerPenalty - pacePenalty - pausePenalty);

  // ── 3. Confidence Score (0–100) ───────────────────────────────────────────
  // Based on facial composure analysis from video frames
  const confidenceScore = Math.min(100, Math.max(0, metrics.avgConfidenceScore));

  // ── 4. Content Score (0–100) ──────────────────────────────────────────────
  // Reward complete, substantive answers. Penalise too short or too long.
  let contentScore: number;
  if (wordCount < 10) {
    contentScore = 20; // too short — barely answered
  } else if (wordCount < 30) {
    contentScore = 50; // brief answer
  } else if (wordCount <= 150) {
    contentScore = 80 + Math.min(20, (wordCount - 30) / 6); // ideal range
  } else {
    contentScore = Math.max(60, 100 - (wordCount - 150) / 10); // too verbose, slight penalty
  }

  // ── Weighted Overall Score ────────────────────────────────────────────────
  // Eye contact: 25%, Fluency: 25%, Confidence: 30%, Content: 20%
  const overallScore = Math.round(
    eyeContactScore * 0.25 +
    fluencyScore * 0.25 +
    confidenceScore * 0.30 +
    contentScore * 0.20
  );

  const grade: Grade = overallScore >= PASS_THRESHOLD ? 'pass' : 'poor';

  // ── Feedback ──────────────────────────────────────────────────────────────
  const feedbackParts: string[] = [];

  if (eyeContactScore < 40) feedbackParts.push('Maintain better eye contact with the camera.');
  else if (eyeContactScore >= 70) feedbackParts.push('Good eye contact.');

  if (fluencyScore < 50) feedbackParts.push(`Work on reducing filler words (${metrics.fillerWordCount} detected).`);
  else if (fluencyScore >= 75) feedbackParts.push('Fluent and clear speech.');

  if (confidenceScore < 40) feedbackParts.push('Try to appear more composed and confident.');
  else if (confidenceScore >= 70) feedbackParts.push('Strong confident presence.');

  if (wordCount < 20) feedbackParts.push('Give more detailed answers.');
  else if (contentScore >= 70) feedbackParts.push('Well-developed answer.');

  const feedback = feedbackParts.length > 0
    ? feedbackParts.join(' ')
    : grade === 'pass'
      ? 'Good overall performance in this answer.'
      : 'Focus on eye contact, fluency and confident delivery.';

  return {
    questionId,
    grade,
    score: overallScore,
    matchedKeywords: [],
    feedback,
    behavioralMetrics: metrics,
    behavioralBreakdown: {
      eyeContactScore: Math.round(eyeContactScore),
      fluencyScore: Math.round(fluencyScore),
      confidenceScore: Math.round(confidenceScore),
      contentScore: Math.round(contentScore),
    },
  };
}

/**
 * Collect behavioral metrics from a transcription and recording metadata.
 * Used server-side when metrics aren't available from the frontend.
 */
export function extractMetricsFromTranscription(
  transcription: string,
  durationSec: number
): BehavioralMetrics {
  const words = transcription.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const text = transcription.toLowerCase();

  // Count filler words
  const detectedFillers: string[] = [];
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) detectedFillers.push(...matches.map((m) => m.toLowerCase()));
  }

  const speakingPaceWpm = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;

  return {
    recordingDurationSec: durationSec,
    wordCount,
    fillerWordCount: detectedFillers.length,
    fillerWords: detectedFillers,
    eyeContactPercent: 60,   // default neutral when no video data
    pauseCount: 0,
    speakingPaceWpm,
    avgConfidenceScore: 60,  // default neutral
  };
}

/**
 * Evaluate a code snippet answer using simple string-normalised comparison.
 *
 * Strips whitespace and compares the submitted code against the expected
 * solution. Returns a pass when they match, poor otherwise.
 *
 * Requirements: 3.4, 10.3
 */
export function evaluateCodeAnswer(
  questionId: string,
  code: string,
  expectedSolution: string,
  _language: string
): EvaluationResult {
  const normaliseCode = (src: string) =>
    src.replace(/\s+/g, ' ').trim().toLowerCase();

  const normCode = normaliseCode(code);
  const normExpected = normaliseCode(expectedSolution);

  const isMatch = normCode === normExpected;
  const score = isMatch ? 100 : 0;
  const grade: Grade = isMatch ? 'pass' : 'poor';

  return {
    questionId,
    grade,
    score,
    matchedKeywords: [],
    feedback: isMatch
      ? 'Code matches the expected solution.'
      : 'Code does not match the expected solution.',
  };
}

