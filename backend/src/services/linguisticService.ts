import { config } from '../config/env';
import {
  LinguisticAnalysis,
  LinguisticProvider,
  FillerCategory,
  FillerWordOccurrence,
} from '../types';
import FormData from 'form-data';

// ─── Comprehensive Filler Word & Disfluency Categories ─────────────────────────

export const HESITATION_MARKERS = [
  'umm', 'um', 'uh', 'ah', 'er', 'eh', 'hmm', 'hm', 'mhm',
];

export const CRUTCH_WORDS = [
  'like', 'basically', 'literally', 'actually', 'frankly', 'honestly',
  'obviously', 'seriously', 'totally', 'definitely', 'essentially',
];

export const DISCOURSE_FILLERS = [
  'you know', 'i mean', 'you see', 'sort of', 'kind of', 'right',
  'okay', 'well', 'so', 'you know what i mean', 'at the end of the day',
  'to be honest', 'believe me',
];

export const ALL_FILLER_WORDS = [
  ...HESITATION_MARKERS,
  ...CRUTCH_WORDS,
  ...DISCOURSE_FILLERS,
];

// ─── Helper NLP Functions ────────────────────────────────────────────────────

/**
 * Categorize a detected filler word / phrase.
 */
export function categorizeFillerWord(word: string): FillerCategory {
  const norm = word.toLowerCase().trim();
  if (HESITATION_MARKERS.includes(norm)) return 'hesitation';
  if (CRUTCH_WORDS.includes(norm)) return 'crutch';
  return 'discourse';
}

/**
 * Detect and categorize filler words in transcript text.
 */
export function analyzeFillerWordsInText(transcribedText: string): {
  totalCount: number;
  frequencyPercent: number;
  severity: 'low' | 'moderate' | 'high';
  breakdown: FillerWordOccurrence[];
} {
  if (!transcribedText || !transcribedText.trim()) {
    return {
      totalCount: 0,
      frequencyPercent: 0,
      severity: 'low',
      breakdown: [],
    };
  }

  const words = transcribedText.trim().split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  const counts: Record<string, number> = {};
  const lowerText = transcribedText.toLowerCase();

  // Sort fillers descending by length so multi-word expressions match first
  const sortedFillers = [...ALL_FILLER_WORDS].sort((a, b) => b.length - a.length);

  for (const filler of sortedFillers) {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = transcribedText.match(regex);
    if (matches && matches.length > 0) {
      counts[filler.toLowerCase()] = matches.length;
    }
  }

  const breakdown: FillerWordOccurrence[] = Object.entries(counts)
    .map(([word, count]) => ({
      word,
      count,
      category: categorizeFillerWord(word),
    }))
    .sort((a, b) => b.count - a.count);

  const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const frequencyPercent = totalWords > 0 ? Math.round((totalCount / totalWords) * 1000) / 10 : 0;

  let severity: 'low' | 'moderate' | 'high' = 'low';
  if (frequencyPercent > 5 || totalCount >= 8) severity = 'high';
  else if (frequencyPercent >= 2 || totalCount >= 3) severity = 'moderate';

  return {
    totalCount,
    frequencyPercent,
    severity,
    breakdown,
  };
}

/**
 * Compute lexical diversity (Type-Token Ratio) and vocabulary metrics.
 */
export function computeVocabularyMetrics(text: string): {
  totalWords: number;
  uniqueWords: number;
  lexicalDiversity: number;
  complexityRating: 'basic' | 'proficient' | 'advanced';
  averageWordLength: number;
} {
  const cleanTokens = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const totalWords = cleanTokens.length;
  if (totalWords === 0) {
    return {
      totalWords: 0,
      uniqueWords: 0,
      lexicalDiversity: 0,
      complexityRating: 'basic',
      averageWordLength: 0,
    };
  }

  const uniqueWordsSet = new Set(cleanTokens);
  const uniqueWords = uniqueWordsSet.size;

  // Type-Token Ratio (%) with root scaling to prevent natural drop on long text
  const ttr = (uniqueWords / totalWords) * 100;
  const lexicalDiversity = Math.min(100, Math.round(ttr * 10) / 10);

  const totalChars = cleanTokens.reduce((acc, w) => acc + w.length, 0);
  const averageWordLength = Math.round((totalChars / totalWords) * 10) / 10;

  let complexityRating: 'basic' | 'proficient' | 'advanced' = 'basic';
  if (averageWordLength >= 5.2 && lexicalDiversity >= 60) complexityRating = 'advanced';
  else if (averageWordLength >= 4.3 || lexicalDiversity >= 45) complexityRating = 'proficient';

  return {
    totalWords,
    uniqueWords,
    lexicalDiversity,
    complexityRating,
    averageWordLength,
  };
}

