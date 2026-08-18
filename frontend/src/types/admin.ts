// Admin dashboard types

export type CandidateStatus = 'pending_initial' | 'pending_gd' | 'pending_hr' | 'approved' | 'rejected';
export type Track = 'TJI' | 'NTJI';

export interface ExperienceSummary {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface ProjectSummary {
  title: string;
  description: string;
  technologies: string[];
}

export interface ResumeDataSummary {
  name: string;
  phone: string;
  email: string;
  skills: string[];
  experience: ExperienceSummary[];
  projects: ProjectSummary[];
}

export interface BehavioralMetricsSummary {
  recordingDurationSec: number;
  wordCount: number;
  fillerWordCount: number;
  fillerWords: string[];
  eyeContactPercent: number;
  pauseCount: number;
  speakingPaceWpm: number;
  avgConfidenceScore: number;
}

export interface BehavioralBreakdownSummary {
  eyeContactScore: number;
  fluencyScore: number;
  confidenceScore: number;
  contentScore: number;
}

export interface CandidateSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobRoleId: string;
  jobRoleName: string;
  track: Track;
  uniqueCode: string | null;
  gdCode?: string | null;
  hrCode?: string | null;
  gdScore?: number | null;
  status: CandidateStatus;
  createdAt: string;
  overallGrade: number | null;
  isPassing: boolean;
}


export interface QuestionSummary {
  id: string;
  type: 'oral' | 'code_snippet';
  text: string;
  skill: string;
}

export interface AnswerSummary {
  questionId: string;
  content: string;
}

export interface FillerWordOccurrenceSummary {
  word: string;
  count: number;
  category: 'hesitation' | 'crutch' | 'discourse';
  timestampsMs?: number[];
}

export interface LinguisticAnalysisSummary {
  provider: 'assemblyai' | 'whisper' | 'local_nlp';
  transcript: string;
  summary: string;
  keyPoints: string[];
  topics?: string[];
  fillerWordAnalysis: {
    totalCount: number;
    frequencyPercent: number;
    severity: 'low' | 'moderate' | 'high';
    breakdown: FillerWordOccurrenceSummary[];
  };
  vocabularyMetrics: {
    totalWords: number;
    uniqueWords: number;
    lexicalDiversity: number;
    complexityRating: 'basic' | 'proficient' | 'advanced';
    averageWordLength: number;
  };
  sentimentAndTone: {
    sentiment: 'positive' | 'neutral' | 'negative' | 'confident' | 'hesitant';
    confidenceToneScore: number;
    dominantTone: string;
  };
  clarityScore: number;
  recommendations: string[];
}

export interface ProsodyPitchMetricsSummary {
  meanHz: number;
  minHz: number;
  maxHz: number;
  varianceHz: number;
  monotoneScore: number;
  expressiveness: 'monotone' | 'moderate' | 'dynamic';
}

export interface ProsodyPacingMetricsSummary {
  wordsPerMin: number;
  syllablesPerSec: number;
  speakingDurationSec: number;
  silentPauseSec: number;
  pauseRatio: number;
  pacingRating: 'slow' | 'ideal' | 'rushed';
}

export interface ProsodyEnergyMetricsSummary {
  meanDb: number;
  varianceDb: number;
  vocalStrainScore: number;
  stability: 'stable' | 'variable' | 'fluctuating';
}

export interface ProsodyEmotionMetricsSummary {
  dominantEmotion: 'confident' | 'calm' | 'stressed' | 'anxious' | 'enthusiastic';
  stressIndex: number;
  confidenceProsodyScore: number;
}

export interface ProsodyAnalysisSummary {
  pitch: ProsodyPitchMetricsSummary;
  pacing: ProsodyPacingMetricsSummary;
  energy: ProsodyEnergyMetricsSummary;
  emotion: ProsodyEmotionMetricsSummary;
  overallProsodyScore: number;
  prosodyGrade: 'good' | 'average' | 'needs_work';
  recommendations: string[];
}

export interface VisionExpressionMetricsSummary {
  smilePercent: number;
  focusedPercent: number;
  neutralPercent: number;
  nervousPercent: number;
  confusedPercent: number;
  dominantExpression: 'focused' | 'smiling' | 'neutral' | 'nervous' | 'confused';
}

export interface VisionEyeContactMetricsSummary {
  eyeContactPercent: number;
  gazeDriftCount: number;
  gazeStabilityScore: number;
  rating: 'excellent' | 'adequate' | 'poor';
}

