/**
 * Trip segmentation and filtering utilities
 */

import type { ProcessedSample } from './types.ts';
import { calculateCumulativeDistances } from './geo.ts';

/**
 * Exclude first and last N meters from trip for event detection
 * This removes noisy data from trip start/end (parking, initial movement, etc.)
 */
export function excludeTripEnds(
  samples: ProcessedSample[],
  excludeMeters: number,
): ProcessedSample[] {
  if (samples.length < 3) return [];

  const cumulativeDistances = calculateCumulativeDistances(samples);
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];

  if (totalDistance < excludeMeters * 2) {
    // Trip too short to exclude ends
    return samples;
  }

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
 * Group consecutive samples that meet a condition
 * Returns segments as arrays of sample indices
 */
export function groupConsecutiveSamples(
  samples: ProcessedSample[],
  predicate: (sample: ProcessedSample) => boolean,
): number[][] {
  const segments: number[][] = [];
  let currentSegment: number[] = [];

  for (let i = 0; i < samples.length; i++) {
    if (predicate(samples[i])) {
      currentSegment.push(i);
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Filter segments by minimum duration
 * @param segments - array of sample indices
 * @param samples - all samples
 * @param minDurationMs - minimum duration in milliseconds
 */
export function filterSegmentsByDuration(
  segments: number[][],
  samples: ProcessedSample[],
  minDurationMs: number,
): number[][] {
  return segments.filter((segment) => {
    if (segment.length < 2) return false;
    const startIdx = segment[0];
    const endIdx = segment[segment.length - 1];
    const duration = samples[endIdx].timestamp.getTime() -
      samples[startIdx].timestamp.getTime();
    return duration >= minDurationMs;
  });
}

/**
 * Debounce artifacts by merging segments that are close together
 * If two segments are separated by less than gapThresholdMs, merge them
 */
export function debounceSegments(
  segments: number[][],
  samples: ProcessedSample[],
  gapThresholdMs: number,
): number[][] {
  if (segments.length <= 1) return segments;

  const merged: number[][] = [];
  let current = [...segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const prevEndIdx = current[current.length - 1];
    const nextStartIdx = segments[i][0];

    const gap = samples[nextStartIdx].timestamp.getTime() -
      samples[prevEndIdx].timestamp.getTime();

    if (gap <= gapThresholdMs) {
      // Merge segments
      current.push(...segments[i]);
    } else {
      merged.push(current);
      current = [...segments[i]];
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Calculate segment duration in seconds
 */
export function getSegmentDuration(
  segment: number[],
  samples: ProcessedSample[],
): number {
  if (segment.length < 2) return 0;
  const startIdx = segment[0];
  const endIdx = segment[segment.length - 1];
  return (samples[endIdx].timestamp.getTime() -
    samples[startIdx].timestamp.getTime()) / 1000;
}

/**
 * Get middle sample of a segment
 */
export function getSegmentMiddle(
  segment: number[],
  samples: ProcessedSample[],
): ProcessedSample {
  const middleIdx = segment[Math.floor(segment.length / 2)];
  return samples[middleIdx];
}

/**
 * Check if trip meets minimum requirements for scoring
 */
export function meetsMinimumRequirements(
  distanceKm: number,
  durationMinutes: number,
  minDistanceKm: number,
  minDurationMinutes: number,
): boolean {
  return distanceKm >= minDistanceKm && durationMinutes >= minDurationMinutes;
}



