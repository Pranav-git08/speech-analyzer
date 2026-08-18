import { ComposureState, ConfidenceAnalysis } from '../types';
import { config } from '../config/env';

// ─── Filler Word Detection ────────────────────────────────────────────────────


/**
 * Default filler word list. Can be overridden via the second parameter.
 * Requirements: 7.2
 */
export const DEFAULT_FILLER_WORDS: string[] = [
  'umm',
  'um',
  'uh',
  'ah',
  'er',
  'like',
  'you know',
  'i mean',
  'basically',
  'literally',
  'actually',
  'so',
  'right',
  'okay',
  'well',
];

/**
 * Detect filler words in a transcribed text string.
 *
 * Counts every occurrence of each filler phrase (case-insensitive, whole-word
 * or whole-phrase match). Multi-word fillers (e.g. "you know") are matched
 * before single-word fillers to avoid double-counting.
 *
 * Returns `{ count, words }` where `count` is the total number of filler
 * occurrences and `words` is the list of each matched filler instance.
 *
 * Requirements: 7.2
 */
export function detectFillerWords(
  transcribedText: string,
  fillerWordList: string[] = DEFAULT_FILLER_WORDS
): { count: number; words: string[] } {
  if (!transcribedText || transcribedText.trim().length === 0) {
    return { count: 0, words: [] };
  }

  const foundWords: string[] = [];
  // Work on a lowercase copy so matching is case-insensitive
  let remaining = transcribedText.toLowerCase();

  // Sort by descending length so multi-word phrases are matched first
  const sorted = [...fillerWordList].sort((a, b) => b.length - a.length);

  for (const filler of sorted) {
    const normalised = filler.toLowerCase().trim();
    if (!normalised) continue;

    // Build a regex that matches the filler as a whole word / phrase
    const escaped = normalised.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = transcribedText.match(pattern);
    if (matches) {
      for (const m of matches) {
        foundWords.push(m.toLowerCase());
      }
    }
  }

  return { count: foundWords.length, words: foundWords };
}

// ─── Composure / Confidence Score ────────────────────────────────────────────

/**
 * Mapping from composure state to base score.
 * Requirements: 7.3
 */
export const COMPOSURE_SCORES: Record<ComposureState, number> = {
  composed: 100,
  slightly_positive: 80,
  neutral: 60,
  distressed: 20,
};

/**
 * Filler word penalty per occurrence (subtracted from the composure base score).
 * The final score is capped at 0 from below.
 * Requirements: 7.4
 */
export const FILLER_PENALTY_PER_WORD = 5;

/**
 * Compute a confidence score combining composure and filler word signals.
 *
 * Formula:
 *   baseScore = COMPOSURE_SCORES[composureState]
 *   penalty   = fillerWordCount * FILLER_PENALTY_PER_WORD
 *   score     = max(0, baseScore - penalty)
 *
 * Requirements: 7.3, 7.4
 */
export function computeConfidenceScore(
  composureScore: number,
  fillerWordCount: number
): number {
  const penalty = fillerWordCount * FILLER_PENALTY_PER_WORD;
  return Math.max(0, composureScore - penalty);
}

// ─── Facial Expression Analysis ───────────────────────────────────────────────

const VALID_COMPOSURE_STATES: ComposureState[] = [
  'composed',
  'slightly_positive',
  'neutral',
  'distressed',
];

/**
 * Analyse a video frame and classify the candidate's composure.
 *
 * In production this would call a pre-trained FER model. Here we provide a
 * stub that returns a random valid composure state so the rest of the system
 * can be wired up and tested end-to-end.
 *
 * On failure the function returns `null` so the caller can skip the frame
 * without terminating the session.
 *
 * Requirements: 7.1
 */
