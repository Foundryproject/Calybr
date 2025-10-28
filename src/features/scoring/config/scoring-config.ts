/**
 * Scoring Configuration
 * 
 * Defines weights, thresholds, and scoring parameters for the driver scoring system.
 */

export const SCORING_WEIGHTS = {
  hardBraking: 0.25,        // 25%
  rapidAcceleration: 0.15,  // 15%
  nightDriving: 0.20,       // 20%
  mileage: 0.20,            // 20%
  phoneDistraction: 0.10,   // 10%
  improvementBonus: 0.10,   // up to +10% (applied after base composite)
} as const;

export const SCORING_THRESHOLDS = {
  // Hard braking: Average hard brakes per mile threshold
  hardBrakingPerMile: {
    excellent: 0.5,   // Less than 0.5 per mile = excellent
    average: 1.0,     // 1 per mile = average benchmark
    poor: 2.0,        // More than 2 per mile = poor
  },
  
  // Rapid acceleration: Average rapid accelerations per mile threshold
  rapidAccelPerMile: {
    excellent: 0.5,   // Less than 0.5 per mile = excellent
    average: 1.0,     // 1 per mile = average benchmark
    poor: 2.0,        // More than 2 per mile = poor
  },
  
  // Night driving: Proportion of trips during night hours
  nightDriving: {
    nightStartHour: 21,  // 9 PM
    nightEndHour: 6,     // 6 AM
    maxProportion: 0.3,  // Lose points if more than 30% of trips are at night
  },
  
  // Mileage: Miles over average per trip
  mileage: {
    averageMilesPerTrip: 10,  // Benchmark average (can be adjusted based on user data)
    penaltyPerMileOver: 0.01, // Lose 1% for each mile over average
  },
  
  // Phone distraction: Phone usage events per trip
  phoneDistraction: {
    excellent: 0,     // No phone usage
    average: 2,       // 2 events per trip = average
    poor: 5,          // 5+ events per trip = poor
  },
  
  // Improvement trend: Compare current period to previous
  improvement: {
    minPeriodsForBonus: 2,     // Need at least 2 periods to calculate improvement
    maxBonusPercent: 10,       // Maximum 10% bonus
    improvementThreshold: 5,   // Need at least 5% improvement to get bonus
  },
} as const;

export const SCORING_PERIODS = {
  measurementDays: 30,  // Calculate score over 30-day period
  minTripsRequired: 5,  // Need at least 5 trips for valid score
} as const;

/**
 * Calculate hard braking score (0-100)
 * If average is 1 per mile and user has 2, they get 50% of max points
 */
export function calculateHardBrakingScore(
  totalHardBrakes: number,
  totalMiles: number
): number {
  if (totalMiles === 0) return 100;
  
  const hardBrakesPerMile = totalHardBrakes / totalMiles;
  const benchmark = SCORING_THRESHOLDS.hardBrakingPerMile.average;
  
  // If user has 2x the benchmark (2 per mile vs 1), they get 50% of points
  // If user has 0, they get 100%
  const ratio = Math.min(hardBrakesPerMile / benchmark, 2); // Cap at 2x
  const score = 100 * (1 - (ratio / 2));
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate rapid acceleration score (0-100)
 * Same logic as hard braking
 */
export function calculateRapidAccelerationScore(
  totalRapidAccels: number,
  totalMiles: number
): number {
  if (totalMiles === 0) return 100;
  
  const rapidAccelsPerMile = totalRapidAccels / totalMiles;
  const benchmark = SCORING_THRESHOLDS.rapidAccelPerMile.average;
  
  const ratio = Math.min(rapidAccelsPerMile / benchmark, 2);
  const score = 100 * (1 - (ratio / 2));
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate night driving score (0-100)
 * Based on proportion of trips taken during night hours
 */
export function calculateNightDrivingScore(
  nightTrips: number,
  totalTrips: number
): number {
  if (totalTrips === 0) return 100;
  
  const nightProportion = nightTrips / totalTrips;
  const maxProportion = SCORING_THRESHOLDS.nightDriving.maxProportion;
  
  // If 30% or more trips are at night, score is 0
  // If 0% trips are at night, score is 100
  const score = 100 * (1 - (nightProportion / maxProportion));
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate mileage exposure score (0-100)
 * Lose 1% for each mile over the average per trip
 */
export function calculateMileageScore(
  averageMilesPerTrip: number,
  benchmarkAverage: number = SCORING_THRESHOLDS.mileage.averageMilesPerTrip
): number {
  const milesOverAverage = Math.max(0, averageMilesPerTrip - benchmarkAverage);
  const penaltyPercent = milesOverAverage * SCORING_THRESHOLDS.mileage.penaltyPerMileOver;
  
  const score = 100 - (penaltyPercent * 100);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate phone distraction score (0-100)
 * Based on average phone usage events per trip
 */
export function calculatePhoneDistractionScore(
  totalPhoneEvents: number,
  totalTrips: number
): number {
  if (totalTrips === 0) return 100;
  
  const phoneEventsPerTrip = totalPhoneEvents / totalTrips;
  const benchmark = SCORING_THRESHOLDS.phoneDistraction.average;
  
  // Similar logic: if user has 2x the benchmark, they get 50% of points
  const ratio = Math.min(phoneEventsPerTrip / benchmark, 2);
  const score = 100 * (1 - (ratio / 2));
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate improvement bonus (0-10)
 * Compare current period score to previous period
 */
export function calculateImprovementBonus(
  currentScore: number,
  previousScore: number
): number {
  if (previousScore === 0) return 0;
  
  const improvementPercent = ((currentScore - previousScore) / previousScore) * 100;
  
  // Need at least 5% improvement to get bonus
  if (improvementPercent < SCORING_THRESHOLDS.improvement.improvementThreshold) {
    return 0;
  }
  
  // Scale bonus from 0-10 based on improvement
  // 5% improvement = 5 bonus points
  // 10% improvement = 10 bonus points
  const bonus = Math.min(improvementPercent, SCORING_THRESHOLDS.improvement.maxBonusPercent);
  
  return Math.max(0, bonus);
}

/**
 * Check if trip is during night hours
 */
export function isNightTrip(tripStartTime: Date): boolean {
  const hour = tripStartTime.getHours();
  const { nightStartHour, nightEndHour } = SCORING_THRESHOLDS.nightDriving;
  
  // Night is from 9 PM to 6 AM
  return hour >= nightStartHour || hour < nightEndHour;
}

