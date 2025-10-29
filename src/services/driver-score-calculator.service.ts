/**
 * Driver Score Calculator Service
 * 
 * Calculates comprehensive driver score based on all trips
 * Score starts at 500 and adjusts with each trip
 * 
 * Scoring Components:
 * - Hard braking: 25%
 * - Rapid acceleration: 15%
 * - Night-time driving: 20%
 * - Mileage (exposure): 20%
 * - Phone distraction: 10%
 * - Improvement trend: +10% bonus
 */

import { Trip } from '../types/drive';

export interface TripScoreBreakdown {
  hardBraking: number; // 0-25
  rapidAcceleration: number; // 0-15
  nightDriving: number; // 0-20
  mileage: number; // 0-20
  phoneDistraction: number; // 0-10
  improvementBonus: number; // 0-10
  baseScore: number; // Sum of above (0-100)
  finalScore: number; // Base + improvement bonus
  speedViolations?: number; // Additional deductions
}

export interface DriverScoreData {
  overallScore: number; // Current overall score (starts at 500)
  tripScore: number; // Score for this specific trip (0-110)
  breakdown: TripScoreBreakdown;
  trend: 'improving' | 'stable' | 'declining';
  totalTrips: number;
  averageTripScore: number;
}

// Benchmarks for normalization (industry averages)
const BENCHMARKS = {
  hardBrakesPerMile: 1.0, // Average: 1 hard brake per mile
  rapidAccelsPerMile: 1.0, // Average: 1 rapid accel per mile
  nightDrivingPercentage: 0.2, // Average: 20% of trips at night
  avgMilesPerTrip: 10, // Average trip: 10 miles
  phoneUsagePerTrip: 2, // Average: 2 phone uses per trip
};

/**
 * Calculate score for a single trip
 */
export function calculateTripScore(
  trip: Trip,
  previousTrips: Trip[] = []
): TripScoreBreakdown {
  const breakdown: TripScoreBreakdown = {
    hardBraking: 0,
    rapidAcceleration: 0,
    nightDriving: 0,
    mileage: 0,
    phoneDistraction: 0,
    improvementBonus: 0,
    baseScore: 0,
    finalScore: 0,
  };

  // 1. Hard Braking (25%)
  const hardBrakeEvents = trip.events.filter(e => e.type === 'hard_brake').length;
  const hardBrakesPerMile = trip.distance > 0 ? hardBrakeEvents / trip.distance : 0;
  
  if (hardBrakesPerMile <= BENCHMARKS.hardBrakesPerMile) {
    // At or below average - full points
    breakdown.hardBraking = 25;
  } else {
    // Above average - deduct proportionally
    const ratio = BENCHMARKS.hardBrakesPerMile / hardBrakesPerMile;
    breakdown.hardBraking = Math.max(0, 25 * ratio);
  }

  // 2. Rapid Acceleration (15%)
  const accelEvents = trip.events.filter(e => e.type === 'rapid_acceleration').length;
  const accelsPerMile = trip.distance > 0 ? accelEvents / trip.distance : 0;
  
  if (accelsPerMile <= BENCHMARKS.rapidAccelsPerMile) {
    breakdown.rapidAcceleration = 15;
  } else {
    const ratio = BENCHMARKS.rapidAccelsPerMile / accelsPerMile;
    breakdown.rapidAcceleration = Math.max(0, 15 * ratio);
  }

  // 3. Night-time Driving (20%)
  const isNightTrip = isNightTime(trip.date, trip.startTime);
  const nightTrips = previousTrips.filter(t => isNightTime(t.date, t.startTime)).length;
  const totalTrips = previousTrips.length + 1;
  const nightPercentage = (nightTrips + (isNightTrip ? 1 : 0)) / totalTrips;
  
  if (nightPercentage <= BENCHMARKS.nightDrivingPercentage) {
    breakdown.nightDriving = 20;
  } else {
    const ratio = BENCHMARKS.nightDrivingPercentage / nightPercentage;
    breakdown.nightDriving = Math.max(0, 20 * ratio);
  }

  // 4. Mileage/Exposure (20%)
  // Lose 1% for miles over average
  const milesOverAverage = Math.max(0, trip.distance - BENCHMARKS.avgMilesPerTrip);
  const deduction = Math.min(20, milesOverAverage * 0.01 * 20);
  breakdown.mileage = Math.max(0, 20 - deduction);

  // 5. Phone Distraction (10%)
  const phoneEvents = trip.events.filter(e => e.type === 'phone_use').length;
  
  if (phoneEvents <= BENCHMARKS.phoneUsagePerTrip) {
    breakdown.phoneDistraction = 10;
  } else {
    const ratio = BENCHMARKS.phoneUsagePerTrip / phoneEvents;
    breakdown.phoneDistraction = Math.max(0, 10 * ratio);
  }

  // Calculate base score (before improvement bonus)
  breakdown.baseScore = 
    breakdown.hardBraking +
    breakdown.rapidAcceleration +
    breakdown.nightDriving +
    breakdown.mileage +
    breakdown.phoneDistraction;

  // 6. Speed Violations (additional deductions from base score)
  if (trip.speedViolations && trip.speedViolations.length > 0) {
    const minorCount = trip.speedViolations.filter(v => v.severity === 'minor').length;
    const moderateCount = trip.speedViolations.filter(v => v.severity === 'moderate').length;
    const severeCount = trip.speedViolations.filter(v => v.severity === 'severe').length;
    const extremeCount = trip.speedViolations.filter(v => v.severity === 'extreme').length;

    const speedDeduction = 
      (minorCount * 0.5) +      // -0.5 per minor violation
      (moderateCount * 2) +      // -2 per moderate
      (severeCount * 5) +        // -5 per severe
      (extremeCount * 10);       // -10 per extreme

    breakdown.speedViolations = speedDeduction;
    breakdown.baseScore = Math.max(0, breakdown.baseScore - speedDeduction);
  }

  // 7. Improvement Trend Bonus (up to +10%)
  if (previousTrips.length >= 3) {
    const recentTrips = previousTrips.slice(-3);
    const recentScores = recentTrips.map(t => t.score);
    const avgRecentScore = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    
    if (breakdown.baseScore > avgRecentScore) {
      const improvement = ((breakdown.baseScore - avgRecentScore) / avgRecentScore) * 10;
      breakdown.improvementBonus = Math.min(10, improvement);
    }
  }

  // Final trip score
  breakdown.finalScore = Math.min(110, breakdown.baseScore + breakdown.improvementBonus);

  return breakdown;
}

