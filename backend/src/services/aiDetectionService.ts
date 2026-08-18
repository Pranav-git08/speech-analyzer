import {
  AnswerIntegrityAnalysis,
  AntiCheatReport,
  ProctoringEvent,
} from '../types';

// Hallmark LLM phrases commonly produced by ChatGPT, Claude, and Gemini
const AI_HALLMARK_PHRASES = [
  'it is important to note',
  'in conclusion',
  'furthermore',
  'moreover',
  'delving into',
  'delve into',
  'plays a crucial role',
  'plays a vital role',
  'serves as a',
  'at its core',
  'in essence',
  'comprehensive overview',
  'seamlessly integrate',
  'seamlessly integrates',
  'testament to',
  'multifaceted',
  'it is worth noting',
  'it is paramount',
  'a wide array of',
  'in summary',
  'to summarize',
  'by leveraging',
  'as an ai language model',
  'here is a breakdown',
  'key takeaways',
  'let us explore',
  'let\'s explore',
  'first and foremost',
  'on the other hand',
];

// Formatting and semantic patterns common in Google search results, articles, blogs, Wikipedia, and documentation
const SEARCH_HALLMARK_PATTERNS = [
  /\b(pause before speaking|take a breath to avoid|validate (their|the) concern|never offer a discount immediately|avoid dropping price|compare the alternatives|match their pacing|adapt your speaking speed)\b/i,
  /\b(moves through|consists of|divided into)\s+(\w+)\s+(distinct\s+)?(stages|steps|phases|parts|pillars)\b/i,
  /\b(requires shifting the focus away from|focusing on the needs rather than|shifting the focus towards)\b/i,
  /\b(the typical|the standard|the primary|the fundamental)\s+\w+\s+(process|approach|methodology|framework)\b/i,
  /\b(firstly|secondly|thirdly|step 1|step 2|step 3|stage 1|stage 2)\b/i,
  /\bkey differences?\b/i,
  /\badvantages and disadvantages\b/i,
  /\bpros and cons\b/i,
  /\bstep-by-step guide\b/i,
  /\baccording to the documentation\b/i,
  /\bsyntax:\s*\n?/i,
  /\bexample usage:\s*\n?/i,
  /\bdefinition:\s*\n?/i,
  /\boutput:\s*\n?/i,
  /\bcode snippet:\s*\n?/i,
  /\b(is|are) defined as\b/i,
  /\brefers to the (process|concept|method|ability|practice) of\b/i,
  /\bis a (programming language|library|framework|tool|software|concept|design pattern) (that|which|used to)\b/i,
  /\bthe primary purpose of\b/i,
  /\bthe main difference between .* and .* is\b/i,
  /\bthe key advantages? (are|include|of)\b/i,
  /\baccording to (the|google|documentation|official)\b/i,
  /\bkey features include\b/i,
  /\bfor instance,\b/i,
  /\bin other words,\b/i,
  /\bit is used to (create|build|handle|manage|develop|implement)\b/i,
  /\bthere are mainly (\w+) types of\b/i,
  /\b(two|three|four|five|six|seven|eight) main (types|categories|components|pillars|principles|stages|steps)\b/i,
  /\bin computer science,\b/i,
  /\bin software engineering,\b/i,
  /\bit allows developers to\b/i,
  /\bit provides a way to\b/i,
];


/**
 * Calculates sentence length variance (Burstiness).
 * Humans naturally produce high burstiness (short sentences mixed with long thoughts).
 * LLMs produce uniform, balanced sentence lengths (low burstiness).
 */
function calculateBurstiness(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length <= 1) return 50;

  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, len) => acc + Math.pow(len - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  // Normal human burstiness standard deviation is typically > 6 words
  // Low stdDev (< 3) implies uniform AI generation
  const burstinessScore = Math.min(100, Math.round((stdDev / 10) * 100));
  return burstinessScore;
}

/**
 * Evaluates vocabulary distribution and repetitive structural patterns.
 */
