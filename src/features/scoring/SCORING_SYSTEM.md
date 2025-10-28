# 🎯 Driver Scoring System

## Overview

The Calybr Driver Scoring System calculates a comprehensive driver safety score (0-100) based on behavioral metrics collected during trips.

---

## Scoring Components

### Base Score Composition (100 points total)

| Component | Weight | Description |
|-----------|--------|-------------|
| **Hard Braking** | 25% | Frequency of sudden braking events per mile |
| **Rapid Acceleration** | 15% | Frequency of aggressive acceleration per mile |
| **Night-Time Driving** | 20% | Proportion of trips taken during night hours (9 PM - 6 AM) |
| **Mileage Exposure** | 20% | Miles driven over the average per trip |
| **Phone Distraction** | 10% | Phone usage events per trip |
| **Improvement Bonus** | +10% | Bonus applied if score improves vs. previous period |

---

## Scoring Logic

### 1. Hard Braking (25%)

**Formula:**
- Calculate: `hardBrakesPerMile = totalHardBrakes / totalMiles`
- Benchmark: 1.0 hard brakes per mile
- **Scoring:** If user has 2x the benchmark, they get 50% of points
  - Example: 2 hard brakes/mile vs. 1 benchmark = 50/100 raw score × 0.25 = 12.5 points

**Calculation:**
```typescript
const ratio = hardBrakesPerMile / 1.0;  // Compare to benchmark
const score = 100 * (1 - (ratio / 2));  // 0 brakes = 100, 2 brakes = 50
const contribution = score * 0.25;       // Apply 25% weight
```

### 2. Rapid Acceleration (15%)

**Same logic as Hard Braking:**
- Benchmark: 1.0 rapid acceleration per mile
- If user has 2x the benchmark → 50% of points
- Example: 2 rapid accels/mile vs. 1 benchmark = 50/100 × 0.15 = 7.5 points

### 3. Night-Time Driving (20%)

**Formula:**
- Calculate: `nightProportion = nightTrips / totalTrips`
- Threshold: 30% of trips at night is the maximum before penalty
- **Scoring:** 
  - 0% night trips = 100/100
  - 30% night trips = 0/100
  - 15% night trips = 50/100

**Night Hours:** 9 PM (21:00) to 6 AM (06:00)

### 4. Mileage Exposure (20%)

**Formula:**
- Calculate: `averageMilesPerTrip = totalMiles / totalTrips`
- Benchmark: 10 miles per trip (average)
- **Penalty:** Lose 1% for each mile over the average
  - Example: 15 miles/trip vs. 10 benchmark = 5 miles over = -5% = 95/100 × 0.20 = 19 points

### 5. Phone Distraction (10%)

**Formula:**
- Calculate: `phoneEventsPerTrip = totalPhoneEvents / totalTrips`
- Benchmark: 2 events per trip
- **Scoring:** If user has 2x the benchmark → 50% of points
  - Example: 4 events/trip vs. 2 benchmark = 50/100 × 0.10 = 5 points

### 6. Improvement Bonus (up to +10%)

**Applied AFTER base composite score:**
- Compare current period base score to previous period base score
- Need at least 5% improvement to qualify
- **Scaling:**
  - 5% improvement = +5 bonus points
  - 10% improvement = +10 bonus points (max)
  - No improvement or decline = 0 bonus

**Example:**
- Previous period: 70 points
- Current period: 77 points
- Improvement: (77-70)/70 × 100 = 10%
- **Bonus: +10 points**
- **Final Score: 77 + 10 = 87**

---

## Calculation Example

### Scenario: User with 30-day driving data

**Raw Data:**
- Total trips: 20
- Total miles: 200
- Hard brakes: 50
- Rapid accelerations: 30
- Phone events: 40
- Night trips: 4

**Step 1: Calculate Metrics**
```
hardBrakesPerMile = 50 / 200 = 0.25
rapidAccelsPerMile = 30 / 200 = 0.15
nightProportion = 4 / 20 = 0.20 (20%)
avgMilesPerTrip = 200 / 20 = 10
phoneEventsPerTrip = 40 / 20 = 2
```

**Step 2: Calculate Component Scores**
```
Hard Braking:
  ratio = 0.25 / 1.0 = 0.25
  score = 100 * (1 - 0.25/2) = 87.5
  contribution = 87.5 * 0.25 = 21.875 → 21.9 points

Rapid Acceleration:
  ratio = 0.15 / 1.0 = 0.15
  score = 100 * (1 - 0.15/2) = 92.5
  contribution = 92.5 * 0.15 = 13.875 → 13.9 points

Night Driving:
  nightProportion = 0.20 / 0.30 = 0.67
  score = 100 * (1 - 0.67) = 33
  contribution = 33 * 0.20 = 6.6 points

Mileage:
  milesOverAvg = 10 - 10 = 0
  penalty = 0
  score = 100
  contribution = 100 * 0.20 = 20 points

Phone Distraction:
  ratio = 2 / 2 = 1.0
  score = 100 * (1 - 1.0/2) = 50
  contribution = 50 * 0.10 = 5 points
```

