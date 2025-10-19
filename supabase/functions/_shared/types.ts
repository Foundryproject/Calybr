/**
 * Shared type definitions for Calybr backend
 */

// ============================================================================
// Ingest / Sample DTOs
// ============================================================================

export interface AccelSample {
  ax: number;
  ay: number;
  az: number;
}

export interface TelemetrySample {
  ts: string; // ISO 8601
  lat: number;
  lon: number;
  speed_mps: number;
  heading_deg?: number;
  hdop?: number;
  accel?: AccelSample;
  screen_on?: boolean;
}

export interface IngestPayload {
  userId: string;
  deviceId: string;
  samples: TelemetrySample[];
}

export interface IngestResponse {
  tripId: string;
  samplesIngested: number;
}

// ============================================================================
// Processed Sample (with derived fields)
// ============================================================================

export interface ProcessedSample extends TelemetrySample {
  timestamp: Date;
  // Derived acceleration in road frame
  accel_long?: number; // m/s² (forward/backward)
  accel_lat?: number; // m/s² (lateral)
  // Smoothed acceleration
  accel_long_smooth?: number;
  accel_lat_smooth?: number;
  // Map matching results
  speed_limit_mps?: number;
  road_class?: string; // 'motorway', 'trunk', 'primary', 'secondary', 'residential', etc.
  map_match_conf?: number; // 0-1 confidence
}

// ============================================================================
// Event Types
// ============================================================================

export type EventType =
  | 'harsh_brake'
  | 'harsh_accel'
  | 'harsh_corner'
  | 'speeding_5'
  | 'speeding_10'
  | 'speeding_20'
  | 'distraction';

export interface DetectedEvent {
  type: EventType;
  ts_start: Date;
  ts_end?: Date;
  severity: number; // 0-1
  lat: number;
  lon: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Trip Features (normalized counts/durations)
// ============================================================================

export interface TripFeatures {
  distance_km: number;
  trip_minutes: number;
  harsh_brake_per_100km: number;
  harsh_accel_per_100km: number;
  harsh_corner_per_100km: number;
  mins_speeding_5: number;
  mins_speeding_10: number;
  mins_speeding_20: number;
  distraction_mins: number;
  night_fraction: number;
  weather_penalty_mins: number;
}

// ============================================================================
// Trip Context
// ============================================================================

export interface TripContext {
  night_fraction: number; // 0-1, proportion of trip during 22:00-05:00 local
  weather_penalty_mins: number; // accumulated penalty minutes from weather conditions
  road_mix: Record<string, number>; // e.g., { "motorway": 0.3, "urban": 0.7 }
  quality: {
    samples_total: number;
    samples_passed_quality: number;
    quality_ratio: number; // samples_passed / samples_total
  };
}

// ============================================================================
// Score Weights (versioned)
// ============================================================================

export interface ScoreWeights {
  version: string;
  w_a: number; // harsh_accel weight
  w_b: number; // harsh_brake weight
  w_c: number; // harsh_corner weight
  w_s1: number; // speeding +5 mph weight
  w_s2: number; // speeding +10 mph weight
  w_s3: number; // speeding +20 mph weight
  w_d: number; // distraction weight
  w_n: number; // night weight
  w_w: number; // weather weight
  alpha: number; // EMA smoothing factor (0-1)
  // Per-term deduction caps (to prevent single bursts from tanking score)
  cap_harsh_accel?: number;
  cap_harsh_brake?: number;
  cap_harsh_corner?: number;
  cap_speeding_5?: number;
  cap_speeding_10?: number;
  cap_speeding_20?: number;
  cap_distraction?: number;
  cap_night?: number;
  cap_weather?: number;
}

// ============================================================================
// Trip Score & Breakdown
// ============================================================================

export interface ScoreBreakdownTerm {
  feature_value: number;
  weight: number;
  deduction: number;
  capped_deduction: number;
}

export interface ScoreBreakdown {
  base: number; // 1000
  harsh_accel: ScoreBreakdownTerm;
  harsh_brake: ScoreBreakdownTerm;
  harsh_corner: ScoreBreakdownTerm;
  speeding_5: ScoreBreakdownTerm;
  speeding_10: ScoreBreakdownTerm;
  speeding_20: ScoreBreakdownTerm;
  distraction: ScoreBreakdownTerm;
  night: ScoreBreakdownTerm;
  weather: ScoreBreakdownTerm;
  total_deduction: number;
  raw_score: number;
  clamped_score: number;
  weights_version: string;
}

export interface TripScore {
  trip_id: string;
  tss: number; // Trip Safety Score (300-1000)
  breakdown: ScoreBreakdown;
  confidence: 'high' | 'low';
  weights_version: string;
}

// ============================================================================
// Driver Score Daily (EMA)
// ============================================================================

export interface DriverScoreDaily {
  user_id: string;
  day: string; // YYYY-MM-DD
  rds: number; // Rolling Driver Score (300-1000)
  trips_count: number;
  total_distance_km: number;
}

// ============================================================================
// Database Row Types (for Supabase queries)
// ============================================================================

export interface TripRow {
  id: string;
  user_id: string;
  device_id: string;
  started_at: string;
  ended_at?: string;
  distance_km?: number;
  duration_s?: number;
  night_fraction?: number;
  weather?: Record<string, unknown>;
  road_mix?: Record<string, unknown>;
  quality?: Record<string, unknown>;
  geom?: unknown; // PostGIS geometry
  status: 'open' | 'finalizing' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SampleRow {
  trip_id: string;
  ts: string;
  lat: number;
  lon: number;
  speed_mps: number;
  heading_deg?: number;
  hdop?: number;
  ax?: number;
  ay?: number;
  az?: number;
  screen_on?: boolean;
}

export interface EventRow {
  id: string;
  trip_id: string;
  ts_start: string;
  ts_end?: string;
  type: EventType;
  severity?: number;
  lat?: number;
  lon?: number;
  created_at: string;
}

export interface TripFeaturesRow {
  trip_id: string;
  distance_km: number;
  trip_minutes: number;
  harsh_brake_per_100km: number;
  harsh_accel_per_100km: number;
  harsh_corner_per_100km: number;
  mins_speeding_5: number;
  mins_speeding_10: number;
  mins_speeding_20: number;
  distraction_mins: number;
  night_fraction: number;
  weather_penalty_mins: number;
  created_at: string;
}

export interface TripScoreRow {
  trip_id: string;
  tss: number;
  breakdown: ScoreBreakdown;
  confidence: 'high' | 'low';
  weights_version: string;
  created_at: string;
}

export interface DriverScoreDailyRow {
  user_id: string;
  day: string;
  rds: number;
  trips_count: number;
  total_distance_km: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Quality Gates
// ============================================================================

export interface QualityGates {
  min_map_match_conf: number; // default 0.6
  max_hdop: number; // default 1.5
  min_speed_kmh: number; // default 10 km/h for event detection
  min_trip_distance_km: number; // default 2 km
  min_trip_minutes: number; // default 5 minutes
}

export const DEFAULT_QUALITY_GATES: QualityGates = {
  min_map_match_conf: 0.6,
  max_hdop: 1.5,
  min_speed_kmh: 10,
  min_trip_distance_km: 2,
  min_trip_minutes: 5,
};



