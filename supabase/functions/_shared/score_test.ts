/**
 * Unit tests for scoring calculations
 */

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import type { ScoreWeights, TripFeatures } from './types.ts';
import {
  calculateTSS,
  determineConfidence,
  scoreTripWithBreakdown,
  updateDailyRDS,
  updateRDSWithSingleTrip,
} from './score.ts';

// Standard weights from requirements
const STANDARD_WEIGHTS: ScoreWeights = {
  version: '2025-10-19-a',
  w_a: 10, // harsh_accel
  w_b: 14, // harsh_brake
  w_c: 12, // harsh_corner
  w_s1: 2, // speeding_5
  w_s2: 6, // speeding_10
  w_s3: 12, // speeding_20
  w_d: 15, // distraction
  w_n: 2, // night
  w_w: 4, // weather
  alpha: 0.15,
};

const PERFECT_TRIP_FEATURES: TripFeatures = {
  distance_km: 10,
  trip_minutes: 20,
  harsh_brake_per_100km: 0,
  harsh_accel_per_100km: 0,
  harsh_corner_per_100km: 0,
  mins_speeding_5: 0,
  mins_speeding_10: 0,
  mins_speeding_20: 0,
  distraction_mins: 0,
  night_fraction: 0,
  weather_penalty_mins: 0,
};

Deno.test('TSS Calculation - perfect trip scores 1000', () => {
  const breakdown = calculateTSS(
    PERFECT_TRIP_FEATURES,
    STANDARD_WEIGHTS,
    'high',
  );

  assertEquals(breakdown.clamped_score, 1000, 'Perfect trip should score 1000');
  assertEquals(breakdown.total_deduction, 0, 'No deductions for perfect trip');
});

Deno.test('TSS Calculation - harsh brake deduction', () => {
  const features: TripFeatures = {
    ...PERFECT_TRIP_FEATURES,
    harsh_brake_per_100km: 5, // 5 harsh brakes per 100km
  };

  const breakdown = calculateTSS(features, STANDARD_WEIGHTS, 'high');

  // Expected deduction: 5 * 14 = 70
  assertEquals(
    breakdown.harsh_brake.deduction,
    70,
    'Should deduct 70 points',
  );
  assertEquals(
    breakdown.clamped_score,
    930,
    'Score should be 1000 - 70 = 930',
  );
});

Deno.test('TSS Calculation - multiple deductions', () => {
  const features: TripFeatures = {
    distance_km: 20,
    trip_minutes: 30,
    harsh_brake_per_100km: 2, // 2 * 14 = 28
    harsh_accel_per_100km: 3, // 3 * 10 = 30
    harsh_corner_per_100km: 1, // 1 * 12 = 12
    mins_speeding_5: 5, // 5 * 2 = 10
    mins_speeding_10: 2, // 2 * 6 = 12
    mins_speeding_20: 1, // 1 * 12 = 12
    distraction_mins: 3, // 3 * 15 = 45
    night_fraction: 0.5, // 0.5 * 30 * 2 = 30
    weather_penalty_mins: 5, // 5 * 4 = 20
  };

  const breakdown = calculateTSS(features, STANDARD_WEIGHTS, 'high');

  // Total deduction: 28 + 30 + 12 + 10 + 12 + 12 + 45 + 30 + 20 = 199
  const expectedDeduction = 199;
  const expectedScore = 1000 - expectedDeduction;

  assertEquals(
    breakdown.total_deduction,
    expectedDeduction,
    `Total deduction should be ${expectedDeduction}`,
  );
  assertEquals(
    breakdown.clamped_score,
    expectedScore,
    `Score should be ${expectedScore}`,
  );
});

Deno.test('TSS Calculation - clamping at minimum', () => {
  const features: TripFeatures = {
    distance_km: 10,
    trip_minutes: 20,
    harsh_brake_per_100km: 50, // Extreme value
    harsh_accel_per_100km: 50,
    harsh_corner_per_100km: 50,
    mins_speeding_5: 0,
    mins_speeding_10: 0,
    mins_speeding_20: 20,
    distraction_mins: 20,
    night_fraction: 1,
    weather_penalty_mins: 20,
  };

  const breakdown = calculateTSS(features, STANDARD_WEIGHTS, 'high');

  // Should clamp to minimum of 300
  assertEquals(
    breakdown.clamped_score,
    300,
    'Score should be clamped at 300',
  );
  assertEquals(
    breakdown.raw_score < 300,
    true,
    'Raw score should be below 300',
  );
});

Deno.test('TSS Calculation - low confidence halves penalties', () => {
  const features: TripFeatures = {
    ...PERFECT_TRIP_FEATURES,
    harsh_brake_per_100km: 10,
  };

  const highConfBreakdown = calculateTSS(features, STANDARD_WEIGHTS, 'high');
  const lowConfBreakdown = calculateTSS(features, STANDARD_WEIGHTS, 'low');

  // High confidence: 10 * 14 = 140
  // Low confidence: 10 * 14 * 0.5 = 70
  assertEquals(
    highConfBreakdown.harsh_brake.capped_deduction,
    140,
    'High confidence full penalty',
  );
  assertEquals(
    lowConfBreakdown.harsh_brake.capped_deduction,
    70,
    'Low confidence halved penalty',
  );
});

