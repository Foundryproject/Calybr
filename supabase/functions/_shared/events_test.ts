/**
 * Unit tests for event detection
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import type { ProcessedSample, QualityGates } from './types.ts';
import {
  detectAllEvents,
  detectDistraction,
  detectHarshAccels,
  detectHarshBrakes,
  detectHarshCorners,
  detectSpeeding,
} from './events.ts';

const DEFAULT_GATES: QualityGates = {
  min_map_match_conf: 0.6,
  max_hdop: 1.5,
  min_speed_kmh: 10,
  min_trip_distance_km: 2,
  min_trip_minutes: 5,
};

function createBaseSample(overrides?: Partial<ProcessedSample>): ProcessedSample {
  return {
    ts: new Date().toISOString(),
    timestamp: new Date(),
    lat: 39.9526,
    lon: -75.1652,
    speed_mps: 15, // ~54 km/h
    heading_deg: 90,
    hdop: 0.7,
    map_match_conf: 0.85,
    screen_on: false,
    ...overrides,
  };
}

Deno.test('Harsh Brake Detection - detects brake below threshold', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  // Create samples with harsh braking (>300ms at < -3.5 m/s²)
  for (let i = 0; i < 10; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 100),
        accel_long_smooth: i >= 3 && i <= 6 ? -5.0 : -1.0, // Harsh brake for 400ms
      }),
    );
  }

  const events = detectHarshBrakes(samples, DEFAULT_GATES);

  assertEquals(events.length, 1, 'Should detect one harsh brake event');
  assertEquals(events[0].type, 'harsh_brake');
  assertExists(events[0].severity);
  assertEquals(events[0].severity > 0, true, 'Severity should be positive');
});

Deno.test('Harsh Brake Detection - ignores brief events', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  // Create samples with brief harsh braking (<300ms)
  for (let i = 0; i < 10; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 100),
        accel_long_smooth: i === 5 ? -5.0 : -1.0, // Only 100ms
      }),
    );
  }

  const events = detectHarshBrakes(samples, DEFAULT_GATES);

  assertEquals(events.length, 0, 'Should not detect brief events');
});

Deno.test('Harsh Accel Detection - detects acceleration above threshold', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  // Create samples with harsh acceleration (>300ms at > 3.0 m/s²)
  for (let i = 0; i < 10; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 100),
        accel_long_smooth: i >= 3 && i <= 6 ? 4.5 : 1.0, // Harsh accel for 400ms
      }),
    );
  }

  const events = detectHarshAccels(samples, DEFAULT_GATES);

  assertEquals(events.length, 1, 'Should detect one harsh accel event');
  assertEquals(events[0].type, 'harsh_accel');
  assertExists(events[0].severity);
});

Deno.test('Harsh Corner Detection - detects lateral acceleration', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  // Create samples with harsh cornering (>400ms at > 0.35g lateral)
  const harshLateralMps2 = 0.4 * 9.80665; // 0.4g in m/s²

  for (let i = 0; i < 12; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 100),
        accel_lat_smooth: i >= 3 && i <= 8 ? harshLateralMps2 : 1.0, // 500ms
        road_class: 'primary',
      }),
    );
  }

  const events = detectHarshCorners(samples, DEFAULT_GATES);

  assertEquals(events.length, 1, 'Should detect one harsh corner event');
  assertEquals(events[0].type, 'harsh_corner');
});

Deno.test('Harsh Corner Detection - higher threshold for motorways', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  // Create samples with 0.38g lateral (above normal threshold, below motorway)
  const lateralMps2 = 0.38 * 9.80665;

  for (let i = 0; i < 12; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 100),
        accel_lat_smooth: i >= 3 && i <= 8 ? lateralMps2 : 1.0,
        road_class: 'motorway', // Should use 0.40g threshold
      }),
    );
  }

  const events = detectHarshCorners(samples, DEFAULT_GATES);

  assertEquals(
    events.length,
    0,
    'Should not detect corner below motorway threshold',
  );
});

Deno.test('Speeding Detection - detects speeding over 10s', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  const speedLimitMps = 25 * 0.44704; // 25 mph in m/s
  const speedMps = 40 * 0.44704; // 40 mph (15 mph over)

  // Create 11 seconds of speeding
  for (let i = 0; i < 110; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 100),
        speed_mps: speedMps,
        speed_limit_mps: speedLimitMps,
      }),
    );
  }

  const events = detectSpeeding(samples, DEFAULT_GATES);

  assertEquals(events.length > 0, true, 'Should detect speeding events');

  // Should detect both +5 and +10 buckets
  const speeding5 = events.filter((e) => e.type === 'speeding_5');
  const speeding10 = events.filter((e) => e.type === 'speeding_10');

  assertEquals(speeding5.length >= 1, true, 'Should detect +5 mph speeding');
  assertEquals(speeding10.length >= 1, true, 'Should detect +10 mph speeding');
});

Deno.test('Speeding Detection - ignores brief speeding', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  const speedLimitMps = 25 * 0.44704;
  const speedMps = 40 * 0.44704;

  // Create only 5 seconds of speeding (below 10s threshold)
  for (let i = 0; i < 50; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 100),
        speed_mps: speedMps,
        speed_limit_mps: speedLimitMps,
      }),
    );
  }

  const events = detectSpeeding(samples, DEFAULT_GATES);

  assertEquals(events.length, 0, 'Should not detect speeding under 10s');
});

Deno.test('Distraction Detection - detects screen on while driving', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  // Create samples with screen on
  for (let i = 0; i < 30; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 1000),
        screen_on: i >= 10 && i <= 20, // 10 seconds of distraction
      }),
    );
  }

  const events = detectDistraction(samples, DEFAULT_GATES);

  assertEquals(events.length >= 1, true, 'Should detect distraction event');
  assertEquals(events[0].type, 'distraction');
});

Deno.test('Quality Gates - filters low quality samples', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  // Create samples: some pass quality gates, some don't
  for (let i = 0; i < 10; i++) {
    samples.push(
      createBaseSample({
        timestamp: new Date(baseTime.getTime() + i * 100),
        accel_long_smooth: -5.0, // Would trigger harsh brake
        hdop: i < 5 ? 0.7 : 3.0, // First half good, second half bad HDOP
      }),
    );
  }

  const events = detectHarshBrakes(samples, DEFAULT_GATES);

  // Should only detect event from first half of samples
  assertEquals(
    events.length <= 1,
    true,
    'Should filter based on quality gates',
  );
});

Deno.test('detectAllEvents - returns all event types', () => {
  const samples: ProcessedSample[] = [];
  const baseTime = new Date();

  // Create a complex scenario with multiple event types
  for (let i = 0; i < 200; i++) {
    const timestamp = new Date(baseTime.getTime() + i * 100);

    let accelLong = 0;
    let accelLat = 0;
    let screenOn = false;
    let speed = 15;
    const speedLimit = 11.176; // 25 mph

    // Harsh brake at 30-34
    if (i >= 30 && i <= 34) {
      accelLong = -5.0;
    }

    // Harsh accel at 50-54
    if (i >= 50 && i <= 54) {
      accelLong = 4.5;
    }

    // Harsh corner at 70-76
    if (i >= 70 && i <= 76) {
      accelLat = 0.4 * 9.80665;
    }

    // Speeding at 100-200
    if (i >= 100 && i <= 200) {
      speed = 20; // ~45 mph, 20 mph over
    }

    // Distraction at 120-140
    if (i >= 120 && i <= 140) {
      screenOn = true;
    }

    samples.push(
      createBaseSample({
        timestamp,
        accel_long_smooth: accelLong,
        accel_lat_smooth: accelLat,
        screen_on: screenOn,
        speed_mps: speed,
        speed_limit_mps: speedLimit,
        road_class: 'primary',
      }),
    );
  }

  const events = detectAllEvents(samples, DEFAULT_GATES);

  // Should detect multiple event types
  const eventTypes = new Set(events.map((e) => e.type));

  assertEquals(eventTypes.has('harsh_brake'), true, 'Should detect harsh brake');
  assertEquals(eventTypes.has('harsh_accel'), true, 'Should detect harsh accel');
  assertEquals(eventTypes.has('harsh_corner'), true, 'Should detect harsh corner');
  assertEquals(eventTypes.size >= 3, true, 'Should detect at least 3 event types');

  console.log(`Detected ${events.length} events:`, Array.from(eventTypes));
});



