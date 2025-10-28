/**
 * Unit tests for feature extraction
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import type { DetectedEvent, TripContext } from './types.ts';
import {
  countEventsByType,
  extractTripFeatures,
  normalizeCountPer100Km,
  sumEventDurationMinutes,
} from './features.ts';

Deno.test('countEventsByType - counts correct event type', () => {
  const events: DetectedEvent[] = [
    {
      type: 'harsh_brake',
      ts_start: new Date(),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
    {
      type: 'harsh_brake',
      ts_start: new Date(),
      severity: 0.6,
      lat: 0,
      lon: 0,
    },
    {
      type: 'harsh_accel',
      ts_start: new Date(),
      severity: 0.4,
      lat: 0,
      lon: 0,
    },
  ];

  assertEquals(countEventsByType(events, 'harsh_brake'), 2);
  assertEquals(countEventsByType(events, 'harsh_accel'), 1);
  assertEquals(countEventsByType(events, 'harsh_corner'), 0);
});

Deno.test('sumEventDurationMinutes - calculates duration correctly', () => {
  const baseTime = new Date('2025-10-19T10:00:00Z');
  const events: DetectedEvent[] = [
    {
      type: 'speeding_5',
      ts_start: new Date(baseTime.getTime()),
      ts_end: new Date(baseTime.getTime() + 60000), // 1 minute
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
    {
      type: 'speeding_5',
      ts_start: new Date(baseTime.getTime() + 120000),
      ts_end: new Date(baseTime.getTime() + 240000), // 2 minutes
      severity: 0.6,
      lat: 0,
      lon: 0,
    },
    {
      type: 'speeding_10',
      ts_start: new Date(baseTime.getTime()),
      ts_end: new Date(baseTime.getTime() + 30000), // 0.5 minutes
      severity: 0.7,
      lat: 0,
      lon: 0,
    },
  ];

  const speeding5Duration = sumEventDurationMinutes(events, 'speeding_5');
  const speeding10Duration = sumEventDurationMinutes(events, 'speeding_10');

  assertEquals(speeding5Duration, 3, 'Should sum to 3 minutes');
  assertEquals(speeding10Duration, 0.5, 'Should be 0.5 minutes');
});

Deno.test('sumEventDurationMinutes - handles events without end time', () => {
  const events: DetectedEvent[] = [
    {
      type: 'harsh_brake',
      ts_start: new Date(),
      // No ts_end
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
  ];

  const duration = sumEventDurationMinutes(events, 'harsh_brake');
  assertEquals(duration, 0, 'Should return 0 for events without end time');
});

Deno.test('normalizeCountPer100Km - normalizes correctly', () => {
  assertEquals(normalizeCountPer100Km(5, 10), 50);
  assertEquals(normalizeCountPer100Km(2, 25), 8);
  assertEquals(normalizeCountPer100Km(10, 100), 10);
  assertEquals(normalizeCountPer100Km(1, 5), 20);
});

Deno.test('normalizeCountPer100Km - handles zero distance', () => {
  assertEquals(normalizeCountPer100Km(5, 0), 0);
});

Deno.test('extractTripFeatures - calculates all features', () => {
  const baseTime = new Date('2025-10-19T10:00:00Z');
  const events: DetectedEvent[] = [
    // 3 harsh brakes
    {
      type: 'harsh_brake',
      ts_start: new Date(baseTime.getTime()),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
    {
      type: 'harsh_brake',
      ts_start: new Date(baseTime.getTime() + 1000),
      severity: 0.6,
      lat: 0,
      lon: 0,
    },
    {
      type: 'harsh_brake',
      ts_start: new Date(baseTime.getTime() + 2000),
      severity: 0.7,
      lat: 0,
      lon: 0,
    },
    // 2 harsh accels
    {
      type: 'harsh_accel',
      ts_start: new Date(baseTime.getTime()),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
    {
      type: 'harsh_accel',
      ts_start: new Date(baseTime.getTime() + 1000),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
    // 1 harsh corner
    {
      type: 'harsh_corner',
      ts_start: new Date(baseTime.getTime()),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
    // Speeding (2 minutes at +5)
    {
      type: 'speeding_5',
      ts_start: new Date(baseTime.getTime()),
      ts_end: new Date(baseTime.getTime() + 120000),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
    // Speeding (1 minute at +10)
    {
      type: 'speeding_10',
      ts_start: new Date(baseTime.getTime()),
      ts_end: new Date(baseTime.getTime() + 60000),
      severity: 0.6,
      lat: 0,
      lon: 0,
    },
    // Distraction (3 minutes)
    {
      type: 'distraction',
      ts_start: new Date(baseTime.getTime()),
      ts_end: new Date(baseTime.getTime() + 180000),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
  ];

  const context: TripContext = {
    night_fraction: 0.3,
    weather_penalty_mins: 5,
    road_mix: { primary: 0.6, residential: 0.4 },
    quality: {
      samples_total: 100,
      samples_passed_quality: 80,
      quality_ratio: 0.8,
    },
  };

  const distanceKm = 20;
  const tripMinutes = 30;

  const features = extractTripFeatures(
    events,
    distanceKm,
    tripMinutes,
    context,
  );

  // Check normalized counts
  assertEquals(features.harsh_brake_per_100km, 15); // 3 events per 20km = 15 per 100km
  assertEquals(features.harsh_accel_per_100km, 10); // 2 events per 20km = 10 per 100km
  assertEquals(features.harsh_corner_per_100km, 5); // 1 event per 20km = 5 per 100km

  // Check durations
  assertEquals(features.mins_speeding_5, 2);
  assertEquals(features.mins_speeding_10, 1);
  assertEquals(features.mins_speeding_20, 0);
  assertEquals(features.distraction_mins, 3);

  // Check context features
  assertEquals(features.night_fraction, 0.3);
  assertEquals(features.weather_penalty_mins, 5);

  // Check trip metrics
  assertEquals(features.distance_km, 20);
  assertEquals(features.trip_minutes, 30);
});

Deno.test('extractTripFeatures - handles empty events', () => {
  const events: DetectedEvent[] = [];

  const context: TripContext = {
    night_fraction: 0,
    weather_penalty_mins: 0,
    road_mix: {},
    quality: {
      samples_total: 100,
      samples_passed_quality: 100,
      quality_ratio: 1.0,
    },
  };

  const features = extractTripFeatures(events, 10, 15, context);

  assertEquals(features.harsh_brake_per_100km, 0);
  assertEquals(features.harsh_accel_per_100km, 0);
  assertEquals(features.harsh_corner_per_100km, 0);
  assertEquals(features.mins_speeding_5, 0);
  assertEquals(features.mins_speeding_10, 0);
  assertEquals(features.mins_speeding_20, 0);
  assertEquals(features.distraction_mins, 0);
});

Deno.test('extractTripFeatures - handles very short trip', () => {
  const baseTime = new Date('2025-10-19T10:00:00Z');
  const events: DetectedEvent[] = [
    {
      type: 'harsh_brake',
      ts_start: new Date(baseTime.getTime()),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
  ];

  const context: TripContext = {
    night_fraction: 0,
    weather_penalty_mins: 0,
    road_mix: {},
    quality: {
      samples_total: 10,
      samples_passed_quality: 10,
      quality_ratio: 1.0,
    },
  };

  // Very short trip: 1km
  const features = extractTripFeatures(events, 1, 3, context);

  // 1 event per 1km = 100 per 100km
  assertEquals(features.harsh_brake_per_100km, 100);
});

Deno.test('extractTripFeatures - multiple speeding buckets', () => {
  const baseTime = new Date('2025-10-19T10:00:00Z');
  const events: DetectedEvent[] = [
    {
      type: 'speeding_5',
      ts_start: new Date(baseTime.getTime()),
      ts_end: new Date(baseTime.getTime() + 60000),
      severity: 0.5,
      lat: 0,
      lon: 0,
    },
    {
      type: 'speeding_10',
      ts_start: new Date(baseTime.getTime()),
      ts_end: new Date(baseTime.getTime() + 120000),
      severity: 0.6,
      lat: 0,
      lon: 0,
    },
    {
      type: 'speeding_20',
      ts_start: new Date(baseTime.getTime()),
      ts_end: new Date(baseTime.getTime() + 30000),
      severity: 0.8,
      lat: 0,
      lon: 0,
    },
  ];

  const context: TripContext = {
    night_fraction: 0,
    weather_penalty_mins: 0,
    road_mix: {},
    quality: {
      samples_total: 100,
      samples_passed_quality: 100,
      quality_ratio: 1.0,
    },
  };

  const features = extractTripFeatures(events, 10, 20, context);

  assertEquals(features.mins_speeding_5, 1);
  assertEquals(features.mins_speeding_10, 2);
  assertEquals(features.mins_speeding_20, 0.5);
});



