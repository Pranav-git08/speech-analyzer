// ─── Resume Types ────────────────────────────────────────────────────────────

export interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface Project {
  title: string;
  description: string;
  technologies: string[];
}

export interface ResumeData {
  name: string;
  phone: string;
  email: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
}

// ─── Job Role Types ───────────────────────────────────────────────────────────

export type Track = 'TJI' | 'NTJI';

export interface JobRole {
  id: string;
  name: string;
  track: Track;
  requiredSkills: string[];
  questionBankId: string;
}

// ─── Question Types ───────────────────────────────────────────────────────────

export type QuestionType = 'oral' | 'code_snippet';
export type RoundType = 'technical' | 'qualifying' | 'hr';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  skill: string;
  expectedAnswer: string;
  expectedKeywords: string[];
  codeTemplate?: string;
  language?: string;
}

// ─── Answer Types ─────────────────────────────────────────────────────────────

export interface Answer {
  questionId: string;
  candidateId: string;
  type: QuestionType;
  content: string;
  timestamp: Date;
}

// ─── Evaluation Types ─────────────────────────────────────────────────────────

export type Grade = 'pass' | 'poor';

// Behavioral metrics collected by the frontend during HR round recording
export interface BehavioralMetrics {
  recordingDurationSec: number;   // how long the candidate spoke
  wordCount: number;               // words in transcription
  fillerWordCount: number;         // um, uh, like, you know, etc.
  fillerWords: string[];           // list of detected filler words
  eyeContactPercent: number;       // 0–100: % of frames face was detected looking forward
  pauseCount: number;              // number of significant pauses (>1s silence)
  speakingPaceWpm: number;         // words per minute
  avgConfidenceScore: number;      // 0–100: composure score from face frames (if available)
}

// ─── Linguistic Analysis (What They Say: AssemblyAI / Whisper / NLP) ─────────

export type LinguisticProvider = 'assemblyai' | 'whisper' | 'local_nlp';
export type FillerCategory = 'hesitation' | 'crutch' | 'discourse';

export interface FillerWordOccurrence {
  word: string;
  count: number;
  category: FillerCategory;
  timestampsMs?: number[];
}

export interface LinguisticAnalysis {
  provider: LinguisticProvider;
  transcript: string;
  summary: string;                  // Concise summary of what the candidate said
  keyPoints: string[];              // Key takeaways / points
  topics?: string[];                // Main topics identified
  fillerWordAnalysis: {
    totalCount: number;
    frequencyPercent: number;       // % of total words that are fillers
    severity: 'low' | 'moderate' | 'high'; // low < 2%, moderate 2-5%, high > 5%
    breakdown: FillerWordOccurrence[];
  };
  vocabularyMetrics: {
    totalWords: number;
    uniqueWords: number;
    lexicalDiversity: number;       // 0–100 (Type-Token Ratio %)
    complexityRating: 'basic' | 'proficient' | 'advanced';
    averageWordLength: number;
  };
  sentimentAndTone: {
    sentiment: 'positive' | 'neutral' | 'negative' | 'confident' | 'hesitant';
    confidenceToneScore: number;    // 0–100
    dominantTone: string;
  };
  clarityScore: number;             // 0–100
  recommendations: string[];        // Actionable speaking recommendations
}

export interface EvaluationResult {
  questionId: string;
  grade: Grade;
  score: number; // 0–100
  matchedKeywords: string[];
  feedback: string;
  // HR-only behavioral breakdown
  behavioralMetrics?: BehavioralMetrics;
  behavioralBreakdown?: {
    eyeContactScore: number;      // 0–100
    fluencyScore: number;         // 0–100 (filler words, pace)
    confidenceScore: number;      // 0–100 (composure + posture signals)
    contentScore: number;         // 0–100 (answer completeness / length)
  };
  // Linguistic Analysis layer (What they say)
  linguisticAnalysis?: LinguisticAnalysis;
  // Acoustic & Prosody Analysis layer (How they speak)
  prosodyAnalysis?: ProsodyAnalysis;
  // Vision & Non-verbal presence layer
  visionAnalysis?: VisionNonVerbalAnalysis;
  // Anti-Cheat & Strict Proctoring Integrity layer
  integrityAnalysis?: AnswerIntegrityAnalysis;
}