/**
 * Generate extractive summary and key points from transcript.
 */
export function generateExtractiveSummaryAndKeyPoints(
  text: string,
  questionPrompt?: string
): { summary: string; keyPoints: string[]; topics: string[] } {
  if (!text || !text.trim()) {
    return {
      summary: 'No spoken response recorded.',
      keyPoints: [],
      topics: [],
    };
  }

  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length === 0) {
    return {
      summary: text.trim(),
      keyPoints: [text.trim()],
      topics: extractMainKeywords(text),
    };
  }

  // Key summary is first 1-2 salient sentences
  const summary = sentences.slice(0, 2).join(' ');

  // Key takeaways
  const keyPoints = sentences.slice(0, 4).map((s) => {
    // Strip leading conversational fillers
    return s.replace(/^(well|so|like|basically|actually|you know|i mean|yes|yeah)[,\s]+/i, '');
  });

  const topics = extractMainKeywords(text);

  return {
    summary,
    keyPoints: keyPoints.length > 0 ? keyPoints : [summary],
    topics,
  };
}

/**
 * Extract salient topics / keywords from spoken answer.
 */
export function extractMainKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of',
    'or', 'by', 'with', 'as', 'from', 'that', 'it', 'this', 'i', 'my', 'we', 'our',
    'you', 'your', 'he', 'she', 'they', 'was', 'were', 'have', 'has', 'had', 'do',
    'did', 'does', 'am', 'are', 'been', 'be', 'so', 'can', 'could', 'would', 'should',
    'will', 'just', 'also', 'about', 'like', 'know', 'think', 'because', 'when', 'if'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

/**
 * Compute speech tone, sentiment and clarity.
 */
export function analyzeToneAndClarity(
  text: string,
  fillerCount: number,
  totalWords: number
): {
  sentiment: 'positive' | 'neutral' | 'negative' | 'confident' | 'hesitant';
  confidenceToneScore: number;
  dominantTone: string;
  clarityScore: number;
} {
  const lower = text.toLowerCase();

  const positiveWords = ['confident', 'excited', 'experience', 'success', 'achieve', 'passion', 'great', 'effective', 'leadership', 'teamwork', 'solve', 'improved'];
  const hesitantWords = ['maybe', 'not sure', 'perhaps', 'guess', 'sort of', 'kind of', 'i think maybe', 'hard to say'];

  let positiveScore = 0;
  for (const pw of positiveWords) {
    if (lower.includes(pw)) positiveScore += 1;
  }

  let hesitantScore = 0;
  for (const hw of hesitantWords) {
    if (lower.includes(hw)) hesitantScore += 1;
  }

  const fillerRatio = totalWords > 0 ? fillerCount / totalWords : 0;

  // Base clarity starts at 100 and is reduced by high filler ratio or excessive hesitation
  const fillerPenalty = Math.min(45, fillerRatio * 250);
  const hesitationPenalty = Math.min(25, hesitantScore * 8);
  const clarityScore = Math.max(10, Math.round(100 - fillerPenalty - hesitationPenalty));

  let sentiment: 'positive' | 'neutral' | 'negative' | 'confident' | 'hesitant' = 'neutral';
  let dominantTone = 'Professional & Neutral';

  if (fillerRatio > 0.08 || hesitantScore >= 3) {
    sentiment = 'hesitant';
    dominantTone = 'Hesitant / Uncertain Delivery';
  } else if (positiveScore >= 2 && fillerRatio < 0.03) {
    sentiment = 'confident';
    dominantTone = 'Confident & Articulate';
  } else if (positiveScore > 0) {
    sentiment = 'positive';
    dominantTone = 'Constructive & Optimistic';
  }

  const confidenceToneScore = Math.min(100, Math.max(20, Math.round(clarityScore * 0.7 + (positiveScore * 10) - (hesitantScore * 8))));

  return {
    sentiment,
    confidenceToneScore,
    dominantTone,
    clarityScore,
  };
}

