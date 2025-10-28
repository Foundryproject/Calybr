/**
 * Scoring Engine Tests
 */

import {
  calculateHardBrakingScore,
  calculateRapidAccelerationScore,
  calculateNightDrivingScore,
  calculateMileageScore,
  calculatePhoneDistractionScore,
  calculateImprovementBonus,
  isNightTrip,
} from '../config/scoring-config';

import {
  calculatePeriodScore,
  calculateDriverScore,
  getScoreGrade,
  type TripData,
  type ScoringPeriod,
} from '../services/scoring-engine.service';

describe('Scoring Config Functions', () => {
  describe('calculateHardBrakingScore', () => {
    it('should return 100 for zero hard brakes', () => {
      expect(calculateHardBrakingScore(0, 100)).toBe(100);
    });

    it('should return 50 for 2x the benchmark (2 per mile)', () => {
      // 2 hard brakes per mile (2x benchmark of 1.0)
      expect(calculateHardBrakingScore(200, 100)).toBe(50);
    });

    it('should return 75 for 1x the benchmark (1 per mile)', () => {
      // 1 hard brake per mile (1x benchmark)
      expect(calculateHardBrakingScore(100, 100)).toBe(75);
    });

    it('should return ~87.5 for 0.25x the benchmark', () => {
      // 0.25 hard brakes per mile
      const score = calculateHardBrakingScore(25, 100);
      expect(score).toBeGreaterThan(87);
      expect(score).toBeLessThan(88);
    });
  });

  describe('calculateRapidAccelerationScore', () => {
    it('should use same logic as hard braking', () => {
      expect(calculateRapidAccelerationScore(0, 100)).toBe(100);
      expect(calculateRapidAccelerationScore(200, 100)).toBe(50);
      expect(calculateRapidAccelerationScore(100, 100)).toBe(75);
    });
  });

  describe('calculateNightDrivingScore', () => {
    it('should return 100 for no night trips', () => {
      expect(calculateNightDrivingScore(0, 20)).toBe(100);
    });

    it('should return 0 for 30%+ night trips', () => {
      expect(calculateNightDrivingScore(6, 20)).toBeLessThanOrEqual(0);
    });

    it('should return ~67 for 10% night trips', () => {
      // 2 out of 20 = 10% (1/3 of max 30%)
      const score = calculateNightDrivingScore(2, 20);
      expect(score).toBeGreaterThan(66);
      expect(score).toBeLessThan(68);
    });
  });

  describe('calculateMileageScore', () => {
    it('should return 100 for average mileage', () => {
      expect(calculateMileageScore(10, 10)).toBe(100);
    });

    it('should penalize 1% per mile over average', () => {
      // 15 miles per trip vs 10 benchmark = 5 miles over = -5%
      expect(calculateMileageScore(15, 10)).toBe(95);
    });

    it('should not penalize for below average mileage', () => {
      expect(calculateMileageScore(5, 10)).toBe(100);
    });
  });

  describe('calculatePhoneDistractionScore', () => {
    it('should return 100 for zero phone events', () => {
      expect(calculatePhoneDistractionScore(0, 20)).toBe(100);
    });

    it('should return 50 for 2x the benchmark', () => {
      // 4 events per trip (2x benchmark of 2)
      expect(calculatePhoneDistractionScore(80, 20)).toBe(50);
    });
  });

  describe('calculateImprovementBonus', () => {
    it('should return 0 for no improvement', () => {
      expect(calculateImprovementBonus(70, 70)).toBe(0);
    });

    it('should return 0 for improvement less than 5%', () => {
      expect(calculateImprovementBonus(70, 68)).toBeLessThan(5);
    });

    it('should return 5 for 5% improvement', () => {
      expect(calculateImprovementBonus(70, 66.67)).toBeCloseTo(5, 0);
    });

    it('should cap at 10 for >10% improvement', () => {
      expect(calculateImprovementBonus(80, 70)).toBeCloseTo(10, 0);
      expect(calculateImprovementBonus(90, 70)).toBe(10);
    });
  });

  describe('isNightTrip', () => {
    it('should return true for 9 PM', () => {
      const date = new Date('2024-01-01T21:00:00');
      expect(isNightTrip(date)).toBe(true);
    });

    it('should return true for midnight', () => {
      const date = new Date('2024-01-01T00:00:00');
      expect(isNightTrip(date)).toBe(true);
    });

    it('should return true for 5 AM', () => {
      const date = new Date('2024-01-01T05:00:00');
      expect(isNightTrip(date)).toBe(true);
    });

    it('should return false for 6 AM', () => {
      const date = new Date('2024-01-01T06:00:00');
      expect(isNightTrip(date)).toBe(false);
    });

    it('should return false for noon', () => {
      const date = new Date('2024-01-01T12:00:00');
      expect(isNightTrip(date)).toBe(false);
    });

    it('should return false for 8 PM', () => {
      const date = new Date('2024-01-01T20:00:00');
      expect(isNightTrip(date)).toBe(false);
    });
  });
});

