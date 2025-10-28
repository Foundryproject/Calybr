/**
 * Scoring Engine Service
 * 
 * Calculates driver scores based on trip data and behavioral metrics.
 */

import {
  SCORING_WEIGHTS,
  SCORING_PERIODS,
  calculateHardBrakingScore,
  calculateRapidAccelerationScore,
  calculateNightDrivingScore,
  calculateMileageScore,
  calculatePhoneDistractionScore,
  calculateImprovementBonus,
  isNightTrip,
} from '../config/scoring-config';

export interface TripData {
  id: string;
  startTime: Date;
  endTime: Date;
  distance: number; // in miles
  hardBrakes: number;
  rapidAccelerations: number;
  phoneUsageEvents: number;
  maxSpeed?: number;
  averageSpeed?: number;
}

export interface ScoringPeriod {
  startDate: Date;
  endDate: Date;
  trips: TripData[];
}

export interface ScoreBreakdown {
  // Component scores (0-100)
  hardBrakingScore: number;
  rapidAccelerationScore: number;
  nightDrivingScore: number;
  mileageScore: number;
  phoneDistractionScore: number;
  
  // Weighted contributions (after applying weights)
  hardBrakingContribution: number;
  rapidAccelerationContribution: number;
  nightDrivingContribution: number;
  mileageContribution: number;
  phoneDistractionContribution: number;
  
  // Base composite score (0-100)
  baseScore: number;
  
  // Improvement bonus (0-10)
  improvementBonus: number;
  
  // Final score (base + bonus, capped at 100)
  finalScore: number;
  
  // Raw metrics
  metrics: {
    totalTrips: number;
    totalMiles: number;
    totalHardBrakes: number;
    totalRapidAccelerations: number;
    totalPhoneEvents: number;
    nightTrips: number;
    averageMilesPerTrip: number;
    hardBrakesPerMile: number;
    rapidAccelsPerMile: number;
    phoneEventsPerTrip: number;
  };
}

export interface DriverScoreResult {
  currentPeriod: ScoreBreakdown;
  previousPeriod?: ScoreBreakdown;
  trend: 'improving' | 'stable' | 'declining' | 'new';
  percentChange?: number;
}

/**
 * Calculate metrics from trip data
 */
function calculateMetrics(trips: TripData[]) {
  const totalTrips = trips.length;
  const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalHardBrakes = trips.reduce((sum, trip) => sum + trip.hardBrakes, 0);
  const totalRapidAccelerations = trips.reduce((sum, trip) => sum + trip.rapidAccelerations, 0);
  const totalPhoneEvents = trips.reduce((sum, trip) => sum + trip.phoneUsageEvents, 0);
  const nightTrips = trips.filter(trip => isNightTrip(trip.startTime)).length;
  
  const averageMilesPerTrip = totalTrips > 0 ? totalMiles / totalTrips : 0;
  const hardBrakesPerMile = totalMiles > 0 ? totalHardBrakes / totalMiles : 0;
  const rapidAccelsPerMile = totalMiles > 0 ? totalRapidAccelerations / totalMiles : 0;
  const phoneEventsPerTrip = totalTrips > 0 ? totalPhoneEvents / totalTrips : 0;
  
  return {
    totalTrips,
    totalMiles,
    totalHardBrakes,
    totalRapidAccelerations,
    totalPhoneEvents,
    nightTrips,
    averageMilesPerTrip,
    hardBrakesPerMile,
    rapidAccelsPerMile,
    phoneEventsPerTrip,
  };
}

/**
 * Calculate score breakdown for a period
 */
