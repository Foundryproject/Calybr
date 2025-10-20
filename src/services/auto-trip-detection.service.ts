/**
 * Automatic Trip Detection Service
 *
 * Monitors location in background and automatically:
 * - Starts tracking when user starts driving (speed + movement)
 * - Records trip data (route, distance, duration, events)
 * - Stops tracking when user stops moving
 * - Saves trip to database
 */

import * as Location from "expo-location";
import { backgroundLocationService } from "./background-location.service";
import { driveTrackingService, DriveMetrics } from "./drive-tracking.service";

// Trip detection thresholds
const THRESHOLDS = {
  START_SPEED_KMH: 15, // Min speed to start trip (15 km/h ~= 9 mph)
  START_DURATION_MS: 10000, // Must maintain speed for 10 seconds
  STOP_SPEED_KMH: 5, // Below this speed = stopped (5 km/h ~= 3 mph)
  STOP_DURATION_MS: 120000, // Stopped for 2 minutes = trip ended
  MIN_TRIP_DISTANCE_M: 500, // Min 500m to save trip (filters out parking lot movement)
  MIN_TRIP_DURATION_S: 60, // Min 1 minute to save trip
};

export interface TripDetectionConfig {
  startSpeedKmh?: number;
  startDurationMs?: number;
  stopSpeedKmh?: number;
  stopDurationMs?: number;
  minTripDistanceM?: number;
  minTripDurationS?: number;
}

export interface DetectedTrip {
  id: string;
  startTime: Date;
  endTime?: Date;
  distance: number;
  duration: number;
  maxSpeed: number;
  averageSpeed: number;
  route: {
    latitude: number;
    longitude: number;
    timestamp: number;
    speed: number;
  }[];
  events: any[];
}

type TripState = "idle" | "detecting" | "driving" | "stopped";

class AutoTripDetectionService {
  private isEnabled = false;
  private state: TripState = "idle";
  private config: Required<TripDetectionConfig> = THRESHOLDS;

  // Detection state
  private lastSpeed = 0;
  private speedHistory: { speed: number; timestamp: number }[] = [];
  private stoppedSince: number | null = null;
  private movingSince: number | null = null;

  // Current trip data
  private currentTrip: DetectedTrip | null = null;
  private backgroundUnsubscribe: (() => void) | null = null;

  // Callbacks
  private onTripStartCallbacks: ((trip: DetectedTrip) => void)[] = [];
  private onTripEndCallbacks: ((trip: DetectedTrip) => void)[] = [];
  private onTripUpdateCallbacks: ((trip: DetectedTrip) => void)[] = [];