describe('Scoring Engine', () => {
  const createMockTrip = (overrides?: Partial<TripData>): TripData => ({
    id: Math.random().toString(),
    startTime: new Date('2024-01-15T12:00:00'),
    endTime: new Date('2024-01-15T12:30:00'),
    distance: 10,
    hardBrakes: 0,
    rapidAccelerations: 0,
    phoneUsageEvents: 0,
    ...overrides,
  });

  describe('calculatePeriodScore', () => {
    it('should calculate perfect score for perfect driving', () => {
      const period: ScoringPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        trips: [
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
        ],
      };

      const result = calculatePeriodScore(period);
      expect(result.finalScore).toBe(100);
      expect(result.baseScore).toBe(100);
    });

    it('should penalize hard braking', () => {
      const period: ScoringPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        trips: [
          createMockTrip({ hardBrakes: 20, distance: 10 }), // 2 per mile
          createMockTrip({ hardBrakes: 20, distance: 10 }),
          createMockTrip({ hardBrakes: 20, distance: 10 }),
          createMockTrip({ hardBrakes: 20, distance: 10 }),
          createMockTrip({ hardBrakes: 20, distance: 10 }),
        ],
      };

      const result = calculatePeriodScore(period);
      // Hard braking score should be 50 (2x benchmark)
      // Contribution: 50 * 0.25 = 12.5
      expect(result.hardBrakingScore).toBe(50);
      expect(result.hardBrakingContribution).toBeCloseTo(12.5, 0);
    });

    it('should handle night trips', () => {
      const period: ScoringPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        trips: [
          createMockTrip({ startTime: new Date('2024-01-15T22:00:00') }), // Night
          createMockTrip({ startTime: new Date('2024-01-15T23:00:00') }), // Night
          createMockTrip({ startTime: new Date('2024-01-15T12:00:00') }), // Day
          createMockTrip({ startTime: new Date('2024-01-15T14:00:00') }), // Day
          createMockTrip({ startTime: new Date('2024-01-15T16:00:00') }), // Day
        ],
      };

      const result = calculatePeriodScore(period);
      // 2 out of 5 trips = 40% night (over 30% threshold)
      expect(result.metrics.nightTrips).toBe(2);
    });

    it('should apply improvement bonus', () => {
      const period: ScoringPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        trips: [
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
        ],
      };

      // Previous score was 80, current is 90 (12.5% improvement)
      const result = calculatePeriodScore(period, 80);
      expect(result.improvementBonus).toBeGreaterThan(0);
      expect(result.finalScore).toBeGreaterThan(result.baseScore);
    });
  });

  describe('calculateDriverScore', () => {
    it('should compare current and previous periods', () => {
      const currentPeriod: ScoringPeriod = {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-29'),
        trips: [
          createMockTrip({ hardBrakes: 5, distance: 10 }),
          createMockTrip({ hardBrakes: 5, distance: 10 }),
          createMockTrip({ hardBrakes: 5, distance: 10 }),
          createMockTrip({ hardBrakes: 5, distance: 10 }),
          createMockTrip({ hardBrakes: 5, distance: 10 }),
        ],
      };

      const previousPeriod: ScoringPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        trips: [
          createMockTrip({ hardBrakes: 10, distance: 10 }),
          createMockTrip({ hardBrakes: 10, distance: 10 }),
          createMockTrip({ hardBrakes: 10, distance: 10 }),
          createMockTrip({ hardBrakes: 10, distance: 10 }),
          createMockTrip({ hardBrakes: 10, distance: 10 }),
        ],
      };

      const result = calculateDriverScore(currentPeriod, previousPeriod);
      
      expect(result.currentPeriod).toBeDefined();
      expect(result.previousPeriod).toBeDefined();
      expect(result.trend).toBe('improving');
      expect(result.percentChange).toBeGreaterThan(0);
    });

    it('should indicate new driver with no previous period', () => {
      const currentPeriod: ScoringPeriod = {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-29'),
        trips: [
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
          createMockTrip(),
        ],
      };

      const result = calculateDriverScore(currentPeriod);
      
      expect(result.previousPeriod).toBeUndefined();
      expect(result.trend).toBe('new');
      expect(result.percentChange).toBeUndefined();
    });
  });

  describe('getScoreGrade', () => {
    it('should return correct grades', () => {
      expect(getScoreGrade(95).grade).toBe('A');
      expect(getScoreGrade(85).grade).toBe('B');
      expect(getScoreGrade(75).grade).toBe('C');
      expect(getScoreGrade(65).grade).toBe('D');
      expect(getScoreGrade(50).grade).toBe('F');
    });

    it('should return correct labels', () => {
      expect(getScoreGrade(95).label).toBe('Excellent');
      expect(getScoreGrade(85).label).toBe('Good');
      expect(getScoreGrade(75).label).toBe('Average');
    });
  });
});

