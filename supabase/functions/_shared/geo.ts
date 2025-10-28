/**
 * Geometric utilities for distance, polyline, and spatial calculations
 */

import type { ProcessedSample } from './types.ts';

/**
 * Calculate Haversine distance between two lat/lon points in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total distance of a trip from samples
 * @returns distance in kilometers
 */
export function calculateTripDistance(samples: ProcessedSample[]): number {
  if (samples.length < 2) return 0;

  let totalMeters = 0;
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    totalMeters += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
  }

  return totalMeters / 1000; // Convert to km
}

/**
 * Calculate cumulative distances for each sample
 * @returns array of distances in meters from trip start
 */
export function calculateCumulativeDistances(
  samples: ProcessedSample[],
): number[] {
  const distances: number[] = [0];

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const segmentDist = haversineDistance(
      prev.lat,
      prev.lon,
      curr.lat,
      curr.lon,
    );
    distances.push(distances[i - 1] + segmentDist);
  }

  return distances;
}

/**
 * Build PostGIS LineString from samples
 * Returns WKT (Well-Known Text) format: LINESTRING(lon1 lat1, lon2 lat2, ...)
 */
export function buildLineString(samples: ProcessedSample[]): string {
  if (samples.length === 0) return 'LINESTRING EMPTY';

  const coords = samples.map((s) => `${s.lon} ${s.lat}`).join(', ');
  return `LINESTRING(${coords})`;
}

/**
 * Calculate bearing/heading between two points
 * @returns bearing in degrees (0-360, 0=North, 90=East)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (((θ * 180) / Math.PI) + 360) % 360;
}

/**
 * Estimate curvature at a point using three consecutive samples
 * Returns approximate lateral acceleration in m/s² (centripetal)
 */
export function estimateCurvature(
  prev: ProcessedSample,
  curr: ProcessedSample,
  next: ProcessedSample,
): number {
  // Calculate heading changes
  const heading1 = calculateBearing(prev.lat, prev.lon, curr.lat, curr.lon);
  const heading2 = calculateBearing(curr.lat, curr.lon, next.lat, next.lon);

  // Heading change in radians
  let dHeading = heading2 - heading1;
  // Normalize to [-180, 180]
  if (dHeading > 180) dHeading -= 360;
  if (dHeading < -180) dHeading += 360;
  const dHeadingRad = (dHeading * Math.PI) / 180;

  // Time between samples
  const dt1 = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
  const dt2 = (next.timestamp.getTime() - curr.timestamp.getTime()) / 1000;
  const dt = dt1 + dt2;

  if (dt < 0.1) return 0; // Avoid division by near-zero

  // Angular velocity (rad/s)
  const omega = dHeadingRad / dt;

  // Average speed (m/s)
  const avgSpeed = (prev.speed_mps + curr.speed_mps + next.speed_mps) / 3;

  // Centripetal acceleration: a = v * ω
  return Math.abs(avgSpeed * omega);
}

/**
 * Filter samples to exclude first and last N meters
 * Used to ignore noise at trip start/end
 */
export function excludeTripEnds(
  samples: ProcessedSample[],
  excludeMeters: number,
): ProcessedSample[] {
  if (samples.length < 3) return [];

  const cumulativeDistances = calculateCumulativeDistances(samples);
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];

  if (totalDistance < excludeMeters * 2) return []; // Trip too short

  const filtered: ProcessedSample[] = [];
  for (let i = 0; i < samples.length; i++) {
    const dist = cumulativeDistances[i];
    if (dist >= excludeMeters && dist <= totalDistance - excludeMeters) {
      filtered.push(samples[i]);
    }
  }

  return filtered;
}

/**
 * Check if sample passes quality gates for event detection
 */
export function passesQualityGates(
  sample: ProcessedSample,
  minMapMatchConf: number,
  maxHdop: number,
  minSpeedKmh: number,
): boolean {
  // Check speed threshold
  const speedKmh = sample.speed_mps * 3.6;
  if (speedKmh < minSpeedKmh) return false;

  // Check HDOP if available
  if (sample.hdop !== undefined && sample.hdop > maxHdop) return false;

  // Check map match confidence if available
  if (
    sample.map_match_conf !== undefined &&
    sample.map_match_conf < minMapMatchConf
  ) {
    return false;
  }

  // Check that we have speed limit for speeding detection
  // (Note: harsh accel/brake don't require speed limit)
  return true;
}

/**
 * Calculate night fraction (proportion of trip during 22:00-05:00 local time)
 * Simplified implementation assuming UTC times
 * TODO: Use proper timezone conversion based on trip location
 */
export function calculateNightFraction(samples: ProcessedSample[]): number {
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



