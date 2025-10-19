/**
 * Signal processing utilities for acceleration data
 */

import type { ProcessedSample } from './types.ts';

/**
 * Simple low-pass filter (moving average) for smoothing acceleration data
 * Uses a window of N samples to reduce noise
 */
export function lowPassFilter(values: number[], windowSize = 3): number[] {
  if (values.length === 0) return [];
  if (windowSize <= 1) return [...values];

  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(values.length, i + halfWindow + 1);
    const window = values.slice(start, end);
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length;
    result.push(avg);
  }

  return result;
}

/**
 * Project acceleration from device frame to road frame
 * Converts (ax, ay, az) to longitudinal (forward/back) and lateral (left/right)
 * 
 * Simplified approach:
 * - Assuming device is mounted relatively flat
 * - heading_deg indicates direction of travel
 * - We rotate the horizontal acceleration components by heading angle
 * 
 * @param ax - acceleration in device x-axis (m/s²)
 * @param ay - acceleration in device y-axis (m/s²)
 * @param heading_deg - heading in degrees (0-360, 0=North, 90=East)
 * @returns { accel_long, accel_lat } in m/s²
 */
export function projectToRoadFrame(
  ax: number,
  ay: number,
  heading_deg: number,
): { accel_long: number; accel_lat: number } {
  // Convert heading to radians
  const heading_rad = (heading_deg * Math.PI) / 180;

  // Simple 2D rotation
  // Longitudinal (forward) is aligned with heading direction
  // Lateral (sideways) is perpendicular
  const accel_long = ax * Math.cos(heading_rad) + ay * Math.sin(heading_rad);
  const accel_lat = -ax * Math.sin(heading_rad) + ay * Math.cos(heading_rad);

  return { accel_long, accel_lat };
}

/**
 * Apply smoothing and road-frame projection to all samples
 * Mutates samples in place to add derived fields
 */
export function preprocessSamples(samples: ProcessedSample[]): void {
  // Extract raw acceleration values
  const ax_values: number[] = [];
  const ay_values: number[] = [];

  for (const sample of samples) {
    ax_values.push(sample.accel?.ax ?? 0);
    ay_values.push(sample.accel?.ay ?? 0);
  }

  // Apply low-pass filter
  const ax_smooth = lowPassFilter(ax_values, 3);
  const ay_smooth = lowPassFilter(ay_values, 3);

  // Project to road frame and store in samples
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const heading = sample.heading_deg ?? 0;

    // Use smoothed values for road frame projection
    const { accel_long, accel_lat } = projectToRoadFrame(
      ax_smooth[i],
      ay_smooth[i],
      heading,
    );

    sample.accel_long = accel_long;
    sample.accel_lat = accel_lat;
    sample.accel_long_smooth = accel_long;
    sample.accel_lat_smooth = accel_lat;
  }
}

/**
 * Convert m/s to km/h
 */
export function mpsToKmh(mps: number): number {
  return mps * 3.6;
}

/**
 * Convert m/s to mph
 */
export function mpsToMph(mps: number): number {
  return mps * 2.23694;
}

/**
 * Convert g-force to m/s²
 */
export function gToMps2(g: number): number {
  return g * 9.80665;
}

/**
 * Convert m/s² to g-force
 */
export function mps2ToG(mps2: number): number {
  return mps2 / 9.80665;
}

/**
 * Calculate time difference in seconds between two timestamps
 */
export function timeDiffSeconds(ts1: Date, ts2: Date): number {
  return Math.abs(ts2.getTime() - ts1.getTime()) / 1000;
}

/**
 * Calculate time difference in milliseconds between two timestamps
 */
export function timeDiffMs(ts1: Date, ts2: Date): number {
  return Math.abs(ts2.getTime() - ts1.getTime());
}