export async function analyseFacialExpression(
  _videoFrame: unknown
): Promise<{ emotion: ComposureState; confidence: number } | null> {
  try {
    // Stub: return a random valid composure state.
    // Replace with real FER model call in production.
    const idx = Math.floor(Math.random() * VALID_COMPOSURE_STATES.length);
    const emotion = VALID_COMPOSURE_STATES[idx];
    return { emotion, confidence: 0.75 };
  } catch {
    // Graceful failure: skip frame, do not terminate session
    return null;
  }
}

/**
 * Validate that a composure classification value is one of the four valid states.
 * Useful for asserting model output correctness.
 * Requirements: 7.1
 */
export function isValidComposureState(value: string): value is ComposureState {
  return (VALID_COMPOSURE_STATES as string[]).includes(value);
}

// ─── Speech-to-Text ───────────────────────────────────────────────────────────

// Cache the local Whisper model pipeline to avoid reloading
let localWhisperPipeline: any = null;

/**
 * Transcribe an audio blob to text using the configured STT provider.
 * Accepts an optional BCP-47 language code (e.g. 'hi', 'kn') for accuracy.
 *
 * Falls back to empty string if provider fails.
 *
 * Requirements: 3.3, 5.3
 */
export async function transcribeAudio(audioBlob: Blob, language: string = 'en'): Promise<string> {
  try {
    const apiKey = config.groq.apiKey || config.stt.apiKey || config.openai.apiKey;

    if (apiKey) {
      return await transcribeWithWhisper(audioBlob, language);
    }

    if (config.stt.provider === 'google' && config.stt.apiKey) {
      console.log('[aiAnalysisService] Using Google Cloud STT');
      return await transcribeWithGoogle(audioBlob);
    }

    console.warn('[aiAnalysisService] No STT API key configured. Returning empty string.');
    return '';
  } catch (err) {
    console.error('[aiAnalysisService] STT transcription failed:', err);
    return '';
  }
}


/**
 * Translate English text to the target language using free Google Translate API.
 * No API key required. Falls back to original text if translation fails.
 * Pass targetLanguage='English' to translate FROM a foreign language TO English.
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  // Map display language name to language code
  const LANG_CODE_MAP: Record<string, string> = {
    'Hindi':   'hi',
    'Kannada': 'kn',
    'Telugu':  'te',
    'English': 'en',
  };

  const targetCode = LANG_CODE_MAP[targetLanguage] ?? 'en';

  // If already targeting English, auto-detect source
  const sourceLang = targetCode === 'en' ? 'auto' : 'en';

  if (sourceLang === 'en' && targetCode === 'en') return text; // no-op

  // Try multiple free translation endpoints with fallback
  const translationAttempts = [
    () => translateWithGoogleInformal(text, targetCode, sourceLang),
    () => translateWithMyMemory(text, targetCode, sourceLang),
  ];

  for (const attempt of translationAttempts) {
    try {
      const result = await attempt();
      if (result && result !== text) {
        // Validate: for Indian languages, result should contain native script characters
        // not romanized text (e.g., Telugu should have Telugu Unicode, not "meeru naku")
        if (isNativeScriptExpected(targetCode) && isLikelyRomanized(result)) {
          console.warn(`[aiAnalysisService] Translation appears romanized for ${targetCode}, trying next provider...`);
          continue;
        }
        console.log(`[aiAnalysisService] Translated to ${targetLanguage}: "${result.substring(0, 60)}..."`);
        return result;
      }
    } catch (err) {
      console.warn('[aiAnalysisService] Translation attempt failed, trying next:', err);
    }
  }

  console.warn(`[aiAnalysisService] All translation attempts failed, using original text`);
  return text;
}

/**
 * Languages that should produce non-Latin (native script) output.
 */
function isNativeScriptExpected(langCode: string): boolean {
  return ['hi', 'kn', 'te', 'ta', 'ml', 'bn', 'gu', 'mr', 'pa'].includes(langCode);
}

/**
 * Detect if a translation result is romanized (Latin characters) when
 * it should be in native script. More than 70% Latin = likely romanized.
 */
