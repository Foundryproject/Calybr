/**
 * Event detection logic for harsh driving behaviors
 */

import type { DetectedEvent, ProcessedSample, QualityGates } from './types.ts';
import {
  debounceSegments,
  filterSegmentsByDuration,
  getSegmentDuration,
  getSegmentMiddle,
  groupConsecutiveSamples,
} from './segment.ts';
import { gToMps2, mpsToKmh, mpsToMph } from './signal.ts';

// ============================================================================
// Thresholds
// ============================================================================

const HARSH_BRAKE_THRESHOLD = -3.5; // m/s²
const HARSH_ACCEL_THRESHOLD = 3.0; // m/s²
const HARSH_CORNER_THRESHOLD = 0.35; // g (lateral)
const HARSH_CORNER_MOTORWAY_THRESHOLD = 0.40; // g (higher for motorways)

const HARSH_BRAKE_MIN_DURATION_MS = 300;
const HARSH_ACCEL_MIN_DURATION_MS = 300;
const HARSH_CORNER_MIN_DURATION_MS = 400;
const SPEEDING_MIN_DURATION_MS = 10000; // 10 seconds

const SPEEDING_THRESHOLD_5_MPH = 5;
const SPEEDING_THRESHOLD_10_MPH = 10;
const SPEEDING_THRESHOLD_20_MPH = 20;

const DEBOUNCE_GAP_MS = 500; // Merge events within 500ms

// ============================================================================
// Quality Checks
// ============================================================================

function passesQualityGates(
  sample: ProcessedSample,
  gates: QualityGates,
): boolean {
  // Check speed threshold
  const speedKmh = mpsToKmh(sample.speed_mps);
  if (speedKmh < gates.min_speed_kmh) return false;

  // Check HDOP if available
  if (sample.hdop !== undefined && sample.hdop > gates.max_hdop) return false;

  // Check map match confidence if available
  if (
    sample.map_match_conf !== undefined &&
    sample.map_match_conf < gates.min_map_match_conf
  ) {
    return false;
  }

  return true;
}

// ============================================================================
// Harsh Brake Detection
// ============================================================================

export function detectHarshBrakes(
  samples: ProcessedSample[],
  gates: QualityGates,
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  // Find segments where longitudinal acceleration < threshold
  const segments = groupConsecutiveSamples(samples, (s) => {
    if (!passesQualityGates(s, gates)) return false;
    if (s.accel_long_smooth === undefined) return false;
    return s.accel_long_smooth < HARSH_BRAKE_THRESHOLD;
  });

  // Filter by duration
  const validSegments = filterSegmentsByDuration(
    segments,
    samples,
    HARSH_BRAKE_MIN_DURATION_MS,
  );

  // Debounce
  const debouncedSegments = debounceSegments(
    validSegments,
    samples,
    DEBOUNCE_GAP_MS,
  );

  for (const segment of debouncedSegments) {
    const startSample = samples[segment[0]];
    const endSample = samples[segment[segment.length - 1]];
    const middleSample = getSegmentMiddle(segment, samples);

    // Find peak (most negative) acceleration in segment
    let peakAccel = 0;
    for (const idx of segment) {
      const accel = samples[idx].accel_long_smooth ?? 0;
      if (accel < peakAccel) {
        peakAccel = accel;
      }
    }

    // Calculate severity: how much worse than threshold (clamped 0-1)
    const excessDecel = Math.abs(peakAccel - HARSH_BRAKE_THRESHOLD);
    const severity = Math.min(excessDecel / 3.0, 1.0);

    events.push({
      type: 'harsh_brake',
      ts_start: startSample.timestamp,
      ts_end: endSample.timestamp,
      severity,
      lat: middleSample.lat,
      lon: middleSample.lon,
      metadata: {
        peak_accel: peakAccel,
        duration_s: getSegmentDuration(segment, samples),
      },
    });
  }

  return events;
}

// ============================================================================
// Harsh Accel Detection
// ============================================================================

