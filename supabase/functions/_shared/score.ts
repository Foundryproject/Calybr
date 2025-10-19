/**
 * Trip Safety Score (TSS) calculation and EMA updates
 */

import type {
  ScoreBreakdown,
  ScoreBreakdownTerm,
  ScoreWeights,
  TripFeatures,
  TripScore,
} from './types.ts';

const BASE_SCORE = 1000;
const MIN_SCORE = 300;
const MAX_SCORE = 1000;
const COLD_START_RDS = 760; // Neutral-good starting score

/**
 * Create a breakdown term with optional capping
 */
function createBreakdownTerm(
  featureValue: number,
  weight: number,
  cap?: number,
): ScoreBreakdownTerm {
  const deduction = featureValue * weight;
  const cappedDeduction = cap !== undefined
    ? Math.min(deduction, cap)
    : deduction;

  return {
    feature_value: featureValue,
    weight,
    deduction,
    capped_deduction: cappedDeduction,
  };
}

/**
 * Calculate Trip Safety Score (TSS) from features and weights
 * Returns score with detailed breakdown
 */
export function calculateTSS(
  features: TripFeatures,
  weights: ScoreWeights,
  confidence: 'high' | 'low',
): ScoreBreakdown {
  // If confidence is low, halve the penalty weights
  const weightMultiplier = confidence === 'low' ? 0.5 : 1.0;

  // Calculate each term with optional capping
  const harshAccelTerm = createBreakdownTerm(
    features.harsh_accel_per_100km,
    weights.w_a * weightMultiplier,
    weights.cap_harsh_accel,
  );

  const harshBrakeTerm = createBreakdownTerm(
    features.harsh_brake_per_100km,
    weights.w_b * weightMultiplier,
    weights.cap_harsh_brake,
  );

  const harshCornerTerm = createBreakdownTerm(
    features.harsh_corner_per_100km,
    weights.w_c * weightMultiplier,
    weights.cap_harsh_corner,
  );

  const speeding5Term = createBreakdownTerm(
    features.mins_speeding_5,
    weights.w_s1 * weightMultiplier,
    weights.cap_speeding_5,
  );

  const speeding10Term = createBreakdownTerm(
    features.mins_speeding_10,
    weights.w_s2 * weightMultiplier,
    weights.cap_speeding_10,
  );

  const speeding20Term = createBreakdownTerm(
    features.mins_speeding_20,
    weights.w_s3 * weightMultiplier,
    weights.cap_speeding_20,
  );

  const distractionTerm = createBreakdownTerm(
    features.distraction_mins,
    weights.w_d * weightMultiplier,
    weights.cap_distraction,
  );

  const nightTerm = createBreakdownTerm(
    features.night_fraction * features.trip_minutes,
    weights.w_n * weightMultiplier,
    weights.cap_night,
  );

  const weatherTerm = createBreakdownTerm(
    features.weather_penalty_mins,
    weights.w_w * weightMultiplier,
    weights.cap_weather,
  );

  // Sum all capped deductions
  const totalDeduction = harshAccelTerm.capped_deduction +
    harshBrakeTerm.capped_deduction +
    harshCornerTerm.capped_deduction +
    speeding5Term.capped_deduction +
    speeding10Term.capped_deduction +
    speeding20Term.capped_deduction +
    distractionTerm.capped_deduction +
    nightTerm.capped_deduction +
    weatherTerm.capped_deduction;

  // Calculate raw and clamped score
  const rawScore = BASE_SCORE - totalDeduction;
  const clampedScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, rawScore));

  return {
    base: BASE_SCORE,
    harsh_accel: harshAccelTerm,
    harsh_brake: harshBrakeTerm,
    harsh_corner: harshCornerTerm,
    speeding_5: speeding5Term,
    speeding_10: speeding10Term,
    speeding_20: speeding20Term,
    distraction: distractionTerm,
    night: nightTerm,
    weather: weatherTerm,
    total_deduction: totalDeduction,
    raw_score: rawScore,
    clamped_score: clampedScore,
    weights_version: weights.version,
  };
}

/**
 * Create a TripScore object from features and weights
 */
export function scoreTripWithBreakdown(
  tripId: string,
  features: TripFeatures,
  weights: ScoreWeights,
  confidence: 'high' | 'low',
): TripScore {
  const breakdown = calculateTSS(features, weights, confidence);

  return {
    trip_id: tripId,
    tss: Math.round(breakdown.clamped_score),
    breakdown,
    confidence,
    weights_version: weights.version,
  };
}

/**
 * Update or create daily Rolling Driver Score (RDS) using EMA
 * 
 * @param currentRds - current RDS for the day (or null if first trip)
 * @param newTripScores - array of new trip scores for the day
 * @param newTripDistances - corresponding distances in km
 * @param alpha - EMA smoothing factor (0-1)
 * @returns updated RDS
 */
export function updateDailyRDS(
  currentRds: number | null,
  newTripScores: number[],
  newTripDistances: number[],
  alpha: number,
): number {
  if (newTripScores.length === 0) {
    return currentRds ?? COLD_START_RDS;
  }

  // Calculate distance-weighted mean of new trip scores
  let totalWeightedScore = 0;
  let totalDistance = 0;

  for (let i = 0; i < newTripScores.length; i++) {
    const score = newTripScores[i];
    const distance = newTripDistances[i];
    totalWeightedScore += score * distance;
    totalDistance += distance;
  }

  const meanTSS = totalDistance > 0
    ? totalWeightedScore / totalDistance
    : newTripScores[0];

  // Apply EMA
  const previousRds = currentRds ?? COLD_START_RDS;
  const newRds = alpha * meanTSS + (1 - alpha) * previousRds;

  // Clamp to valid range
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(newRds)));
}

/**
 * Calculate EMA for a single new trip score
 * Convenience function for updating with one trip at a time
 */
export function updateRDSWithSingleTrip(
  currentRds: number | null,
  newTripScore: number,
  newTripDistance: number,
  alpha: number,
): number {
  return updateDailyRDS(
    currentRds,
    [newTripScore],
    [newTripDistance],
    alpha,
  );
}

/**
 * Determine confidence level based on quality ratio
 * If <70% samples pass quality gates, confidence is 'low'
 */
export function determineConfidence(qualityRatio: number): 'high' | 'low' {
  return qualityRatio >= 0.7 ? 'high' : 'low';
}