function isLikelyRomanized(text: string): boolean {
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && (latinChars / totalChars) > 0.7;
}

/**
 * MyMemory free translation API — 1000 words/day free, no key needed.
 */
async function translateWithMyMemory(text: string, targetCode: string, sourceLang: string = 'en'): Promise<string> {
  const langpair = sourceLang === 'auto' ? `|${targetCode}` : `${sourceLang}|${targetCode}`;
  const params = new URLSearchParams({
    q: text,
    langpair,
    de: 'speechanalyzer@example.com',
  });

  const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`MyMemory API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    responseStatus: number;
    responseData?: { translatedText?: string };
  };

  if (data.responseStatus !== 200 && data.responseStatus !== 206) {
    throw new Error(`MyMemory translation failed: status ${data.responseStatus}`);
  }

  const translated = data.responseData?.translatedText;
  if (!translated || translated === text) {
    throw new Error('MyMemory returned empty or unchanged text');
  }

  return translated;
}

/**
 * Google Translate unofficial API (no key, uses public endpoint).
 */
async function translateWithGoogleInformal(text: string, targetCode: string, sourceLang: string = 'en'): Promise<string> {
  const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
  const encoded = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${targetCode}&dt=t&q=${encoded}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.status}`);
  }

  const data = (await response.json()) as Array<Array<Array<string>>>;
  // Response format: [[[translated, original, ...], ...], ...]
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected Google Translate response format');
  }

  const translated = data[0]
    .filter((chunk) => Array.isArray(chunk) && chunk[0])
    .map((chunk) => chunk[0])
    .join('');

  if (!translated) {
    throw new Error('Google Translate returned empty text');
  }

  return translated;
}

/**
 * Transcribe audio using local Whisper model (Transformers.js).
 * Completely free and runs on your own hardware.
 */
async function transcribeWithLocalWhisper(audioBlob: Blob): Promise<string> {
  try {
    // Dynamically import transformers.js (ES Module)
    const { pipeline } = await import('@xenova/transformers');
    
    // Initialize pipeline on first use (downloads model ~75MB, cached after)
    if (!localWhisperPipeline) {
      console.log('[aiAnalysisService] Loading local Whisper model (first time only, ~75MB download)...');
      localWhisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
      console.log('[aiAnalysisService] Local Whisper model loaded successfully');
    }

    // Convert blob to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe audio
    const result = await localWhisperPipeline(buffer);
    return result.text || '';
  } catch (err) {
    console.error('[aiAnalysisService] Local Whisper transcription failed:', err);
    throw err;
  }
}

const WHISPER_HALLUCINATIONS = new Set([
  'you',
  'you.',
  'you..',
  'you...',
  'thank you',
  'thank you.',
  'thank you very much',
  'thank you very much.',
  'thank you for watching',
  'thank you for watching.',
  'thanks for watching',
  'thanks for watching.',
  'subtitles by the amara.org community',
  'subtitles by',
  'bye',
  'bye.',
  'goodbye',
  'goodbye.',
  'undefined',
  '.',
  '..',
  '...',
]);

const LANGUAGE_CODE_MAP: Record<string, string> = {
  english: 'en',
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  'en-in': 'en',
  hindi: 'hi',
  hi: 'hi',
  'hi-in': 'hi',
  spanish: 'es',
  es: 'es',
  french: 'fr',
  fr: 'fr',
  german: 'de',
  de: 'de',
  tamil: 'ta',
  ta: 'ta',
  telugu: 'te',
  te: 'te',
  kannada: 'kn',
  kn: 'kn',
  malayalam: 'ml',
  ml: 'ml',
  bengali: 'bn',
  bn: 'bn',
  marathi: 'mr',
  mr: 'mr',
  gujarati: 'gu',
  gu: 'gu',
  punjabi: 'pa',
  pa: 'pa',
  chinese: 'zh',
  zh: 'zh',
  japanese: 'ja',
  ja: 'ja',
  korean: 'ko',
  ko: 'ko',
  arabic: 'ar',
  ar: 'ar',
  russian: 'ru',
  ru: 'ru',
  portuguese: 'pt',
  pt: 'pt',
  italian: 'it',
  it: 'it',
};