export interface VisionPostureMetricsSummary {
  postureScore: number;
  postureType: 'upright' | 'slouching' | 'leaning';
  headMovementStability: number;
  nodCount: number;
}

export interface VisionFidgetingMetricsSummary {
  fidgetingTickCount: number;
  handNearFaceCount: number;
  composureRating: 'high' | 'moderate' | 'low';
}

export interface VisionNonVerbalAnalysisSummary {
  expressions: VisionExpressionMetricsSummary;
  eyeContact: VisionEyeContactMetricsSummary;
  posture: VisionPostureMetricsSummary;
  fidgeting: VisionFidgetingMetricsSummary;
  overallNonVerbalScore: number;
  recommendations: string[];
}

export interface CandidateSWOTSummary {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  semanticMatchScore: number;
  experienceConsistency: number;
}

export type HiringRecommendationSummary =
  | 'strong_hire'
  | 'hire'
  | 'leaning_hire'
  | 'borderline'
  | 'do_not_hire';

export interface CompetencyRadarScoresSummary {
  technicalAcumen: number;
  communicationFluency: number;
  emotionalPoise: number;
  nonVerbalPresence: number;
  problemSolving: number;
  overallIndex: number;
}

export interface CandidateIntelligenceDossierSummary {
  candidateId: string;
  candidateName: string;
  jobRoleName: string;
  overallHiringDecision: HiringRecommendationSummary;
  decisionConfidence: number;
  executiveSummaryMemo: string;
  radarScores: CompetencyRadarScoresSummary;
  swot: CandidateSWOTSummary;
  strengthsAndHighlights: string[];
  areasForDevelopment: string[];
  candidateFeedbackLetter: string;
  generatedAt: string;
}

export interface EvaluationSummary {
  questionId: string;
  grade: 'pass' | 'poor';
  score: number;
  matchedKeywords: string[];
  feedback: string;
  behavioralMetrics?: BehavioralMetricsSummary;
  behavioralBreakdown?: BehavioralBreakdownSummary;
  linguisticAnalysis?: LinguisticAnalysisSummary;
  prosodyAnalysis?: ProsodyAnalysisSummary;
  visionAnalysis?: VisionNonVerbalAnalysisSummary;
  integrityAnalysis?: AnswerIntegrityAnalysisSummary;
}

export interface ConfidenceAnalysisSummary {
  composureScore: number;
  fillerWordCount: number;
  fillerWords: string[];
  overallConfidenceScore: number;
}

export interface ProctoringEventSummary {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  details: string;
}

export interface AnswerIntegrityAnalysisSummary {
  aiGeneratedProbability: number;
  isLikelyAIGenerated: boolean;
  isLikelyWebSearched: boolean;
  suspectedSource: string;
  burstinessScore: number;
  perplexityScore: number;
  detectedAIPatterns: string[];
  detectedSearchPatterns: string[];
  pasteIncident: boolean;
  integrityScore: number;
  confidenceRating: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface AntiCheatReportSummary {
  overallIntegrityScore: number;
  overallRiskLevel: 'clean' | 'low_risk' | 'suspicious' | 'high_risk';
  averageAIProbability: number;
  tabSwitchCount: number;
  windowBlurDurationSec: number;
  pasteCount: number;
  totalViolations: number;
  suspectedTools: string[];
  events: ProctoringEventSummary[];
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


export interface SessionSummary {
  id: string;
  roundType: string;
  status: string;
  finalGrade: number | null;
  recordingId: string | null;
  videoUrl?: string | null;
  startedAt: string;
  completedAt: string | null;
  questions: QuestionSummary[];
  answers: AnswerSummary[];
  evaluations: EvaluationSummary[];
  confidenceAnalysis: ConfidenceAnalysisSummary | null;
  linguisticAnalysis?: LinguisticAnalysisSummary | null;
  prosodyAnalysis?: ProsodyAnalysisSummary | null;
  visionAnalysis?: VisionNonVerbalAnalysisSummary | null;
  antiCheatReport?: AntiCheatReportSummary | null;
}

export interface CandidateDetail extends CandidateSummary {
  resumeData: ResumeDataSummary | null;
  sessions: SessionSummary[];
  videoUrl?: string | null;
  initialVideoUrl?: string | null;
  hrVideoUrl?: string | null;
  intelligenceDossier?: CandidateIntelligenceDossierSummary | null;
  antiCheatReport?: AntiCheatReportSummary | null;
}

export interface CandidateListResponse {
  candidates: CandidateSummary[];
  passingThreshold: number;
}

export interface CandidateDetailResponse {
  candidate: CandidateDetail;
  passingThreshold: number;
}