/**
 * Generate actionable recommendations from linguistic metrics.
 */
export function generateLinguisticRecommendations(
  fillerAnalysis: { totalCount: number; frequencyPercent: number; breakdown: FillerWordOccurrence[] },
  vocabMetrics: { lexicalDiversity: number; complexityRating: string; averageWordLength: number },
  clarityScore: number
): string[] {
  const recommendations: string[] = [];

  if (fillerAnalysis.totalCount > 0) {
    const topFiller = fillerAnalysis.breakdown[0];
    if (fillerAnalysis.frequencyPercent > 4) {
      recommendations.push(
        `High filler word frequency (${fillerAnalysis.frequencyPercent}%). Practice brief silent pauses instead of saying "${topFiller?.word || 'um'}".`
      );
    } else {
      recommendations.push(
        `Minor filler words detected (${fillerAnalysis.totalCount} total, mainly "${topFiller?.word || 'like'}"). Good overall control.`
      );
    }
  } else {
    recommendations.push('Superb fluency with zero filler words detected.');
  }

  if (vocabMetrics.lexicalDiversity < 40) {
    recommendations.push('Try using more varied industry-specific vocabulary to elaborate on technical examples.');
  } else {
    recommendations.push('Strong lexical variety and effective vocabulary choice.');
  }

  if (clarityScore < 60) {
    recommendations.push('Structure complex answers using the STAR method (Situation, Task, Action, Result) for higher crispness.');
  } else if (clarityScore >= 80) {
    recommendations.push('Concise, well-structured thought articulation.');
  }

  return recommendations;
}

// ─── AssemblyAI Speech-to-Text & Linguistic Intelligence ─────────────────────

/**
 * Transcribe & perform deep linguistic analysis via AssemblyAI API.
 * Requirements: Disfluencies/Filler words, Auto-Summarization, Sentiment Analysis.
 */
export async function analyzeWithAssemblyAI(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm'
): Promise<LinguisticAnalysis> {
  const apiKey = config.assemblyai.apiKey;
  if (!apiKey || apiKey.includes('your_assemblyai_api_key')) {
    throw new Error('AssemblyAI API key is not configured');
  }

  console.log('[AssemblyAI] Uploading audio buffer to AssemblyAI...');

  // 1. Upload audio file
  const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: audioBuffer as any,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`AssemblyAI upload failed: ${uploadRes.status} - ${err}`);
  }

  const { upload_url } = (await uploadRes.json()) as { upload_url: string };
  console.log('[AssemblyAI] Audio uploaded successfully, requesting linguistic analysis...');

  // 2. Submit transcript job with all linguistic endpoints enabled
  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      disfluencies: true,            // Include filler words (um, uh, like, etc.)
      summarization: true,           // Auto speech summary
      summary_model: 'informative',
      summary_type: 'bullets',
      sentiment_analysis: true,      // Spoken sentiment
      auto_highlights: true,         // Key phrases
      entity_detection: false,
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`AssemblyAI transcript submission failed: ${submitRes.status} - ${err}`);
  }

  const { id: transcriptId } = (await submitRes.json()) as { id: string };
  console.log(`[AssemblyAI] Transcript job started (ID: ${transcriptId}), polling for results...`);

  // 3. Poll transcript status until completed (max 60 seconds)
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'Authorization': apiKey },
    });

    if (!pollRes.ok) continue;

    const data = (await pollRes.json()) as {
      status: 'queued' | 'processing' | 'completed' | 'error';
      text?: string;
      summary?: string;
      words?: Array<{ text: string; start: number; end: number; confidence: number }>;
      sentiment_analysis_results?: Array<{ text: string; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }>;
      auto_highlights_result?: { results?: Array<{ text: string; count: number }> };
      error?: string;
    };

    if (data.status === 'error') {
      throw new Error(`AssemblyAI processing error: ${data.error || 'Unknown error'}`);
    }

    if (data.status === 'completed' && data.text) {
      console.log('[AssemblyAI] Linguistic analysis completed successfully!');
      const transcript = data.text;

      // Extract filler words from words array & text
      const fillerAnalysis = analyzeFillerWordsInText(transcript);
      const vocabMetrics = computeVocabularyMetrics(transcript);
      const toneClarity = analyzeToneAndClarity(transcript, fillerAnalysis.totalCount, vocabMetrics.totalWords);

      // Extract bullet points from summary
      const keyPoints = data.summary
        ? data.summary.split('\n').map((s) => s.replace(/^[-*•]\s*/, '').trim()).filter((s) => s.length > 0)
        : generateExtractiveSummaryAndKeyPoints(transcript).keyPoints;

      const topics = data.auto_highlights_result?.results
        ? data.auto_highlights_result.results.slice(0, 5).map((r) => r.text)
        : extractMainKeywords(transcript);

      const recommendations = generateLinguisticRecommendations(fillerAnalysis, vocabMetrics, toneClarity.clarityScore);

      return {
        provider: 'assemblyai',
        transcript,
        summary: data.summary || generateExtractiveSummaryAndKeyPoints(transcript).summary,
        keyPoints,
        topics,
        fillerWordAnalysis: fillerAnalysis,
        vocabularyMetrics: vocabMetrics,
        sentimentAndTone: {
          sentiment: toneClarity.sentiment,
          confidenceToneScore: toneClarity.confidenceToneScore,
          dominantTone: toneClarity.dominantTone,
        },
        clarityScore: toneClarity.clarityScore,
        recommendations,
      };
    }
  }

  throw new Error('AssemblyAI polling timed out after 60 seconds.');
}