Deno.test('scoreTripWithBreakdown - creates complete trip score', () => {
  const tripId = 'test-trip-123';
  const features = PERFECT_TRIP_FEATURES;

  const tripScore = scoreTripWithBreakdown(
    tripId,
    features,
    STANDARD_WEIGHTS,
    'high',
  );

  assertEquals(tripScore.trip_id, tripId);
  assertEquals(tripScore.tss, 1000);
  assertEquals(tripScore.confidence, 'high');
  assertEquals(tripScore.weights_version, STANDARD_WEIGHTS.version);
  assertExists(tripScore.breakdown);
});

Deno.test('EMA - cold start initializes at 760', () => {
  const newTripScore = 850;
  const newTripDistance = 10;

  const rds = updateRDSWithSingleTrip(
    null, // Cold start
    newTripScore,
    newTripDistance,
    0.15,
  );

  // RDS = 0.15 * 850 + 0.85 * 760 = 127.5 + 646 = 773.5 ≈ 774
  assertEquals(rds, 774, 'Cold start RDS should blend with 760');
});

Deno.test('EMA - updates existing RDS', () => {
  const currentRds = 800;
  const newTripScore = 900;
  const newTripDistance = 10;
  const alpha = 0.15;

  const rds = updateRDSWithSingleTrip(
    currentRds,
    newTripScore,
    newTripDistance,
    alpha,
  );

  // RDS = 0.15 * 900 + 0.85 * 800 = 135 + 680 = 815
  assertEquals(rds, 815, 'Should apply EMA formula');
});

Deno.test('EMA - distance-weighted mean for multiple trips', () => {
  const currentRds = 800;
  const newTripScores = [900, 700]; // One good, one bad
  const newTripDistances = [10, 10]; // Equal weight
  const alpha = 0.15;

  const rds = updateDailyRDS(
    currentRds,
    newTripScores,
    newTripDistances,
    alpha,
  );

  // Mean TSS = (900*10 + 700*10) / (10+10) = 16000/20 = 800
  // RDS = 0.15 * 800 + 0.85 * 800 = 800
  assertEquals(rds, 800, 'Should use distance-weighted mean');
});

Deno.test('EMA - distance-weighted favors longer trip', () => {
  const currentRds = 800;
  const newTripScores = [900, 700];
  const newTripDistances = [30, 10]; // First trip 3x longer
  const alpha = 0.15;

  const rds = updateDailyRDS(
    currentRds,
    newTripScores,
    newTripDistances,
    alpha,
  );

  // Mean TSS = (900*30 + 700*10) / (30+10) = 34000/40 = 850
  // RDS = 0.15 * 850 + 0.85 * 800 = 127.5 + 680 = 807.5 ≈ 808
  assertEquals(rds, 808, 'Should favor longer trip in weighting');
});

Deno.test('EMA - clamps result to valid range', () => {
  // Test upper bound
  const highRds = updateRDSWithSingleTrip(1000, 1000, 10, 0.5);
  assertEquals(highRds, 1000, 'Should clamp to max 1000');

  // Test lower bound (would need very bad score)
  const lowRds = updateRDSWithSingleTrip(300, 300, 10, 0.5);
  assertEquals(lowRds, 300, 'Should clamp to min 300');
});

Deno.test('determineConfidence - returns high for >= 70%', () => {
  assertEquals(determineConfidence(0.7), 'high');
  assertEquals(determineConfidence(0.8), 'high');
  assertEquals(determineConfidence(0.99), 'high');
  assertEquals(determineConfidence(1.0), 'high');
});

Deno.test('determineConfidence - returns low for < 70%', () => {
  assertEquals(determineConfidence(0.69), 'low');
  assertEquals(determineConfidence(0.5), 'low');
  assertEquals(determineConfidence(0.1), 'low');
  assertEquals(determineConfidence(0), 'low');
});

Deno.test('TSS Calculation - breakdown includes all terms', () => {
  const features: TripFeatures = {
    distance_km: 10,
    trip_minutes: 20,
    harsh_brake_per_100km: 1,
    harsh_accel_per_100km: 1,
    harsh_corner_per_100km: 1,
    mins_speeding_5: 1,
    mins_speeding_10: 1,
    mins_speeding_20: 1,
    distraction_mins: 1,
    night_fraction: 0.5,
    weather_penalty_mins: 1,
  };

  const breakdown = calculateTSS(features, STANDARD_WEIGHTS, 'high');

  // Verify all terms are present
  assertExists(breakdown.harsh_accel);
  assertExists(breakdown.harsh_brake);
  assertExists(breakdown.harsh_corner);
  assertExists(breakdown.speeding_5);
  assertExists(breakdown.speeding_10);
  assertExists(breakdown.speeding_20);
  assertExists(breakdown.distraction);
  assertExists(breakdown.night);
  assertExists(breakdown.weather);

  // Verify each term has expected structure
  assertEquals(breakdown.harsh_brake.feature_value, 1);
  assertEquals(breakdown.harsh_brake.weight, 14);
  assertEquals(breakdown.harsh_brake.deduction, 14);

  // Verify weights version is stored
  assertEquals(breakdown.weights_version, STANDARD_WEIGHTS.version);
});



