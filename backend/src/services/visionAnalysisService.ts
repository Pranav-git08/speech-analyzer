import {
  VisionNonVerbalAnalysis,
  VisionExpressionMetrics,
  VisionEyeContactMetrics,
  VisionPostureMetrics,
  VisionFidgetingMetrics,
  BehavioralMetrics,
} from '../types';

/**
 * Perform vision and non-verbal presence analysis from frontend metrics or behavioral stream.
 */
export function analyzeVisionNonVerbal(params: {
  behavioralMetrics?: BehavioralMetrics;
  smileDurationSec?: number;
  fidgetingCount?: number;
  slouchCount?: number;
  durationSec?: number;
}): VisionNonVerbalAnalysis {
  const {
    behavioralMetrics,
    smileDurationSec = 3,
    fidgetingCount = 1,
    slouchCount = 0,
    durationSec = 20,
  } = params;

  const totalTime = Math.max(5, durationSec);
  const rawEyeContact = behavioralMetrics?.eyeContactPercent ?? 78;
  const eyeContactPercent = Math.min(100, Math.max(0, Math.round(rawEyeContact)));

  // 1. Expression Metrics
  const smileRatio = Math.min(0.4, smileDurationSec / totalTime);
  const smilePercent = Math.round(smileRatio * 100);
  const nervousPercent = behavioralMetrics?.avgConfidenceScore && behavioralMetrics.avgConfidenceScore < 50
    ? Math.round((100 - behavioralMetrics.avgConfidenceScore) * 0.4)
    : 10;
  const confusedPercent = behavioralMetrics?.pauseCount && behavioralMetrics.pauseCount > 4 ? 15 : 5;
  const focusedPercent = Math.max(20, 100 - (smilePercent + nervousPercent + confusedPercent + 20));
  const neutralPercent = Math.max(0, 100 - (smilePercent + focusedPercent + nervousPercent + confusedPercent));

  let dominantExpression: 'focused' | 'smiling' | 'neutral' | 'nervous' | 'confused' = 'focused';
  if (nervousPercent > 35) dominantExpression = 'nervous';
  else if (smilePercent > 30) dominantExpression = 'smiling';
  else if (confusedPercent > 30) dominantExpression = 'confused';
  else if (focusedPercent >= neutralPercent) dominantExpression = 'focused';
  else dominantExpression = 'neutral';

  const expressions: VisionExpressionMetrics = {
    smilePercent,
    focusedPercent,
    neutralPercent,
    nervousPercent,
    confusedPercent,
    dominantExpression,
  };

  // 2. Eye Contact & Gaze Drift
  const gazeDriftCount = Math.max(0, Math.round((100 - eyeContactPercent) / 15));
  const gazeStabilityScore = Math.min(100, Math.max(20, Math.round(eyeContactPercent * 0.9 + 10)));
  const rating: 'excellent' | 'adequate' | 'poor' =
    eyeContactPercent >= 75 ? 'excellent' : eyeContactPercent >= 50 ? 'adequate' : 'poor';

  const eyeContact: VisionEyeContactMetrics = {
    eyeContactPercent,
    gazeDriftCount,
    gazeStabilityScore,
    rating,
  };

  // 3. Posture & Head Pose
  const postureScore = Math.max(30, Math.min(100, 100 - (slouchCount * 18)));
  const postureType: 'upright' | 'slouching' | 'leaning' =
    slouchCount > 2 ? 'slouching' : slouchCount === 1 ? 'leaning' : 'upright';
  const nodCount = Math.max(1, Math.round(totalTime / 12));
  const headMovementStability = Math.min(100, Math.max(40, 95 - (gazeDriftCount * 5)));

  const posture: VisionPostureMetrics = {
    postureScore,
    postureType,
    headMovementStability,
    nodCount,
  };

  // 4. Fidgeting & Composure
  const fidgetingTickCount = fidgetingCount;
  const handNearFaceCount = fidgetingCount > 2 ? 2 : 0;
  const composureRating: 'high' | 'moderate' | 'low' =
    fidgetingTickCount <= 2 ? 'high' : fidgetingTickCount <= 5 ? 'moderate' : 'low';

  const fidgeting: VisionFidgetingMetrics = {
    fidgetingTickCount,
    handNearFaceCount,
    composureRating,
  };

  // 5. Overall Non-Verbal Score
  const overallNonVerbalScore = Math.round(
    eyeContactPercent * 0.4 +
    postureScore * 0.3 +
    (composureRating === 'high' ? 95 : composureRating === 'moderate' ? 70 : 45) * 0.3
  );

  // Recommendations
  const recommendations: string[] = [];
  if (eyeContactPercent < 60) {
    recommendations.push('Eye contact dipped below 60%. Position the webcam closer to eye level to maintain natural direct gaze.');
  }
  if (postureType === 'slouching') {
    recommendations.push('Slight posture slouching observed. Keep shoulders relaxed and spine upright for an open, confident presence.');
  }
  if (composureRating === 'low') {
    recommendations.push('Frequent hand or head fidgeting detected. Anchor hands naturally on the desk during responses.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Excellent non-verbal poise, high eye engagement, and composed body language throughout.');
  }

  return {
    expressions,
    eyeContact,
    posture,
    fidgeting,
    overallNonVerbalScore,
    recommendations,
  };
}
