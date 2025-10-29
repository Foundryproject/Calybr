/**
 * Speed Monitoring Service
 * 
 * Tracks user speed vs road speed limits and flags overspeeding events
 * Uses Google Maps Roads API to get speed limits
 */

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface SpeedLimitData {
  speedLimit: number; // mph
  speedLimitKmh: number; // km/h
  placeId?: string;
  roadName?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SpeedViolation {
  timestamp: Date;
  latitude: number;
  longitude: number;
  userSpeed: number; // mph
  speedLimit: number; // mph
  excessSpeed: number; // mph over limit
  percentageOver: number; // % over limit
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  roadName?: string;
}

export interface SpeedStats {
  totalViolations: number;
  minorViolations: number; // 1-10 mph over
  moderateViolations: number; // 11-20 mph over
  severeViolations: number; // 21-30 mph over
  extremeViolations: number; // 31+ mph over
  totalTimeOverspeeding: number; // seconds
  maxExcessSpeed: number; // mph
  averageExcessSpeed: number; // mph
}

// Cache for speed limits to reduce API calls
const speedLimitCache = new Map<string, { limit: SpeedLimitData; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Get speed limit for a specific location
 */
export async function getSpeedLimit(
  latitude: number,
  longitude: number
): Promise<SpeedLimitData | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  // Check cache first
  const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = speedLimitCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.limit;
  }

  try {
    // Use Google Maps Roads API to get nearest road and speed limit
    const roadsUrl = `https://roads.googleapis.com/v1/nearestRoads?points=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const roadsResponse = await fetch(roadsUrl);
    const roadsData = await roadsResponse.json();

    if (roadsData.snappedPoints && roadsData.snappedPoints.length > 0) {
      const placeId = roadsData.snappedPoints[0].placeId;
      
      // Get speed limit for this place
      const speedLimitUrl = `https://roads.googleapis.com/v1/speedLimits?placeId=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const speedResponse = await fetch(speedLimitUrl);
      const speedData = await speedResponse.json();

      if (speedData.speedLimits && speedData.speedLimits.length > 0) {
        const limitKmh = speedData.speedLimits[0].speedLimit;
        const limitMph = kmhToMph(limitKmh);
        
        const result: SpeedLimitData = {
          speedLimit: limitMph,
          speedLimitKmh: limitKmh,
          placeId,
          confidence: 'high',
        };

        // Cache the result
        speedLimitCache.set(cacheKey, { limit: result, timestamp: Date.now() });
        
        return result;
      }
    }

    // Fallback: estimate based on typical road types
    const estimatedLimit = estimateSpeedLimit(latitude, longitude);
    return estimatedLimit;
  } catch (error) {
    console.error('Error fetching speed limit:', error);
    
    // Return estimated speed limit as fallback
    return estimateSpeedLimit(latitude, longitude);
  }
}

/**
 * Estimate speed limit based on typical values (fallback)
 */
function estimateSpeedLimit(latitude: number, longitude: number): SpeedLimitData {
  // Default to common speed limits
  // In a real app, you might use additional data sources or ML models
  return {
    speedLimit: 35, // mph - typical urban speed
    speedLimitKmh: 55, // km/h
    confidence: 'low',
  };
}

/**
 * Check if user is overspeeding
 */
export function checkOverspeed(
  userSpeed: number, // mph
  speedLimit: number // mph
): { isOverspeeding: boolean; excessSpeed: number; severity: SpeedViolation['severity'] } {
  const excessSpeed = userSpeed - speedLimit;
  
  if (excessSpeed <= 0) {
    return {
      isOverspeeding: false,
      excessSpeed: 0,
      severity: 'minor',
    };
  }

  let severity: SpeedViolation['severity'];
  if (excessSpeed <= 10) {
    severity = 'minor';
  } else if (excessSpeed <= 20) {
    severity = 'moderate';
  } else if (excessSpeed <= 30) {
    severity = 'severe';
  } else {
    severity = 'extreme';
  }

  return {
    isOverspeeding: true,
    excessSpeed,
    severity,
  };
}

/**
 * Create a speed violation record
 */
export function createSpeedViolation(
  latitude: number,
  longitude: number,
  userSpeed: number,
  speedLimit: number,
  roadName?: string
): SpeedViolation {
  const { excessSpeed, severity } = checkOverspeed(userSpeed, speedLimit);
  const percentageOver = (excessSpeed / speedLimit) * 100;

  return {
    timestamp: new Date(),
    latitude,
    longitude,
    userSpeed,
    speedLimit,
    excessSpeed,
    percentageOver,
    severity,
    roadName,
  };
}

