/**
 * Map matching and speed limit provider interface
 * 
 * This module defines the interface for map matching services and provides
 * a mock implementation. Real implementations can be added for:
 * - Google Maps Roads API
 * - Mapbox Map Matching API
 * - HERE Map Matching API
 */

import type { ProcessedSample } from '../types.ts';

// ============================================================================
// Types
// ============================================================================

export interface MapMatchResult {
  lat: number;
  lon: number;
  speed_limit_mps?: number;
  road_class?: string;
  confidence: number; // 0-1
}

export interface MapMatchRequest {
  points: Array<{
    lat: number;
    lon: number;
    timestamp: Date;
  }>;
}

// ============================================================================
// Interface
// ============================================================================

export interface MapProvider {
  /**
   * Match GPS points to road network and enrich with road attributes
   */
  matchToRoads(request: MapMatchRequest): Promise<MapMatchResult[]>;

  /**
   * Get speed limit at a specific location
   */
  getSpeedLimit(lat: number, lon: number): Promise<number | null>;
}

// ============================================================================
// Mock Implementation
// ============================================================================

/**
 * Mock map provider for testing and development
 * Returns synthetic data based on simple heuristics
 * 
 * TODO: Replace with real implementation using:
 * - Google Maps Roads API: https://developers.google.com/maps/documentation/roads
 * - Mapbox Map Matching: https://docs.mapbox.com/api/navigation/map-matching/
 * - HERE Map Matching: https://developer.here.com/documentation/map-matching/
 */
export class MockMapProvider implements MapProvider {
  async matchToRoads(
    request: MapMatchRequest,
  ): Promise<MapMatchResult[]> {
    // Mock implementation: return points with synthetic attributes
    return request.points.map((point) => {
      // Generate mock road class based on location (very simplistic)
      const roadClass = this.mockRoadClass(point.lat, point.lon);

      // Generate mock speed limit based on road class
      const speedLimitMph = this.mockSpeedLimit(roadClass);
      const speedLimitMps = speedLimitMph * 0.44704; // mph to m/s

      return {
        lat: point.lat,
        lon: point.lon,
        speed_limit_mps: speedLimitMps,
        road_class: roadClass,
        confidence: 0.85, // Mock confidence
      };
    });
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    const roadClass = this.mockRoadClass(lat, lon);
    const speedLimitMph = this.mockSpeedLimit(roadClass);
    return speedLimitMph * 0.44704; // mph to m/s
  }

  private mockRoadClass(_lat: number, _lon: number): string {
    // Very simple mock: randomly assign road class
    // In reality, this would be based on actual road data
    const classes = [
      'motorway',
      'trunk',
      'primary',
      'secondary',
      'residential',
    ];
    const random = Math.random();

    if (random < 0.1) return 'motorway';
    if (random < 0.2) return 'trunk';
    if (random < 0.4) return 'primary';
    if (random < 0.7) return 'secondary';
    return 'residential';
  }

  private mockSpeedLimit(roadClass: string): number {
    // Return typical speed limits by road class (in mph)
    const limits: Record<string, number> = {
      motorway: 65,
      trunk: 55,
      primary: 45,
      secondary: 35,
      residential: 25,
    };

    return limits[roadClass] ?? 30;
  }
}

// ============================================================================
// Real Provider Implementations (TODO)
// ============================================================================

/**
 * TODO: Google Maps Roads API implementation
 * 
 * Required environment variables:
 * - GOOGLE_MAPS_API_KEY
 * 
 * Implementation notes:
 * - Use snapToRoads endpoint for map matching
 * - Use speedLimits endpoint for speed limit data
 * - Handle rate limiting and error cases
 * - Consider batching requests for efficiency
 * 
 * Reference: https://developers.google.com/maps/documentation/roads/snap
 */
export class GoogleMapProvider implements MapProvider {
  constructor(private apiKey: string) {}