export function cleanWhisperResult(text: string | null | undefined): string {
  if (!text) return '';
  const raw = text.trim();
  const lower = raw.toLowerCase().replace(/^[.,!?\s]+|[.,!?\s]+$/g, '');
  
  // Filter repeated hallucination tokens e.g. "you you", "you you you", "thank you thank you"
  const tokens = lower.split(/\s+/).filter(Boolean);
  const isAllYou = tokens.length > 0 && tokens.every(t => t === 'you' || t === 'you.' || t === 'you!' || t === 'you,');
  const isAllThankYou = tokens.length > 0 && tokens.every(t => t === 'you' || t === 'thank' || t === 'thanks');

  if (
    WHISPER_HALLUCINATIONS.has(lower) ||
    WHISPER_HALLUCINATIONS.has(raw.toLowerCase()) ||
    isAllYou ||
    isAllThankYou
  ) {
    console.log(`[aiAnalysisService] Filtered out Whisper silence hallucination artifact: "${raw}"`);
    return '';
  }
  return raw;
}

async function transcribeWithWhisper(audioBlob: Blob, language: string = 'en'): Promise<string> {
  const apiKey = config.groq.apiKey || config.stt.apiKey || config.openai.apiKey;
  if (!apiKey) {
    throw new Error('No API key configured for Whisper STT');
  }

  const arrayBuffer = await audioBlob.arrayBuffer();
  if (arrayBuffer.byteLength < 3000) {
    console.log('[aiAnalysisService] Audio buffer too small for Whisper STT (<3KB), returning empty');
    return '';
  }

  const isGroq = Boolean(config.groq.apiKey);
  const endpoint = isGroq
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';
  const model = isGroq ? 'whisper-large-v3' : 'whisper-1';

  // Convert Blob to buffer/Blob for Node fetch
  const fileBlob = new Blob([arrayBuffer], { type: audioBlob.type || 'audio/webm' });
  
  // Create native standard FormData
  const formData = new globalThis.FormData();
  formData.append('file', fileBlob, 'recording.webm');
  formData.append('model', model);
  formData.append('temperature', '0');
  
  // Normalize language to 2-letter ISO code required by Groq API
  const rawLang = (language || 'en').trim().toLowerCase();
  const isoLang = LANGUAGE_CODE_MAP[rawLang] || LANGUAGE_CODE_MAP[rawLang.split('-')[0]] || 'en';
  if (isoLang && isoLang !== 'auto') {
    formData.append('language', isoLang);
  }

  console.log(`[aiAnalysisService] Sending audio to ${isGroq ? 'Groq' : 'OpenAI'} Whisper API (${model}, size: ${Math.round(arrayBuffer.byteLength / 1024)}KB, lang: ${isoLang})...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[aiAnalysisService] ${isGroq ? 'Groq' : 'OpenAI'} Whisper API error:`, errorText);
    throw new Error(`Whisper API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as { text: string };
  const cleaned = cleanWhisperResult(data.text);
  console.log('[aiAnalysisService] Transcription successful:', cleaned ? cleaned.substring(0, 100) : '[Filtered silence/empty]');
  return cleaned;
}


async function transcribeWithGoogle(audioBlob: Blob): Promise<string> {
  if (!config.stt.apiKey) {
    throw new Error('Google STT API key is not configured');
  }

  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${config.stt.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: 'en-US' },
        audio: { content: base64Audio },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google STT API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
  };
  return data.results?.[0]?.alternatives?.[0]?.transcript ?? '';
}