// ─── Confidence / AI Analysis Types ──────────────────────────────────────────

export type ComposureState = 'composed' | 'slightly_positive' | 'neutral' | 'distressed';

export interface ConfidenceAnalysis {
  composureScore: number;       // 0–100
  fillerWordCount: number;
  fillerWords: string[];
  overallConfidenceScore: number; // 0–100
}

// ─── Recording Types ──────────────────────────────────────────────────────────

export interface RecordingMetadata {
  candidateId: string;
  sessionId: string;
  jobRoleId: string;
  roundType: RoundType;
  startTime: Date;
  endTime: Date;
  storageUrl: string;
}

// ─── Interview Session Types ──────────────────────────────────────────────────

export type SessionStatus = 'in_progress' | 'completed' | 'terminated';

export interface InterviewSession {
  id: string;
  candidateId: string;
  jobRoleId: string;
  track: Track;
  roundType: RoundType;
  status: SessionStatus;
  questions: Question[];
  answers: Answer[];
  evaluations: EvaluationResult[];
  confidenceAnalysis?: ConfidenceAnalysis;
  linguisticAnalysis?: LinguisticAnalysis;
  prosodyAnalysis?: ProsodyAnalysis;
  visionAnalysis?: VisionNonVerbalAnalysis;
  proctoringEvents?: ProctoringEvent[];
  antiCheatReport?: AntiCheatReport;
  recordingId: string;
  currentQuestionIndex: number;
  consecutivePoorGrades: number;
}




// ─── Round Summary ────────────────────────────────────────────────────────────

export interface RoundSummary {
  sessionId: string;
  roundType: RoundType;
  totalQuestions: number;
  answeredQuestions: number;
  overallGrade: number;
  confidenceScore?: number;
  status: SessionStatus;
}

// ─── Candidate Types ──────────────────────────────────────────────────────────

export type CandidateStatus =
  | 'pending_initial'
  | 'pending_hr'
  | 'approved'
  | 'rejected';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeData: ResumeData;
  jobRoleId: string;
  track: Track;
  uniqueCode?: string;
  status: CandidateStatus;
  createdAt: Date;
}

// ─── Skill Match Types ────────────────────────────────────────────────────────

export interface SkillMatchResult {
  matched: string[];
  isEligible: boolean;
}

// ─── Full AI Integrations Suite Types ─────────────────────────────────────────

export interface ProsodyPitchMetrics {
  meanHz: number;
  minHz: number;
  maxHz: number;
  varianceHz: number;
  monotoneScore: number; // 0-100 (higher = more monotone)
  expressiveness: 'monotone' | 'moderate' | 'dynamic';
}

export interface ProsodyPacingMetrics {
  wordsPerMin: number;
  syllablesPerSec: number;
  speakingDurationSec: number;
  silentPauseSec: number;
  pauseRatio: number; // 0-1 (silent pause / total duration)
  pacingRating: 'slow' | 'ideal' | 'rushed';
}

export interface ProsodyEnergyMetrics {
  meanDb: number;
  varianceDb: number;
  vocalStrainScore: number; // 0-100
  stability: 'stable' | 'variable' | 'fluctuating';
}

export interface ProsodyEmotionMetrics {
  dominantEmotion: 'confident' | 'calm' | 'stressed' | 'anxious' | 'enthusiastic';
  stressIndex: number; // 0-100
  confidenceProsodyScore: number; // 0-100
}

export interface ProsodyAnalysis {
  pitch: ProsodyPitchMetrics;
  pacing: ProsodyPacingMetrics;
  energy: ProsodyEnergyMetrics;
  emotion: ProsodyEmotionMetrics;
  overallProsodyScore: number; // 0-100
  prosodyGrade: 'good' | 'average' | 'needs_work';
  recommendations: string[];
}

export interface VisionExpressionMetrics {
  smilePercent: number;
  focusedPercent: number;
  neutralPercent: number;
  nervousPercent: number;
  confusedPercent: number;
  dominantExpression: 'focused' | 'smiling' | 'neutral' | 'nervous' | 'confused';
}

export interface VisionEyeContactMetrics {
  eyeContactPercent: number;
  gazeDriftCount: number;
  gazeStabilityScore: number;
  rating: 'excellent' | 'adequate' | 'poor';
}