  /**
   * Start automatic trip detection
   */
  async start(config?: TripDetectionConfig): Promise<boolean> {
    if (this.isEnabled) {
      console.log("Auto trip detection already running");
      return true;
    }

    // Merge custom config with defaults
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      // Start background location tracking
      const started = await backgroundLocationService.startBackgroundTracking({
        showMinimalNotification: true,
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000, // Check every 5 seconds
        distanceInterval: 10, // Or every 10 meters
      });

      if (!started) {
        console.error("Failed to start background location");
        return false;
      }

      // Subscribe to location updates
      this.backgroundUnsubscribe = backgroundLocationService.onLocationUpdate((locations) => {
        if (locations && locations.length > 0) {
          locations.forEach((location) => this.processLocation(location));
        }
      });

      this.isEnabled = true;
      this.state = "idle";
      console.log("🚗 Automatic trip detection started");
      return true;
    } catch (error) {
      console.error("Failed to start auto trip detection:", error);
      return false;
    }
  }

  /**
   * Stop automatic trip detection
   */
  async stop(): Promise<void> {
    if (!this.isEnabled) return;

    // Stop background tracking
    if (this.backgroundUnsubscribe) {
      this.backgroundUnsubscribe();
      this.backgroundUnsubscribe = null;
    }

    await backgroundLocationService.stopBackgroundTracking();

    // End current trip if active
    if (this.currentTrip && this.state === "driving") {
      await this.endTrip();
    }

    this.isEnabled = false;
    this.state = "idle";
    this.reset();
    console.log("🛑 Automatic trip detection stopped");
  }

  /**
   * Process location update and detect trip state changes
   */
  private processLocation(location: Location.LocationObject): void {
    const speed = (location.coords.speed || 0) * 3.6; // m/s to km/h
    const now = Date.now();

    // Update speed history (keep last 30 seconds)
    this.speedHistory.push({ speed, timestamp: now });
    this.speedHistory = this.speedHistory.filter((s) => now - s.timestamp < 30000);

    // State machine
    switch (this.state) {
      case "idle":
        this.handleIdleState(speed, location, now);
        break;
      case "detecting":
        this.handleDetectingState(speed, location, now);
        break;
      case "driving":
        this.handleDrivingState(speed, location, now);
        break;
      case "stopped":
        this.handleStoppedState(speed, location, now);
        break;
    }

    this.lastSpeed = speed;
  }

  /**
   * Idle state: Waiting for movement
   */
  private handleIdleState(speed: number, location: Location.LocationObject, now: number): void {
    if (speed >= this.config.startSpeedKmh) {
      this.movingSince = now;
      this.state = "detecting";
      console.log(`🔍 Detecting trip start (speed: ${speed.toFixed(1)} km/h)`);
    }
  }

  /**
   * Detecting state: Confirming it's a real trip, not just quick movement
   */
  private handleDetectingState(speed: number, location: Location.LocationObject, now: number): void {
    if (speed < this.config.startSpeedKmh) {
      // Speed dropped, reset
      this.movingSince = null;
      this.state = "idle";
      console.log("❌ False start - speed dropped");
      return;
    }

    // Check if we've been moving long enough
    if (this.movingSince && now - this.movingSince >= this.config.startDurationMs) {
      this.startTrip(location);
    }
  }

  /**
   * Driving state: Trip is active, tracking location
   */
  private handleDrivingState(speed: number, location: Location.LocationObject, now: number): void {
    if (!this.currentTrip) return;

    // Update trip data
    this.currentTrip.route.push({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
      speed,
    });

    // Calculate distance (simplified)
    if (this.currentTrip.route.length > 1) {
      const prevPoint = this.currentTrip.route[this.currentTrip.route.length - 2];
      const distance = this.calculateDistance(
        prevPoint.latitude,
        prevPoint.longitude,
        location.coords.latitude,
        location.coords.longitude,
      );
      this.currentTrip.distance += distance;
    }

    // Update stats
    this.currentTrip.duration = (now - this.currentTrip.startTime.getTime()) / 1000;
    this.currentTrip.maxSpeed = Math.max(this.currentTrip.maxSpeed, speed);

    if (this.currentTrip.duration > 0) {
      this.currentTrip.averageSpeed = this.currentTrip.distance / 1000 / (this.currentTrip.duration / 3600);
    }

    // Notify listeners of update
    this.notifyTripUpdate(this.currentTrip);

    // Check if stopped
    if (speed < this.config.stopSpeedKmh) {
      if (!this.stoppedSince) {
        this.stoppedSince = now;
        console.log(`⏸️ Vehicle stopped (speed: ${speed.toFixed(1)} km/h)`);
      }

      this.state = "stopped";
    } else {
      this.stoppedSince = null;
    }
  }

  /**
   * Stopped state: Waiting to see if trip ended or just temporary stop
   */
  private handleStoppedState(speed: number, location: Location.LocationObject, now: number): void {
    if (speed >= this.config.startSpeedKmh) {
      // Started moving again, resume trip
      this.stoppedSince = null;
      this.state = "driving";
      console.log("▶️ Trip resumed");
      return;
    }

    // Still stopped - check if it's been long enough to end trip
    if (this.stoppedSince && now - this.stoppedSince >= this.config.stopDurationMs) {
      this.endTrip();
    }
  }

  /**
   * Start a new trip
   */
  private startTrip(location: Location.LocationObject): void {
    const speed = (location.coords.speed || 0) * 3.6;

    this.currentTrip = {
      id: `trip-${Date.now()}`,
      startTime: new Date(),
      distance: 0,
      duration: 0,
      maxSpeed: speed,
      averageSpeed: speed,
      route: [
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          speed,
        },
      ],
      events: [],
    };

    this.state = "driving";
    this.stoppedSince = null;

    console.log("🚗 Trip started!", {
      id: this.currentTrip.id,
      location: `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`,
      speed: `${speed.toFixed(1)} km/h`,
    });

    // Notify listeners
    this.notifyTripStart(this.currentTrip);
  }

  /**
   * End the current trip
   */
  private async endTrip(): Promise<void> {
    if (!this.currentTrip) return;

    this.currentTrip.endTime = new Date();

    // Validate trip meets minimum requirements
    const isValid =
      this.currentTrip.distance >= this.config.minTripDistanceM &&
      this.currentTrip.duration >= this.config.minTripDurationS;

    if (!isValid) {
      console.log("❌ Trip too short, discarding", {
        distance: `${this.currentTrip.distance.toFixed(0)}m (min: ${this.config.minTripDistanceM}m)`,
        duration: `${this.currentTrip.duration.toFixed(0)}s (min: ${this.config.minTripDurationS}s)`,
      });
      this.reset();
      this.state = "idle";
      return;
    }

    console.log("🏁 Trip ended!", {
      id: this.currentTrip.id,
      distance: `${(this.currentTrip.distance / 1000).toFixed(2)} km`,
      duration: `${(this.currentTrip.duration / 60).toFixed(1)} min`,
      avgSpeed: `${this.currentTrip.averageSpeed.toFixed(1)} km/h`,
      maxSpeed: `${this.currentTrip.maxSpeed.toFixed(1)} km/h`,
      points: this.currentTrip.route.length,
    });

    // Notify listeners
    this.notifyTripEnd(this.currentTrip);

    // Reset for next trip
    this.reset();
    this.state = "idle";
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Reset detection state
   */
  private reset(): void {
    this.currentTrip = null;
    this.speedHistory = [];
    this.stoppedSince = null;
    this.movingSince = null;
    this.lastSpeed = 0;
  }

  /**
   * Subscribe to trip start events
   */
  onTripStart(callback: (trip: DetectedTrip) => void): () => void {
    this.onTripStartCallbacks.push(callback);
    return () => {
      this.onTripStartCallbacks = this.onTripStartCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe to trip end events
   */
  onTripEnd(callback: (trip: DetectedTrip) => void): () => void {
    this.onTripEndCallbacks.push(callback);
    return () => {
      this.onTripEndCallbacks = this.onTripEndCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe to trip update events
   */
  onTripUpdate(callback: (trip: DetectedTrip) => void): () => void {
    this.onTripUpdateCallbacks.push(callback);
    return () => {
      this.onTripUpdateCallbacks = this.onTripUpdateCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify listeners of trip start
   */
  private notifyTripStart(trip: DetectedTrip): void {
    this.onTripStartCallbacks.forEach((cb) => {
      try {
        cb(trip);
      } catch (error) {
        console.error("Error in trip start callback:", error);
      }
    });
  }

  /**
   * Notify listeners of trip end
   */
  private notifyTripEnd(trip: DetectedTrip): void {
    this.onTripEndCallbacks.forEach((cb) => {
      try {
        cb(trip);
      } catch (error) {
        console.error("Error in trip end callback:", error);
      }
    });
  }

  /**
   * Notify listeners of trip update
   */
  private notifyTripUpdate(trip: DetectedTrip): void {
    this.onTripUpdateCallbacks.forEach((cb) => {
      try {
        cb(trip);
      } catch (error) {
        console.error("Error in trip update callback:", error);
      }
    });
  }

  /**
   * Get current state
   */
  getState(): {
    isEnabled: boolean;
    state: TripState;
    currentTrip: DetectedTrip | null;
  } {
    return {
      isEnabled: this.isEnabled,
      state: this.state,
      currentTrip: this.currentTrip,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<TripDetectionConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TripDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("Trip detection config updated:", this.config);
  }
}

// Export singleton instance
export const autoTripDetection = new AutoTripDetectionService();
