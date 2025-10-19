/**
 * Trip feature extraction and normalization
 */

import type {
  DetectedEvent,
  EventType,
  ProcessedSample,
  TripContext,
  TripFeatures,
} from './types.ts';

/**
 * Count events by type
 */
export function countEventsByType(
  events: DetectedEvent[],
  type: EventType,
): number {
  return events.filter((e) => e.type === type).length;
}

/**
 * Sum duration of events by type (in minutes)
 */
export function sumEventDurationMinutes(
  events: DetectedEvent[],
  type: EventType,
): number {
  let totalMs = 0;
  for (const event of events) {
    if (event.type === type && event.ts_end) {
      totalMs += event.ts_end.getTime() - event.ts_start.getTime();
    }
  }
  return totalMs / 60000; // Convert to minutes
}

/**
 * Normalize event count per 100 km
 */
export function normalizeCountPer100Km(
  count: number,
  distanceKm: number,
): number {
  if (distanceKm <= 0) return 0;
  return (count / distanceKm) * 100;
}

/**
 * Extract trip features from events and context
 */
export function extractTripFeatures(
  events: DetectedEvent[],
  distanceKm: number,
  tripMinutes: number,
  context: TripContext,
): TripFeatures {
  // Count harsh events
  const harshBrakeCount = countEventsByType(events, 'harsh_brake');
  const harshAccelCount = countEventsByType(events, 'harsh_accel');
  const harshCornerCount = countEventsByType(events, 'harsh_corner');

  // Duration of speeding events (in minutes)
  const speedingMins5 = sumEventDurationMinutes(events, 'speeding_5');
  const speedingMins10 = sumEventDurationMinutes(events, 'speeding_10');
  const speedingMins20 = sumEventDurationMinutes(events, 'speeding_20');

  // Duration of distraction events (in minutes)
  const distractionMins = sumEventDurationMinutes(events, 'distraction');

  return {
    distance_km: distanceKm,
    trip_minutes: tripMinutes,
    harsh_brake_per_100km: normalizeCountPer100Km(
      harshBrakeCount,
      distanceKm,
    ),
    harsh_accel_per_100km: normalizeCountPer100Km(
      harshAccelCount,
      distanceKm,
    ),
    harsh_corner_per_100km: normalizeCountPer100Km(
      harshCornerCount,
      distanceKm,
    ),
    mins_speeding_5: speedingMins5,
    mins_speeding_10: speedingMins10,
    mins_speeding_20: speedingMins20,
    distraction_mins: distractionMins,
    night_fraction: context.night_fraction,
    weather_penalty_mins: context.weather_penalty_mins,
  };
}

/**
 * Calculate road mix from samples
 * Returns proportion of each road class
 */
export function calculateRoadMix(
  samples: ProcessedSample[],
): Record<string, number> {
  const roadClassCounts: Record<string, number> = {};
  let total = 0;

  for (const sample of samples) {
    if (sample.road_class) {
      roadClassCounts[sample.road_class] =
        (roadClassCounts[sample.road_class] || 0) + 1;
      total++;
    }
  }

  const roadMix: Record<string, number> = {};
  for (const [roadClass, count] of Object.entries(roadClassCounts)) {
    roadMix[roadClass] = count / total;
  }

  return roadMix;
}

/**
 * Calculate quality metrics from samples
 */
export function calculateQualityMetrics(
  samples: ProcessedSample[],
  minMapMatchConf: number,
  maxHdop: number,
): {
  samples_total: number;
  samples_passed_quality: number;
  quality_ratio: number;
} {
  let samplesPassedQuality = 0;

  for (const sample of samples) {
    let passed = true;

    // Check HDOP
    if (sample.hdop !== undefined && sample.hdop > maxHdop) {
      passed = false;
    }

    // Check map match confidence
    if (
      sample.map_match_conf !== undefined &&
      sample.map_match_conf < minMapMatchConf
    ) {
      passed = false;
    }

    if (passed) {
      samplesPassedQuality++;
    }
  }

  const qualityRatio = samples.length > 0
    ? samplesPassedQuality / samples.length
    : 0;

  return {
    samples_total: samples.length,
    samples_passed_quality: samplesPassedQuality,
    quality_ratio: qualityRatio,
  };
}

/**
 * Calculate night fraction (proportion of trip during 22:00-05:00 local time)
 * Simplified implementation using UTC
 * TODO: Use proper timezone conversion based on trip location
 */
export function calculateNightFraction(
  samples: ProcessedSample[],
): number {
  if (samples.length === 0) return 0;

  let nightMinutes = 0;
  let totalMinutes = 0;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];

    const dt = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 60000; // minutes
    totalMinutes += dt;

    // Check if current sample is at night (22:00-05:00)
    const hour = curr.timestamp.getUTCHours();
    if (hour >= 22 || hour < 5) {
      nightMinutes += dt;
    }
  }

  return totalMinutes > 0 ? nightMinutes / totalMinutes : 0;
}

/**
 * Calculate weather penalty minutes
 * TODO: Integrate with real weather API
 * For now, this is a stub that returns 0
 */
export function calculateWeatherPenalty(
  _samples: ProcessedSample[],
  _weatherData?: Record<string, unknown>,
): number {
  // TODO: Implement weather penalty calculation
  // Rain: +0.5x minutes, Snow/Ice: +1x minutes
  return 0;
}