/**
 * Calculate speed statistics for a set of violations
 */
export function calculateSpeedStats(violations: SpeedViolation[]): SpeedStats {
  if (violations.length === 0) {
    return {
      totalViolations: 0,
      minorViolations: 0,
      moderateViolations: 0,
      severeViolations: 0,
      extremeViolations: 0,
      totalTimeOverspeeding: 0,
      maxExcessSpeed: 0,
      averageExcessSpeed: 0,
    };
  }

  const stats: SpeedStats = {
    totalViolations: violations.length,
    minorViolations: violations.filter(v => v.severity === 'minor').length,
    moderateViolations: violations.filter(v => v.severity === 'moderate').length,
    severeViolations: violations.filter(v => v.severity === 'severe').length,
    extremeViolations: violations.filter(v => v.severity === 'extreme').length,
    totalTimeOverspeeding: 0,
    maxExcessSpeed: Math.max(...violations.map(v => v.excessSpeed)),
    averageExcessSpeed: violations.reduce((sum, v) => sum + v.excessSpeed, 0) / violations.length,
  };

  // Estimate total time overspeeding (assume 5 seconds per violation point)
  stats.totalTimeOverspeeding = violations.length * 5;

  return stats;
}

/**
 * Monitor speed in real-time during a trip
 */
export class SpeedMonitor {
  private violations: SpeedViolation[] = [];
  private currentSpeedLimit: number | null = null;
  private lastSpeedCheck: number = 0;
  private readonly CHECK_INTERVAL = 5000; // Check every 5 seconds
  private isOverspeeding: boolean = false;
  private overspeedStartTime: number | null = null;

  /**
   * Update speed and check for violations
   */
  async update(
    latitude: number,
    longitude: number,
    currentSpeed: number // mph
  ): Promise<{
    isOverspeeding: boolean;
    speedLimit: number | null;
    excessSpeed: number;
    violation: SpeedViolation | null;
  }> {
    const now = Date.now();

    // Only check speed limit periodically to reduce API calls
    if (now - this.lastSpeedCheck >= this.CHECK_INTERVAL || this.currentSpeedLimit === null) {
      const speedLimitData = await getSpeedLimit(latitude, longitude);
      this.currentSpeedLimit = speedLimitData?.speedLimit || 35; // Default to 35 mph
      this.lastSpeedCheck = now;
    }

    // Check for overspeeding
    const { isOverspeeding, excessSpeed, severity } = checkOverspeed(
      currentSpeed,
      this.currentSpeedLimit
    );

    let violation: SpeedViolation | null = null;

    // Track overspeeding periods
    if (isOverspeeding && !this.isOverspeeding) {
      // Just started overspeeding
      this.isOverspeeding = true;
      this.overspeedStartTime = now;
    } else if (isOverspeeding && this.isOverspeeding) {
      // Still overspeeding - record violation every 10 seconds
      const overspeedDuration = now - (this.overspeedStartTime || now);
      if (overspeedDuration >= 10000) {
        violation = createSpeedViolation(
          latitude,
          longitude,
          currentSpeed,
          this.currentSpeedLimit
        );
        this.violations.push(violation);
        this.overspeedStartTime = now; // Reset timer
      }
    } else if (!isOverspeeding && this.isOverspeeding) {
      // Stopped overspeeding
      this.isOverspeeding = false;
      this.overspeedStartTime = null;
    }

    return {
      isOverspeeding,
      speedLimit: this.currentSpeedLimit,
      excessSpeed,
      violation,
    };
  }

  /**
   * Get all violations for this trip
   */
  getViolations(): SpeedViolation[] {
    return [...this.violations];
  }

  /**
   * Get statistics for this trip
   */
  getStats(): SpeedStats {
    return calculateSpeedStats(this.violations);
  }

  /**
   * Reset the monitor for a new trip
   */
  reset(): void {
    this.violations = [];
    this.currentSpeedLimit = null;
    this.lastSpeedCheck = 0;
    this.isOverspeeding = false;
    this.overspeedStartTime = null;
  }
}

/**
 * Helper: Convert km/h to mph
 */
function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

/**
 * Helper: Convert mph to km/h
 */
export function mphToKmh(mph: number): number {
  return Math.round(mph * 1.60934);
}

/**
 * Clear speed limit cache
 */
export function clearSpeedLimitCache(): void {
  speedLimitCache.clear();
}