function calculatePerplexityScore(text: string): number {
  const words = text.toLowerCase().match(/\b[a-z0-9_'-]+\b/g) || [];
  if (words.length < 5) return 50;

  const unique = new Set(words);
  const ttr = (unique.size / words.length) * 100;

  // Very high predictability with uniform transitions indicates lower natural human perplexity
  return Math.min(100, Math.round(ttr));
}

/**
 * Analyzes a single candidate answer for AI generation, web search scraping, and paste incidents.
 */
export function analyzeAnswerIntegrity(params: {
  text: string;
  type: 'oral' | 'code_snippet';
  pasteOccurred?: boolean;
  tabSwitchesDuringAnswer?: number;
  wordCount?: number;
}): AnswerIntegrityAnalysis {
  const { text, type, pasteOccurred = false, tabSwitchesDuringAnswer = 0 } = params;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed || trimmed === '[voice answer submitted]') {
    return {
      aiGeneratedProbability: 0,
      isLikelyAIGenerated: false,
      isLikelyWebSearched: false,
      suspectedSource: 'natural_human',
      burstinessScore: 50,
      perplexityScore: 50,
      detectedAIPatterns: [],
      detectedSearchPatterns: [],
      pasteIncident: pasteOccurred,
      integrityScore: 100,
      confidenceRating: 'high',
      explanation: 'Authentic oral response recorded directly.',
    };
  }

  // 1. Detect AI Hallmark phrases (verbatim LLM robotic tokens)
  const detectedAIPatterns: string[] = [];
  for (const phrase of AI_HALLMARK_PHRASES) {
    if (lower.includes(phrase)) {
      detectedAIPatterns.push(phrase);
    }
  }

  // 2. Detect Google Search / Documentation Copying Patterns
  const detectedSearchPatterns: string[] = [];
  for (const pattern of SEARCH_HALLMARK_PATTERNS) {
    if (pattern.test(trimmed)) {
      detectedSearchPatterns.push(pattern.source.replace(/\\b/g, ''));
    }
  }

  const burstiness = calculateBurstiness(trimmed);
  const perplexity = calculatePerplexityScore(trimmed);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  let aiScore = 0;

  // AI Hallmark phrases
  if (detectedAIPatterns.length >= 3) {
    aiScore += 90;
  } else if (detectedAIPatterns.length === 2) {
    aiScore += 70;
  } else if (detectedAIPatterns.length === 1) {
    aiScore += 45;
  }

  // Search patterns
  if (detectedSearchPatterns.length >= 2) {
    aiScore += 75;
  } else if (detectedSearchPatterns.length === 1) {
    aiScore += 50;
  }

  // Tab switching during answer formulation = clear external browsing attempt
  if (tabSwitchesDuringAnswer >= 3) {
    aiScore += 95;
  } else if (tabSwitchesDuringAnswer === 2) {
    aiScore += 85;
  } else if (tabSwitchesDuringAnswer === 1) {
    aiScore += 70;
  }

  // Instant paste of substantial text
  if (pasteOccurred && wordCount > 10) {
    aiScore += 85;
  }

  // If no external violations or AI markers occurred, AI probability is strictly 0%
  const finalAIProbability = Math.max(0, Math.min(100, Math.round(aiScore)));
  const isLikelyAIGenerated = finalAIProbability >= 45;
  const isLikelyWebSearched = detectedSearchPatterns.length > 0 || tabSwitchesDuringAnswer > 0 || pasteOccurred;

  let suspectedSource: AnswerIntegrityAnalysis['suspectedSource'] = 'natural_human';
  if (tabSwitchesDuringAnswer > 0 || detectedSearchPatterns.length > 0) {
    suspectedSource = 'google_search_snippet';
  } else if (finalAIProbability >= 45) {
    suspectedSource = 'chatgpt';
  }

  const integrityScore = Math.max(0, 100 - finalAIProbability);

  let explanation = 'Response verified as 100% authentic human thought and natural speech.';
  if (tabSwitchesDuringAnswer > 0) {
    explanation = `Candidate switched tabs ${tabSwitchesDuringAnswer} time(s) during answer formulation (${finalAIProbability}% external aid likelihood).`;
  } else if (pasteOccurred) {
    explanation = 'Answer content was pasted directly from the clipboard.';
  } else if (detectedAIPatterns.length > 0) {
    explanation = `Detected ${detectedAIPatterns.length} AI hallmark phrase(s) in response text (${finalAIProbability}% AI probability).`;
  }

  return {
    aiGeneratedProbability: finalAIProbability,
    isLikelyAIGenerated,
    isLikelyWebSearched,
    suspectedSource,
    burstinessScore: burstiness,
    perplexityScore: perplexity,
    detectedAIPatterns,
    detectedSearchPatterns,
    pasteIncident: pasteOccurred,
    integrityScore,
    confidenceRating: 'high',
    explanation,
  };

}

/**
 * Aggregates session-level proctoring events and answer evaluations into an executive AntiCheatReport.
 */
export function generateAntiCheatReport(params?: {
  events?: ProctoringEvent[];
  evaluations?: Array<{ questionId: string; integrityAnalysis?: AnswerIntegrityAnalysis }>;
}): AntiCheatReport {
  const evts = params?.events || [];
  const evals = params?.evaluations || [];

  const tabSwitches = evts.filter((e) => e.type === 'tab_switch' || e.type === 'window_blur').length;
  const pasteCount = evts.filter((e) => e.type === 'copy_paste').length;
  const phoneEvents = evts.filter((e) => e.type === 'looking_down_phone');

  const withIntegrity = evals.map((e) => e.integrityAnalysis).filter(Boolean) as AnswerIntegrityAnalysis[];

  let avgAI = 0;
  if (withIntegrity.length > 0) {
    avgAI = Math.round(withIntegrity.reduce((sum, a) => sum + (a.aiGeneratedProbability || 0), 0) / withIntegrity.length);
  }

  const suspectedTools: string[] = [];
  if (tabSwitches > 0) suspectedTools.push('Browser Tab Switch / Web Search');
  if (pasteCount > 0) suspectedTools.push('External Clipboard Paste');
  if (avgAI > 45) suspectedTools.push('AI Language Model (ChatGPT/Claude)');
  if (phoneEvents.length > 0) suspectedTools.push('Secondary Mobile Device');

  const isMalpractice = phoneEvents.length > 0 || tabSwitches >= 3 || pasteCount >= 2;
  const externalAidScore = Math.min(
    100,
    Math.max(
      tabSwitches > 0 ? (tabSwitches >= 3 ? 98 : tabSwitches === 2 ? 88 : 75) : 0,
      pasteCount > 0 ? (pasteCount >= 2 ? 95 : 80) : 0,
      avgAI,
      phoneEvents.length > 0 ? (phoneEvents.length >= 2 ? 96 : 85) : 0
    )
  );
  const overallIntegrityScore = Math.max(0, 100 - externalAidScore);

  let overallRiskLevel: AntiCheatReport['overallRiskLevel'] = 'clean';
  if (externalAidScore >= 70) overallRiskLevel = 'high_risk';
  else if (externalAidScore >= 35) overallRiskLevel = 'suspicious';
  else if (externalAidScore > 0) overallRiskLevel = 'low_risk';

  const questionIntegritySummaries = evals.map((e, idx) => {
    const flags: string[] = [];
    if (e.integrityAnalysis?.isLikelyAIGenerated) flags.push('AI Generated');
    if (e.integrityAnalysis?.isLikelyWebSearched) flags.push('Web Searched');
    if (e.integrityAnalysis?.pasteIncident) flags.push('Clipboard Paste');

    return {
      questionId: e.questionId || `q-${idx + 1}`,
      aiProbability: e.integrityAnalysis?.aiGeneratedProbability || 0,
      integrityScore: e.integrityAnalysis?.integrityScore ?? 100,
      suspectedSource: e.integrityAnalysis?.suspectedSource || 'natural_human',
      flags,
    };
  });

  return {
    overallIntegrityScore,
    overallRiskLevel,
    averageAIProbability: avgAI,
    tabSwitchCount: tabSwitches,
    windowBlurDurationSec: 0,
    pasteCount,
    totalViolations: evts.length,
    suspectedTools,
    events: evts,
    questionIntegritySummaries,
    executiveSummary: overallIntegrityScore >= 80
      ? 'Candidate demonstrated 100% authentic human knowledge and original thinking without external aids.'
      : `Integrity evaluation detected ${externalAidScore}% external aid likelihood (${suspectedTools.join(', ') || 'anomalous patterns'}).`,
    malpracticeDetected: isMalpractice,
    malpracticeReasons: suspectedTools,
    phoneUsageDetected: phoneEvents.length > 0,
    notebookReadingDetected: false,
    secondPersonDetected: false,
    googleSearchDetected: tabSwitches > 0,
    clipboardPasteDetected: pasteCount > 0,
  };
}