export function detectHarshAccels(
  samples: ProcessedSample[],
  gates: QualityGates,
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  const segments = groupConsecutiveSamples(samples, (s) => {
    if (!passesQualityGates(s, gates)) return false;
    if (s.accel_long_smooth === undefined) return false;
    return s.accel_long_smooth > HARSH_ACCEL_THRESHOLD;
  });

  const validSegments = filterSegmentsByDuration(
    segments,
    samples,
    HARSH_ACCEL_MIN_DURATION_MS,
  );

  const debouncedSegments = debounceSegments(
    validSegments,
    samples,
    DEBOUNCE_GAP_MS,
  );

  for (const segment of debouncedSegments) {
    const startSample = samples[segment[0]];
    const endSample = samples[segment[segment.length - 1]];
    const middleSample = getSegmentMiddle(segment, samples);

    // Find peak acceleration
    let peakAccel = 0;
    for (const idx of segment) {
      const accel = samples[idx].accel_long_smooth ?? 0;
      if (accel > peakAccel) {
        peakAccel = accel;
      }
    }

    const excessAccel = peakAccel - HARSH_ACCEL_THRESHOLD;
    const severity = Math.min(excessAccel / 3.0, 1.0);

    events.push({
      type: 'harsh_accel',
      ts_start: startSample.timestamp,
      ts_end: endSample.timestamp,
      severity,
      lat: middleSample.lat,
      lon: middleSample.lon,
      metadata: {
        peak_accel: peakAccel,
        duration_s: getSegmentDuration(segment, samples),
      },
    });
  }

  return events;
}

// ============================================================================
// Harsh Corner Detection
// ============================================================================

export function detectHarshCorners(
  samples: ProcessedSample[],
  gates: QualityGates,
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  const segments = groupConsecutiveSamples(samples, (s) => {
    if (!passesQualityGates(s, gates)) return false;
    if (s.accel_lat_smooth === undefined) return false;

    // Adjust threshold based on road class
    const threshold = s.road_class === 'motorway'
      ? HARSH_CORNER_MOTORWAY_THRESHOLD
      : HARSH_CORNER_THRESHOLD;

    const lateralG = Math.abs(s.accel_lat_smooth) / 9.80665;
    return lateralG > threshold;
  });

  const validSegments = filterSegmentsByDuration(
    segments,
    samples,
    HARSH_CORNER_MIN_DURATION_MS,
  );

  const debouncedSegments = debounceSegments(
    validSegments,
    samples,
    DEBOUNCE_GAP_MS,
  );

  for (const segment of debouncedSegments) {
    const startSample = samples[segment[0]];
    const endSample = samples[segment[segment.length - 1]];
    const middleSample = getSegmentMiddle(segment, samples);

    // Find peak lateral acceleration
    let peakLateralG = 0;
    for (const idx of segment) {
      const lateralG = Math.abs(samples[idx].accel_lat_smooth ?? 0) / 9.80665;
      if (lateralG > peakLateralG) {
        peakLateralG = lateralG;
      }
    }

    const threshold = middleSample.road_class === 'motorway'
      ? HARSH_CORNER_MOTORWAY_THRESHOLD
      : HARSH_CORNER_THRESHOLD;

    const excessLateral = peakLateralG - threshold;
    const severity = Math.min(excessLateral / threshold, 1.0);

    events.push({
      type: 'harsh_corner',
      ts_start: startSample.timestamp,
      ts_end: endSample.timestamp,
      severity,
      lat: middleSample.lat,
      lon: middleSample.lon,
      metadata: {
        peak_lateral_g: peakLateralG,
        road_class: middleSample.road_class,
        duration_s: getSegmentDuration(segment, samples),
      },
    });
  }

  return events;
}

// ============================================================================
// Speeding Detection
// ============================================================================

