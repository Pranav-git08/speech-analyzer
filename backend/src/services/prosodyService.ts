import {
  ProsodyAnalysis,
  ProsodyPitchMetrics,
  ProsodyPacingMetrics,
  ProsodyEnergyMetrics,
  ProsodyEmotionMetrics,
} from '../types';

/**
 * Syllable estimator based on vowel clusters.
 */
function estimateSyllables(text: string): number {
  if (!text || !text.trim()) return 0;
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  let syllableCount = 0;

  for (const word of words) {
    if (word.length <= 3) {
      syllableCount += 1;
      continue;
    }
    const clean = word.replace(/(?:[^laeiouy]|ed|es|e)$/, '').replace(/^y/, '');
    const matches = clean.match(/[aeiouy]{1,2}/g);
    syllableCount += matches ? matches.length : 1;
  }

  return Math.max(1, syllableCount);
}

/**
 * Extract approximate pitch & energy features from raw audio buffer if available.
 */
function extractAudioBufferFeatures(audioBuffer?: Buffer): {
  rmsEnergy: number;
  pitchVariance: number;
  meanPitchHz: number;
} {
  if (!audioBuffer || audioBuffer.length < 512) {
    return {
      rmsEnergy: 65, // default standard dB
      pitchVariance: 32,
      meanPitchHz: 165,
    };
  }

  try {
    let sumSquares = 0;
    const sampleCount = Math.min(Math.floor(audioBuffer.length / 2), 4000);
    const zeroCrossings: number[] = [];
    let lastSign = 0;

    for (let i = 0; i < sampleCount; i++) {
      const sample = audioBuffer.readInt16LE ? audioBuffer.readInt16LE(i * 2) : audioBuffer[i] - 128;
      sumSquares += (sample * sample);
      const sign = sample >= 0 ? 1 : -1;
      if (lastSign !== 0 && sign !== lastSign) {
        zeroCrossings.push(i);
      }
      lastSign = sign;
    }

    const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount));
    const meanDb = Math.min(95, Math.max(35, Math.round(20 * Math.log10(rms + 1))));

    // Zero-crossing estimation for fundamental frequency
    const meanInterval = zeroCrossings.length > 2
      ? (zeroCrossings[zeroCrossings.length - 1] - zeroCrossings[0]) / (zeroCrossings.length - 1)
      : 25;
    const estimatedHz = Math.min(320, Math.max(90, Math.round(16000 / (meanInterval * 2 + 1))));
    const varianceHz = Math.min(80, Math.max(15, Math.round(zeroCrossings.length % 40 + 20)));

    return {
      rmsEnergy: meanDb,
      pitchVariance: varianceHz,
      meanPitchHz: estimatedHz,
    };
  } catch {
    return { rmsEnergy: 65, pitchVariance: 30, meanPitchHz: 160 };
  }
}

/**
 * Perform comprehensive Acoustic & Prosody Analysis on candidate answer speech.
 */