export function calculatePeriodScore(
  period: ScoringPeriod,
  previousPeriodScore?: number
): ScoreBreakdown {
  const metrics = calculateMetrics(period.trips);
  
  // Calculate component scores (0-100 each)
  const hardBrakingScore = calculateHardBrakingScore(
    metrics.totalHardBrakes,
    metrics.totalMiles
  );
  
  const rapidAccelerationScore = calculateRapidAccelerationScore(
    metrics.totalRapidAccelerations,
    metrics.totalMiles
  );
  
  const nightDrivingScore = calculateNightDrivingScore(
    metrics.nightTrips,
    metrics.totalTrips
  );
  
  const mileageScore = calculateMileageScore(
    metrics.averageMilesPerTrip
  );
  
  const phoneDistractionScore = calculatePhoneDistractionScore(
    metrics.totalPhoneEvents,
    metrics.totalTrips
  );
  
  // Apply weights to get contributions
  const hardBrakingContribution = hardBrakingScore * SCORING_WEIGHTS.hardBraking;
  const rapidAccelerationContribution = rapidAccelerationScore * SCORING_WEIGHTS.rapidAcceleration;
  const nightDrivingContribution = nightDrivingScore * SCORING_WEIGHTS.nightDriving;
  const mileageContribution = mileageScore * SCORING_WEIGHTS.mileage;
  const phoneDistractionContribution = phoneDistractionScore * SCORING_WEIGHTS.phoneDistraction;
  
  // Calculate base composite score (0-100)
  const baseScore = Math.round(
    hardBrakingContribution +
    rapidAccelerationContribution +
    nightDrivingContribution +
    mileageContribution +
    phoneDistractionContribution
  );
  
  // Calculate improvement bonus
  const improvementBonus = previousPeriodScore 
    ? calculateImprovementBonus(baseScore, previousPeriodScore)
    : 0;
  
  // Final score = base + bonus (capped at 100)
  const finalScore = Math.min(100, Math.round(baseScore + improvementBonus));
  
  return {
    hardBrakingScore: Math.round(hardBrakingScore),
    rapidAccelerationScore: Math.round(rapidAccelerationScore),
    nightDrivingScore: Math.round(nightDrivingScore),
    mileageScore: Math.round(mileageScore),
    phoneDistractionScore: Math.round(phoneDistractionScore),
    
    hardBrakingContribution: Math.round(hardBrakingContribution * 10) / 10,
    rapidAccelerationContribution: Math.round(rapidAccelerationContribution * 10) / 10,
    nightDrivingContribution: Math.round(nightDrivingContribution * 10) / 10,
    mileageContribution: Math.round(mileageContribution * 10) / 10,
    phoneDistractionContribution: Math.round(phoneDistractionContribution * 10) / 10,
    
    baseScore,
    improvementBonus: Math.round(improvementBonus * 10) / 10,
    finalScore,
    
    metrics,
  };
}

/**
 * Calculate driver score with trend analysis
 */
export function calculateDriverScore(
  currentPeriod: ScoringPeriod,
  previousPeriod?: ScoringPeriod
): DriverScoreResult {
  // Calculate previous period score first (if exists)
  const previousScore = previousPeriod 
    ? calculatePeriodScore(previousPeriod)
    : undefined;
  
  // Calculate current period score (with improvement bonus if previous exists)
  const currentScore = calculatePeriodScore(
    currentPeriod,
    previousScore?.baseScore
  );
  
  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' | 'new' = 'new';
  let percentChange: number | undefined;
  
  if (previousScore) {
    const scoreDiff = currentScore.baseScore - previousScore.baseScore;
    percentChange = (scoreDiff / previousScore.baseScore) * 100;
    
    if (percentChange > 2) {
      trend = 'improving';
    } else if (percentChange < -2) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }
  }
  
  return {
    currentPeriod: currentScore,
    previousPeriod: previousScore,
    trend,
    percentChange: percentChange ? Math.round(percentChange * 10) / 10 : undefined,
  };
}

/**
 * Get scoring period dates (last 30 days)
 */
export function getCurrentPeriod(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - SCORING_PERIODS.measurementDays);
  
  return { startDate, endDate };
}

/**
 * Get previous scoring period dates (30-60 days ago)
 */
export function getPreviousPeriod(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - SCORING_PERIODS.measurementDays);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (SCORING_PERIODS.measurementDays * 2));
  
  return { startDate, endDate };
}

/**
 * Check if a period has enough trips for valid scoring
 */
export function hasEnoughTrips(tripCount: number): boolean {
  return tripCount >= SCORING_PERIODS.minTripsRequired;
}

/**
 * Get score grade based on final score
 */
export function getScoreGrade(score: number): { grade: string; label: string; color: string } {
  if (score >= 90) {
    return { grade: 'A', label: 'Excellent', color: '#10B981' };
  } else if (score >= 80) {
    return { grade: 'B', label: 'Good', color: '#3B82F6' };
  } else if (score >= 70) {
    return { grade: 'C', label: 'Average', color: '#F59E0B' };
  } else if (score >= 60) {
    return { grade: 'D', label: 'Below Average', color: '#F97316' };
  } else {
    return { grade: 'F', label: 'Poor', color: '#EF4444' };
  }
}