export interface VisionPostureMetrics {
  postureScore: number;
  postureType: 'upright' | 'slouching' | 'leaning';
  headMovementStability: number;
  nodCount: number;
}

export interface VisionFidgetingMetrics {
  fidgetingTickCount: number;
  handNearFaceCount: number;
  composureRating: 'high' | 'moderate' | 'low';
}

export interface VisionNonVerbalAnalysis {
  expressions: VisionExpressionMetrics;
  eyeContact: VisionEyeContactMetrics;
  posture: VisionPostureMetrics;
  fidgeting: VisionFidgetingMetrics;
  overallNonVerbalScore: number; // 0-100
  recommendations: string[];
}

export interface CandidateSWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  semanticMatchScore: number;
  experienceConsistency: number;
}

export type HiringRecommendation =
  | 'strong_hire'
  | 'hire'
  | 'leaning_hire'
  | 'borderline'
  | 'do_not_hire';

export interface CompetencyRadarScores {
  technicalAcumen: number;
  communicationFluency: number;
  emotionalPoise: number;
  nonVerbalPresence: number;
  problemSolving: number;
  overallIndex: number;
}

export interface CandidateIntelligenceDossier {
  candidateId: string;
  candidateName: string;
  jobRoleName: string;
  overallHiringDecision: HiringRecommendation;
  decisionConfidence: number;
  executiveSummaryMemo: string;
  radarScores: CompetencyRadarScores;
  swot: CandidateSWOTAnalysis;
  strengthsAndHighlights: string[];
  areasForDevelopment: string[];
  candidateFeedbackLetter: string;
  generatedAt: string;
}

export interface AdaptiveFollowUpPrompt {
  originalQuestion: string;
  candidateAnswer: string;
  followUpQuestion: string;
  probeType: 'clarification' | 'deep_dive' | 'edge_case' | 'architecture';
  difficulty: 'standard' | 'advanced';
}

// ─── Strict Proctoring & Anti-Cheat AI Types ─────────────────────────────────

export type ProctoringEventType =
  | 'tab_switch'
  | 'window_blur'
  | 'copy_paste'
  | 'fullscreen_exit'
  | 'keyboard_shortcut'
  | 'multiple_faces'
  | 'multiple_people'
  | 'side_face_turn'
  | 'no_face'
  | 'off_screen_gaze'
  | 'looking_down_phone'
  | 'reading_notebook';

export interface ProctoringEvent {
  id: string;
  timestamp: string;
  type: ProctoringEventType;
  severity: 'low' | 'medium' | 'high';
  details: string;
}

export interface AnswerIntegrityAnalysis {
  aiGeneratedProbability: number; // 0–100%
  isLikelyAIGenerated: boolean;
  isLikelyWebSearched: boolean;
  suspectedSource: 'chatgpt' | 'claude_or_gemini' | 'google_search_snippet' | 'stackoverflow' | 'natural_human';
  burstinessScore: number;         // Variation in sentence lengths (low = AI, high = Human)
  perplexityScore: number;         // Unpredictability of word sequences
  detectedAIPatterns: string[];    // Hallmark phrases found
  detectedSearchPatterns: string[];
  pasteIncident: boolean;
  integrityScore: number;          // 0–100 (100 = completely authentic)
  confidenceRating: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface AntiCheatReport {
  overallIntegrityScore: number;   // 0–100
  overallRiskLevel: 'clean' | 'low_risk' | 'suspicious' | 'high_risk';
  averageAIProbability: number;    // e.g. 78%
  tabSwitchCount: number;
  windowBlurDurationSec: number;
  pasteCount: number;
  totalViolations: number;
  suspectedTools: string[];        // ['ChatGPT / LLM', 'Google Search', 'External Notes']
  events: ProctoringEvent[];
  questionIntegritySummaries: Array<{
    questionId: string;
    aiProbability: number;
    integrityScore: number;
    suspectedSource: string;
    flags: string[];
  }>;
  executiveSummary: string;
  malpracticeDetected?: boolean;
  malpracticeReasons?: string[];
  phoneUsageDetected?: boolean;
  notebookReadingDetected?: boolean;
  secondPersonDetected?: boolean;
  googleSearchDetected?: boolean;
  clipboardPasteDetected?: boolean;
}