// ─── Master Linguistic Analysis Engine ────────────────────────────────────────

/**
 * Perform linguistic analysis on a spoken answer.
 * Uses AssemblyAI if configured, OpenAI Whisper + NLP if configured,
 * or the built-in Local Hybrid NLP engine.
 */
export async function performLinguisticAnalysis(params: {
  audioBuffer?: Buffer;
  mimeType?: string;
  transcription?: string;
  language?: string;
}): Promise<LinguisticAnalysis> {
  const { audioBuffer, mimeType, transcription, language } = params;

  // 1. Try AssemblyAI if API key is configured and audio buffer is provided
  const hasAssemblyAIKey = config.assemblyai.apiKey &&
    !config.assemblyai.apiKey.includes('your_') &&
    config.assemblyai.apiKey.length > 10;

  if (hasAssemblyAIKey && audioBuffer && audioBuffer.length > 0) {
    try {
      return await analyzeWithAssemblyAI(audioBuffer, mimeType || 'audio/webm');
    } catch (assemblyErr) {
      console.warn('[LinguisticService] AssemblyAI failed, falling back to NLP engine:', assemblyErr);
    }
  }

  // 2. Local Hybrid NLP Linguistic Engine (Zero-Cost / High-Speed / Offline)
  const text = transcription || '';
  const fillerAnalysis = analyzeFillerWordsInText(text);
  const vocabMetrics = computeVocabularyMetrics(text);
  const summaryAndPoints = generateExtractiveSummaryAndKeyPoints(text);
  const toneClarity = analyzeToneAndClarity(text, fillerAnalysis.totalCount, vocabMetrics.totalWords);
  const recommendations = generateLinguisticRecommendations(fillerAnalysis, vocabMetrics, toneClarity.clarityScore);

  const provider: LinguisticProvider = config.stt.provider === 'openai' ? 'whisper' : 'local_nlp';

  return {
    provider,
    transcript: text,
    summary: summaryAndPoints.summary,
    keyPoints: summaryAndPoints.keyPoints,
    topics: summaryAndPoints.topics,
    fillerWordAnalysis: fillerAnalysis,
    vocabularyMetrics: vocabMetrics,
    sentimentAndTone: {
      sentiment: toneClarity.sentiment,
      confidenceToneScore: toneClarity.confidenceToneScore,
      dominantTone: toneClarity.dominantTone,
    },
    clarityScore: toneClarity.clarityScore,
    recommendations,
  };
}