function detectSpeedingBucket(
  samples: ProcessedSample[],
  gates: QualityGates,
  thresholdMph: number,
  eventType: 'speeding_5' | 'speeding_10' | 'speeding_20',
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  const segments = groupConsecutiveSamples(samples, (s) => {
    if (!passesQualityGates(s, gates)) return false;
    if (s.speed_limit_mps === undefined) return false;

    const speedMph = mpsToMph(s.speed_mps);
    const limitMph = mpsToMph(s.speed_limit_mps);
    return speedMph >= limitMph + thresholdMph;
  });

  const validSegments = filterSegmentsByDuration(
    segments,
    samples,
    SPEEDING_MIN_DURATION_MS,
  );

  const debouncedSegments = debounceSegments(
    validSegments,
    samples,
    DEBOUNCE_GAP_MS,
  );

  for (const segment of debouncedSegments) {
    const startSample = samples[segment[0]];
    const endSample = samples[segment[segment.length - 1]];
    const middleSample = getSegmentMiddle(segment, samples);

    // Find max excess speed
    let maxExcess = 0;
    for (const idx of segment) {
      const s = samples[idx];
      if (s.speed_limit_mps === undefined) continue;
      const excess = mpsToMph(s.speed_mps - s.speed_limit_mps);
      if (excess > maxExcess) {
        maxExcess = excess;
      }
    }

    const severity = Math.min((maxExcess - thresholdMph) / thresholdMph, 1.0);

    events.push({
      type: eventType,
      ts_start: startSample.timestamp,
      ts_end: endSample.timestamp,
      severity,
      lat: middleSample.lat,
      lon: middleSample.lon,
      metadata: {
        max_excess_mph: maxExcess,
        duration_s: getSegmentDuration(segment, samples),
      },
    });
  }

  return events;
}

export function detectSpeeding(
  samples: ProcessedSample[],
  gates: QualityGates,
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  events.push(
    ...detectSpeedingBucket(
      samples,
      gates,
      SPEEDING_THRESHOLD_5_MPH,
      'speeding_5',
    ),
  );
  events.push(
    ...detectSpeedingBucket(
      samples,
      gates,
      SPEEDING_THRESHOLD_10_MPH,
      'speeding_10',
    ),
  );
  events.push(
    ...detectSpeedingBucket(
      samples,
      gates,
      SPEEDING_THRESHOLD_20_MPH,
      'speeding_20',
    ),
  );

  return events;
}

// ============================================================================
// Distraction Detection
// ============================================================================

export function detectDistraction(
  samples: ProcessedSample[],
  gates: QualityGates,
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  // TODO: Add isNavigationApp flag from client
  // For now, detect any screen_on while driving above threshold speed
  const segments = groupConsecutiveSamples(samples, (s) => {
    if (!passesQualityGates(s, gates)) return false;
    return s.screen_on === true;
  });

  // No minimum duration filter - we want to capture all distraction periods
  const debouncedSegments = debounceSegments(
    segments,
    samples,
    DEBOUNCE_GAP_MS,
  );

  for (const segment of debouncedSegments) {
    const startSample = samples[segment[0]];
    const endSample = samples[segment[segment.length - 1]];
    const middleSample = getSegmentMiddle(segment, samples);

    const duration_s = getSegmentDuration(segment, samples);

    // Severity based on duration (longer = more severe)
    const severity = Math.min(duration_s / 60, 1.0); // Cap at 1 minute

    events.push({
      type: 'distraction',
      ts_start: startSample.timestamp,
      ts_end: endSample.timestamp,
      severity,
      lat: middleSample.lat,
      lon: middleSample.lon,
      metadata: {
        duration_s,
      },
    });
  }

  return events;
}

// ============================================================================
// Master Detection Function
// ============================================================================

export function detectAllEvents(
  samples: ProcessedSample[],
  gates: QualityGates,
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  events.push(...detectHarshBrakes(samples, gates));
  events.push(...detectHarshAccels(samples, gates));
  events.push(...detectHarshCorners(samples, gates));
  events.push(...detectSpeeding(samples, gates));
  events.push(...detectDistraction(samples, gates));

  // Sort by timestamp
  events.sort((a, b) => a.ts_start.getTime() - b.ts_start.getTime());

  return events;
}



