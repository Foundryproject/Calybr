/**
 * Routing Service
 * 
 * Generates realistic driving routes that follow actual roads using Google Directions API
 */

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number;
}

export interface GenerateRouteOptions {
  startLat: number;
  startLon: number;
  endLat?: number;
  endLon?: number;
  durationMinutes?: number;
  targetDistance?: number; // in meters
}

/**
 * Generate a realistic route on actual roads
 */
export async function generateRealisticRoute(options: GenerateRouteOptions): Promise<RoutePoint[]> {
  const {
    startLat,
    startLon,
    endLat,
    endLon,
    durationMinutes = 5,
    targetDistance = 2500, // 2.5 km by default
  } = options;

  try {
    // If no end point specified, generate one based on target distance
    let destinationLat = endLat;
    let destinationLon = endLon;

    if (!destinationLat || !destinationLon) {
      // Generate a random destination ~2-3km away (roughly 0.02-0.03 degrees)
      const angle = Math.random() * 2 * Math.PI;
      const distance = (targetDistance / 111000) * (0.8 + Math.random() * 0.4); // Convert meters to degrees
      destinationLat = startLat + Math.cos(angle) * distance;
      destinationLon = startLon + Math.sin(angle) * distance;
    }

    // Call Google Directions API to get route on actual roads
    const route = await getDirectionsRoute(startLat, startLon, destinationLat, destinationLon);

    if (!route || route.length === 0) {
      console.warn("Failed to get route from API, falling back to simple route");
      return generateFallbackRoute(startLat, startLon, destinationLat, destinationLon);
    }

    // Enhance route with timestamps and realistic speeds
    return addTimestampsAndSpeeds(route, durationMinutes);
  } catch (error) {
    console.error("Error generating route:", error);
    // Fallback to simple route if API fails
    return generateFallbackRoute(
      startLat,
      startLon,
      endLat || startLat + 0.02,
      endLon || startLon + 0.02,
    );
  }
}

/**
 * Get route from Google Directions API
 */
async function getDirectionsRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
): Promise<{ latitude: number; longitude: number }[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured");
    return [];
  }

  try {
    const origin = `${startLat},${startLon}`;
    const destination = `${endLat},${endLon}`;

    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin}&` +
      `destination=${destination}&` +
      `mode=driving&` +
      `key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      console.warn("Directions API error:", data.status, data.error_message);
      return [];
    }

    // Extract coordinates from the route
    const route = data.routes[0];
    if (!route || !route.overview_polyline) {
      return [];
    }

    // Decode polyline
    const points = decodePolyline(route.overview_polyline.points);
    
    // Google's polyline is often too detailed, sample it to ~30-50 points
    return samplePoints(points, 40);
  } catch (error) {
    console.error("Error fetching directions:", error);
    return [];
  }
}

/**
 * Decode Google's encoded polyline format
 * Based on: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Sample points to reduce density while maintaining route shape
 */
function samplePoints(
  points: { latitude: number; longitude: number }[],
  targetCount: number,
): { latitude: number; longitude: number }[] {
  if (points.length <= targetCount) {
    return points;
  }

  const sampled: { latitude: number; longitude: number }[] = [];
  const step = (points.length - 1) / (targetCount - 1);

  for (let i = 0; i < targetCount; i++) {
    const index = Math.round(i * step);
    sampled.push(points[index]);
  }

  return sampled;
}

/**
 * Add timestamps and realistic speeds to route points
 */
function addTimestampsAndSpeeds(
  points: { latitude: number; longitude: number }[],
  durationMinutes: number,
): RoutePoint[] {
  const durationMs = durationMinutes * 60 * 1000;
  const startTime = Date.now() - durationMs;
  const timePerPoint = durationMs / (points.length - 1);

  return points.map((point, index) => {
    // Calculate speed variation based on position in route
    // Slower at start/end, faster in middle
    const progress = index / (points.length - 1);
    const speedCurve = Math.sin(progress * Math.PI); // 0 at start/end, 1 in middle
    
    // Base speed 20-35 km/h with variations
    const baseSpeed = 25;
    const speedVariation = speedCurve * 15; // +/- 15 km/h
    const randomness = (Math.random() - 0.5) * 5; // +/- 2.5 km/h
    
    const speed = Math.max(15, Math.min(50, baseSpeed + speedVariation + randomness));

    return {
      latitude: point.latitude,
      longitude: point.longitude,
      timestamp: Math.round(startTime + index * timePerPoint),
      speed: Math.round(speed * 10) / 10, // Round to 1 decimal
    };
  });
}

/**
 * Fallback route generator (simple curved path) when API is unavailable
 */
function generateFallbackRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
): RoutePoint[] {
  const points: RoutePoint[] = [];
  const numPoints = 30;
  const durationMs = 5 * 60 * 1000; // 5 minutes
  const startTime = Date.now() - durationMs;

  for (let i = 0; i <= numPoints; i++) {
    const progress = i / numPoints;
    
    // Simple curve with some variation
    const curvedProgress = progress * progress * (3 - 2 * progress);
    const weave = Math.sin(progress * Math.PI * 2) * 0.001;
    
    const lat = startLat + (endLat - startLat) * curvedProgress + weave;
    const lon = startLon + (endLon - startLon) * curvedProgress + Math.cos(progress * Math.PI * 2) * 0.0008;
    
    // Speed variation
    const speedVariation = Math.abs(Math.sin(progress * Math.PI * 3)) * 15;
    const speed = Math.max(15, Math.min(50, 25 + speedVariation + Math.random() * 5));

    points.push({
      latitude: lat,
      longitude: lon,
      timestamp: Math.round(startTime + i * (durationMs / numPoints)),
      speed: Math.round(speed * 10) / 10,
    });
  }

  return points;
}

export const routingService = {
  generateRealisticRoute,
};