  async matchToRoads(
    _request: MapMatchRequest,
  ): Promise<MapMatchResult[]> {
    throw new Error(
      'GoogleMapProvider not implemented. Set up Google Maps Roads API key.',
    );
    // TODO: Implement using Google Maps Roads API
    // const response = await fetch(`https://roads.googleapis.com/v1/snapToRoads?...`);
  }

  async getSpeedLimit(_lat: number, _lon: number): Promise<number | null> {
    throw new Error(
      'GoogleMapProvider not implemented. Set up Google Maps Roads API key.',
    );
    // TODO: Implement using Google Maps Speed Limits API
  }
}

/**
 * TODO: Mapbox Map Matching API implementation
 * 
 * Required environment variables:
 * - MAPBOX_ACCESS_TOKEN
 * 
 * Implementation notes:
 * - Use Map Matching API v5
 * - Returns matched coordinates with road attributes
 * - Handle geometries and confidence scores
 * 
 * Reference: https://docs.mapbox.com/api/navigation/map-matching/
 */
export class MapboxMapProvider implements MapProvider {
  constructor(private accessToken: string) {}

  async matchToRoads(
    _request: MapMatchRequest,
  ): Promise<MapMatchResult[]> {
    throw new Error(
      'MapboxMapProvider not implemented. Set up Mapbox access token.',
    );
    // TODO: Implement using Mapbox Map Matching API
  }

  async getSpeedLimit(_lat: number, _lon: number): Promise<number | null> {
    throw new Error(
      'MapboxMapProvider not implemented. Set up Mapbox access token.',
    );
    // TODO: Implement - note that Mapbox may not provide speed limits directly
  }
}

/**
 * TODO: HERE Map Matching API implementation
 * 
 * Required environment variables:
 * - HERE_API_KEY
 * 
 * Implementation notes:
 * - Use HERE Location Services Map Matching API
 * - Provides high-quality map matching and road attributes
 * 
 * Reference: https://developer.here.com/documentation/map-matching/
 */
export class HEREMapProvider implements MapProvider {
  constructor(private apiKey: string) {}

  async matchToRoads(
    _request: MapMatchRequest,
  ): Promise<MapMatchResult[]> {
    throw new Error(
      'HEREMapProvider not implemented. Set up HERE API key.',
    );
    // TODO: Implement using HERE Map Matching API
  }

  async getSpeedLimit(_lat: number, _lon: number): Promise<number | null> {
    throw new Error(
      'HEREMapProvider not implemented. Set up HERE API key.',
    );
    // TODO: Implement using HERE speed limit data
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a map provider based on environment configuration
 * Falls back to MockMapProvider if no real provider is configured
 */
export function createMapProvider(): MapProvider {
  // Check for configured providers
  const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  const hereApiKey = Deno.env.get('HERE_API_KEY');

  if (googleApiKey) {
    console.log('Using Google Maps provider');
    return new GoogleMapProvider(googleApiKey);
  }

  if (mapboxToken) {
    console.log('Using Mapbox provider');
    return new MapboxMapProvider(mapboxToken);
  }

  if (hereApiKey) {
    console.log('Using HERE provider');
    return new HEREMapProvider(hereApiKey);
  }

  console.warn('No map provider configured, using mock provider');
  return new MockMapProvider();
}

// ============================================================================
// Helper: Apply map matching results to samples
// ============================================================================

/**
 * Enrich samples with map matching results
 */
export function applyMapMatchingToSamples(
  samples: ProcessedSample[],
  matchResults: MapMatchResult[],
): void {
  if (samples.length !== matchResults.length) {
    console.warn(
      `Sample count (${samples.length}) != match result count (${matchResults.length})`,
    );
  }

  const minLength = Math.min(samples.length, matchResults.length);
  for (let i = 0; i < minLength; i++) {
    samples[i].speed_limit_mps = matchResults[i].speed_limit_mps;
    samples[i].road_class = matchResults[i].road_class;
    samples[i].map_match_conf = matchResults[i].confidence;
  }
}