/**
 * Calculate overall driver score (cumulative, starts at 500)
 */
export function calculateDriverScore(
  allTrips: Trip[],
  currentScore: number = 500
): DriverScoreData {
  if (allTrips.length === 0) {
    return {
      overallScore: 500,
      tripScore: 0,
      breakdown: {
        hardBraking: 0,
        rapidAcceleration: 0,
        nightDriving: 0,
        mileage: 0,
        phoneDistraction: 0,
        improvementBonus: 0,
        baseScore: 0,
        finalScore: 0,
      },
      trend: 'stable',
      totalTrips: 0,
      averageTripScore: 0,
    };
  }

  // Get the most recent trip
  const latestTrip = allTrips[allTrips.length - 1];
  const previousTrips = allTrips.slice(0, -1);

  // Calculate score breakdown for the latest trip
  const tripBreakdown = calculateTripScore(latestTrip, previousTrips);

  // Calculate new overall score
  // Algorithm: Weight recent trips more heavily (exponential moving average)
  const ALPHA = 0.15; // Weight for new trip (15%)
  const tripScoreNormalized = (tripBreakdown.finalScore - 50) / 50 * 100; // Convert 0-110 to -100 to +120
  const scoreDelta = tripScoreNormalized * ALPHA;
  
  let newOverallScore = currentScore + scoreDelta;
  
  // Clamp between 0 and 1000
  newOverallScore = Math.max(0, Math.min(1000, newOverallScore));

  // Calculate trend
  const recentTrips = allTrips.slice(-5);
  const trend = calculateTrend(recentTrips);

  // Average trip score
  const totalTripScore = allTrips.reduce((sum, t) => sum + (t.score || 0), 0);
  const averageTripScore = totalTripScore / allTrips.length;

  return {
    overallScore: Math.round(newOverallScore),
    tripScore: Math.round(tripBreakdown.finalScore),
    breakdown: tripBreakdown,
    trend,
    totalTrips: allTrips.length,
    averageTripScore: Math.round(averageTripScore),
  };
}

/**
 * Determine if a trip is at night (8 PM - 6 AM)
 */
function isNightTime(date: Date, startTime: string): boolean {
  try {
    const hour = new Date(`${date.toDateString()} ${startTime}`).getHours();
    return hour >= 20 || hour < 6; // 8 PM to 6 AM
  } catch {
    return false;
  }
}

/**
 * Calculate trend from recent trips
 */
function calculateTrend(recentTrips: Trip[]): 'improving' | 'stable' | 'declining' {
  if (recentTrips.length < 3) return 'stable';

  const scores = recentTrips.map(t => t.score || 50);
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));

  const avgFirst = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

  const change = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 700) return '#4CAF50'; // Green - Excellent
  if (score >= 600) return '#8BC34A'; // Light Green - Good
  if (score >= 500) return '#FFC107'; // Amber - Average
  if (score >= 400) return '#FF9800'; // Orange - Below Average
  return '#F44336'; // Red - Poor
}

/**
 * Get score rating text
 */
export function getScoreRating(score: number): string {
  if (score >= 700) return 'Excellent';
  if (score >= 600) return 'Good';
  if (score >= 500) return 'Average';
  if (score >= 400) return 'Below Average';
  return 'Needs Improvement';
}