**Step 3: Sum Base Score**
```
Base Score = 21.9 + 13.9 + 6.6 + 20 + 5 = 67.4 → 67 points
```

**Step 4: Apply Improvement Bonus** (if previous period exists)
```
If previous period score was 60:
  improvement = (67 - 60) / 60 × 100 = 11.7%
  bonus = min(11.7, 10) = 10 points

Final Score = 67 + 10 = 77 points
```

**Result: 77/100 (Grade: C - Average)**

---

## Score Grading

| Score Range | Grade | Label | Color |
|-------------|-------|-------|-------|
| 90-100 | A | Excellent | Green |
| 80-89 | B | Good | Blue |
| 70-79 | C | Average | Orange |
| 60-69 | D | Below Average | Dark Orange |
| 0-59 | F | Poor | Red |

---

## Measurement Period

- **Current Period:** Last 30 days
- **Previous Period:** 30-60 days ago
- **Minimum Trips Required:** 5 trips for valid score

---

## Usage Example

```typescript
import {
  calculateDriverScore,
  getCurrentPeriod,
  getPreviousPeriod,
  hasEnoughTrips,
  getScoreGrade,
  type TripData,
  type ScoringPeriod,
} from '@/features/scoring';

// Get trip data for current and previous periods
const currentPeriodDates = getCurrentPeriod();
const previousPeriodDates = getPreviousPeriod();

const currentTrips: TripData[] = await fetchTrips(
  currentPeriodDates.startDate,
  currentPeriodDates.endDate
);

const previousTrips: TripData[] = await fetchTrips(
  previousPeriodDates.startDate,
  previousPeriodDates.endDate
);

// Check if we have enough trips
if (!hasEnoughTrips(currentTrips.length)) {
  console.log('Need at least 5 trips for valid score');
  return;
}

// Calculate score
const currentPeriod: ScoringPeriod = {
  startDate: currentPeriodDates.startDate,
  endDate: currentPeriodDates.endDate,
  trips: currentTrips,
};

const previousPeriod: ScoringPeriod | undefined = hasEnoughTrips(previousTrips.length)
  ? {
      startDate: previousPeriodDates.startDate,
      endDate: previousPeriodDates.endDate,
      trips: previousTrips,
    }
  : undefined;

const result = calculateDriverScore(currentPeriod, previousPeriod);

// Display results
console.log('Final Score:', result.currentPeriod.finalScore);
console.log('Base Score:', result.currentPeriod.baseScore);
console.log('Improvement Bonus:', result.currentPeriod.improvementBonus);
console.log('Trend:', result.trend);
console.log('Percent Change:', result.percentChange);

const grade = getScoreGrade(result.currentPeriod.finalScore);
console.log('Grade:', grade.grade, '-', grade.label);

// Score breakdown
console.log('\nBreakdown:');
console.log('Hard Braking:', result.currentPeriod.hardBrakingContribution, '/ 25');
console.log('Rapid Acceleration:', result.currentPeriod.rapidAccelerationContribution, '/ 15');
console.log('Night Driving:', result.currentPeriod.nightDrivingContribution, '/ 20');
console.log('Mileage:', result.currentPeriod.mileageContribution, '/ 20');
console.log('Phone:', result.currentPeriod.phoneDistractionContribution, '/ 10');
```

---

## Configuration

All scoring parameters are configurable in `scoring-config.ts`:

```typescript
// Adjust weights
export const SCORING_WEIGHTS = {
  hardBraking: 0.25,
  rapidAcceleration: 0.15,
  nightDriving: 0.20,
  mileage: 0.20,
  phoneDistraction: 0.10,
  improvementBonus: 0.10,
};

// Adjust thresholds
export const SCORING_THRESHOLDS = {
  hardBrakingPerMile: { average: 1.0 },
  rapidAccelPerMile: { average: 1.0 },
  nightDriving: { maxProportion: 0.3 },
  mileage: { averageMilesPerTrip: 10, penaltyPerMileOver: 0.01 },
  phoneDistraction: { average: 2 },
};
```

---

## Testing

Run the scoring engine tests:

```bash
npm test src/features/scoring
```

---

**Last Updated:** October 28, 2024  
**Version:** 1.0.0