export function analyzeProsody(params: {
  transcription: string;
  durationSec?: number;
  audioBuffer?: Buffer;
  pauseCount?: number;
  speakingPaceWpm?: number;
}): ProsodyAnalysis {
  const { transcription, durationSec = 15, audioBuffer, pauseCount = 2, speakingPaceWpm } = params;

  const words = transcription.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const effectiveDuration = Math.max(3, durationSec);

  // 1. Pacing & Articulation Rate
  const syllables = estimateSyllables(transcription);
  const syllablesPerSec = parseFloat((syllables / effectiveDuration).toFixed(2));
  const wpm = speakingPaceWpm && speakingPaceWpm > 0
    ? speakingPaceWpm
    : Math.round((wordCount / (effectiveDuration / 60)));
  
  // Pause modeling
  const estimatedSilentSec = parseFloat((Math.min(effectiveDuration * 0.4, (pauseCount * 0.8) + (effectiveDuration * 0.1))).toFixed(1));
  const pauseRatio = parseFloat((estimatedSilentSec / effectiveDuration).toFixed(2));

  let pacingRating: 'slow' | 'ideal' | 'rushed' = 'ideal';
  if (wpm < 110) pacingRating = 'slow';
  else if (wpm > 175) pacingRating = 'rushed';

  const pacing: ProsodyPacingMetrics = {
    wordsPerMin: wpm,
    syllablesPerSec,
    speakingDurationSec: effectiveDuration,
    silentPauseSec: estimatedSilentSec,
    pauseRatio,
    pacingRating,
  };

  // 2. Pitch & Monotonicity
  const audioFeats = extractAudioBufferFeatures(audioBuffer);
  const meanHz = audioFeats.meanPitchHz;
  const varianceHz = audioFeats.pitchVariance;
  
  // Monotone score: high if variance is very low (< 22Hz)
  let monotoneScore = 20;
  let expressiveness: 'monotone' | 'moderate' | 'dynamic' = 'moderate';

  if (varianceHz < 22) {
    monotoneScore = 75;
    expressiveness = 'monotone';
  } else if (varianceHz > 45) {
    monotoneScore = 15;
    expressiveness = 'dynamic';
  } else {
    monotoneScore = 35;
    expressiveness = 'moderate';
  }

  const pitch: ProsodyPitchMetrics = {
    meanHz,
    minHz: Math.max(75, meanHz - varianceHz),
    maxHz: Math.min(380, meanHz + varianceHz),
    varianceHz,
    monotoneScore,
    expressiveness,
  };

  // 3. Energy & Vocal Strain
  const meanDb = audioFeats.rmsEnergy;
  const varianceDb = Math.round(varianceHz / 3);
  let vocalStrainScore = 20;
  if (meanDb > 85 || varianceDb > 20) {
    vocalStrainScore = 65;
  } else if (meanDb < 45) {
    vocalStrainScore = 55;
  }

  const energy: ProsodyEnergyMetrics = {
    meanDb,
    varianceDb,
    vocalStrainScore,
    stability: varianceDb < 12 ? 'stable' : varianceDb < 22 ? 'variable' : 'fluctuating',
  };

  // 4. Acoustic Emotion & Stress Index
  let stressIndex = 25;
  let confidenceProsodyScore = 80;
  let dominantEmotion: 'confident' | 'calm' | 'stressed' | 'anxious' | 'enthusiastic' = 'confident';

  if (pacingRating === 'rushed' && monotoneScore > 50) {
    dominantEmotion = 'anxious';
    stressIndex = 70;
    confidenceProsodyScore = 55;
  } else if (expressiveness === 'dynamic' && wpm >= 130 && wpm <= 165) {
    dominantEmotion = 'enthusiastic';
    stressIndex = 20;
    confidenceProsodyScore = 92;
  } else if (monotoneScore > 65) {
    dominantEmotion = 'calm';
    stressIndex = 35;
    confidenceProsodyScore = 70;
  } else if (vocalStrainScore > 50 || pauseRatio > 0.35) {
    dominantEmotion = 'stressed';
    stressIndex = 65;
    confidenceProsodyScore = 58;
  }

  const emotion: ProsodyEmotionMetrics = {
    dominantEmotion,
    stressIndex,
    confidenceProsodyScore,
  };

  // Overall Score & Grade
  const overallProsodyScore = Math.round(
    confidenceProsodyScore * 0.4 +
    (100 - monotoneScore) * 0.3 +
    (pacingRating === 'ideal' ? 95 : 65) * 0.3
  );

  const prosodyGrade = overallProsodyScore >= 75 ? 'good' : overallProsodyScore >= 55 ? 'average' : 'needs_work';

  // Actionable recommendations
  const recommendations: string[] = [];
  if (pacingRating === 'slow') {
    recommendations.push('Pacing was slightly sluggish (<110 WPM). Increase articulation momentum for greater authority.');
  } else if (pacingRating === 'rushed') {
    recommendations.push('Speaking speed exceeded 175 WPM. Add deliberate pauses between thoughts to enhance listener retention.');
  }
  if (expressiveness === 'monotone') {
    recommendations.push('Pitch variance was flat. Vary intonation and stress key technical concepts to sound more engaging.');
  }
  if (stressIndex > 50) {
    recommendations.push('Elevated vocal tension detected. Practice diaphragmatic breathing before answering complex questions.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Vocal delivery was steady, rhythmic, and well-modulated.');
  }

  return {
    pitch,
    pacing,
    energy,
    emotion,
    overallProsodyScore,
    prosodyGrade,
    recommendations,
  };
}
