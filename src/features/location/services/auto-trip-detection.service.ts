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
import { Accelerometer } from "expo-sensors";
import { AppState, AppStateStatus } from "react-native";
import { backgroundLocationService } from "./background-location.service";
import { driveTrackingService, DriveMetrics } from "./drive-tracking.service";
import { SpeedMonitor, SpeedViolation } from "../../../services/speed-monitoring.service";

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

export interface DrivingEvent {
  id: string;
  type: "hard_brake" | "rapid_acceleration" | "phone_use" | "sharp_turn";
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  severity: "low" | "medium" | "high";
  value?: number; // G-force value
  description: string;
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
  events: DrivingEvent[];
  speedViolations?: SpeedViolation[];
}

type TripState = "idle" | "detecting" | "driving" | "stopped";

class AutoTripDetectionService {
  private isEnabled = false;
  private state: TripState = "idle";
  private config: Required<TripDetectionConfig> = {
    startSpeedKmh: THRESHOLDS.START_SPEED_KMH,
    startDurationMs: THRESHOLDS.START_DURATION_MS,
    stopSpeedKmh: THRESHOLDS.STOP_SPEED_KMH,
    stopDurationMs: THRESHOLDS.STOP_DURATION_MS,
    minTripDistanceM: THRESHOLDS.MIN_TRIP_DISTANCE_M,
    minTripDurationS: THRESHOLDS.MIN_TRIP_DURATION_S,
  };

  // Detection state
  private lastSpeed = 0;
  private speedHistory: { speed: number; timestamp: number }[] = [];
  private stoppedSince: number | null = null;
  private movingSince: number | null = null;

  // Current trip data
  private currentTrip: DetectedTrip | null = null;
  private backgroundUnsubscribe: (() => void) | null = null;

  // Speed monitoring
  private speedMonitor: SpeedMonitor = new SpeedMonitor();

  // Accelerometer for hard braking/acceleration detection
  private accelerometerSubscription: any = null;
  private previousSpeed: number = 0;
  private lastAccelerationCheck: number = 0;
  private readonly HARD_BRAKE_THRESHOLD = -0.4; // G-force (negative = braking)
  private readonly HARD_ACCEL_THRESHOLD = 0.4; // G-force
  private readonly ACCEL_CHECK_INTERVAL = 1000; // Check every second

  // Phone distraction detection
  private appStateSubscription: any = null;
  private currentAppState: AppStateStatus = AppState.currentState;
  private lastAppStateChange: number = Date.now();
  private phoneUsageStartTime: number | null = null;
  private readonly MIN_PHONE_USAGE_DURATION = 3000; // Must be distracted for 3 seconds to count

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
  private async processLocation(location: Location.LocationObject): Promise<void> {
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
        await this.handleDrivingState(speed, location, now);
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
  private async handleDrivingState(speed: number, location: Location.LocationObject, now: number): Promise<void> {
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

    // Monitor speed and check for violations
    try {
      const speedMph = speed * 0.621371; // Convert km/h to mph
      const speedResult = await this.speedMonitor.update(
        location.coords.latitude,
        location.coords.longitude,
        speedMph
      );

      // If a violation occurred, add it to the trip
      if (speedResult.violation) {
        if (!this.currentTrip.speedViolations) {
          this.currentTrip.speedViolations = [];
        }
        this.currentTrip.speedViolations.push(speedResult.violation);
        
        console.log(`⚠️ Speed violation: ${speedResult.excessSpeed.toFixed(1)} mph over ${speedResult.speedLimit} mph limit (${speedResult.violation.severity})`);
      }
    } catch (error) {
      // Don't fail the trip if speed monitoring fails
      console.warn("Speed monitoring error:", error);
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
      speedViolations: [],
    };

    this.state = "driving";
    this.stoppedSince = null;

    // Reset speed monitor for new trip
    this.speedMonitor.reset();

    // Start accelerometer monitoring for hard braking/acceleration
    this.startAccelerometerMonitoring();

    // Start phone distraction monitoring
    this.startPhoneDistractionMonitoring();

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

    // Stop accelerometer monitoring
    this.stopAccelerometerMonitoring();

    // Stop phone distraction monitoring
    this.stopPhoneDistractionMonitoring();

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
      events: this.currentTrip.events.length,
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
   * Start accelerometer monitoring for hard braking/acceleration detection
   */
  private startAccelerometerMonitoring(): void {
    try {
      // Set update interval to 100ms for responsive detection
      Accelerometer.setUpdateInterval(100);

      this.accelerometerSubscription = Accelerometer.addListener((accelerometerData) => {
        if (!this.currentTrip || this.state !== "driving") return;

        const now = Date.now();
        
        // Only check periodically to avoid too many events
        if (now - this.lastAccelerationCheck < this.ACCEL_CHECK_INTERVAL) return;
        this.lastAccelerationCheck = now;

        // Calculate longitudinal acceleration (forward/backward)
        // In device coordinates: y-axis is typically forward/backward
        const longitudinalAccel = accelerometerData.y;

        // Get current speed for context
        const currentSpeed = this.lastSpeed;
        
        // Detect hard braking (negative acceleration)
        if (longitudinalAccel < this.HARD_BRAKE_THRESHOLD) {
          this.recordDrivingEvent({
            type: "hard_brake",
            severity: this.getAccelerationSeverity(Math.abs(longitudinalAccel)),
            value: longitudinalAccel,
            description: `Hard braking detected (${Math.abs(longitudinalAccel).toFixed(2)}g)`,
          });
        }
        
        // Detect rapid acceleration (positive acceleration)
        else if (longitudinalAccel > this.HARD_ACCEL_THRESHOLD) {
          this.recordDrivingEvent({
            type: "rapid_acceleration",
            severity: this.getAccelerationSeverity(longitudinalAccel),
            value: longitudinalAccel,
            description: `Rapid acceleration detected (${longitudinalAccel.toFixed(2)}g)`,
          });
        }

        this.previousSpeed = currentSpeed;
      });

      console.log("📡 Accelerometer monitoring started");
    } catch (error) {
      console.warn("Failed to start accelerometer monitoring:", error);
    }
  }

  /**
   * Stop accelerometer monitoring
   */
  private stopAccelerometerMonitoring(): void {
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
      console.log("📡 Accelerometer monitoring stopped");
    }
  }

  /**
   * Record a driving event (hard brake, rapid acceleration, etc.)
   */
  private recordDrivingEvent(params: {
    type: DrivingEvent["type"];
    severity: DrivingEvent["severity"];
    value?: number;
    description: string;
  }): void {
    if (!this.currentTrip) return;

    const lastRoutePoint = this.currentTrip.route[this.currentTrip.route.length - 1];
    if (!lastRoutePoint) return;

    const event: DrivingEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      timestamp: new Date(),
      location: {
        latitude: lastRoutePoint.latitude,
        longitude: lastRoutePoint.longitude,
      },
      severity: params.severity,
      value: params.value,
      description: params.description,
    };

    this.currentTrip.events.push(event);

    // Log for debugging
    const icon = params.type === "hard_brake" ? "🛑" : "⚡";
    console.log(`${icon} ${params.description} - Severity: ${params.severity}`);
  }

  /**
   * Determine severity based on G-force magnitude
   */
  private getAccelerationSeverity(gForce: number): DrivingEvent["severity"] {
    const absForce = Math.abs(gForce);
    if (absForce >= 0.7) return "high";
    if (absForce >= 0.5) return "medium";
    return "low";
  }

  /**
   * Start phone distraction monitoring (app state changes)
   */
  private startPhoneDistractionMonitoring(): void {
    try {
      this.currentAppState = AppState.currentState;
      this.lastAppStateChange = Date.now();
      this.phoneUsageStartTime = null;

      this.appStateSubscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
        if (!this.currentTrip || this.state !== "driving") return;

        const now = Date.now();
        const previousState = this.currentAppState;

        // Detect when user switches away from driving app (phone distraction)
        if (previousState === "active" && nextAppState.match(/inactive|background/)) {
          // User left the app - start tracking distraction
          this.phoneUsageStartTime = now;
          console.log("📱 Phone distraction started (app backgrounded)");
        }

        // Detect when user returns to the app
        if (previousState.match(/inactive|background/) && nextAppState === "active") {
          // User returned to app
          if (this.phoneUsageStartTime) {
            const distractionDuration = now - this.phoneUsageStartTime;

            // Only count if distracted for minimum duration (filters quick switches)
            if (distractionDuration >= this.MIN_PHONE_USAGE_DURATION) {
              this.recordDrivingEvent({
                type: "phone_use",
                severity: this.getPhoneUsageSeverity(distractionDuration),
                value: distractionDuration / 1000, // Duration in seconds
                description: `Phone distraction (${(distractionDuration / 1000).toFixed(1)}s)`,
              });
            }

            this.phoneUsageStartTime = null;
          }
        }

        this.currentAppState = nextAppState;
        this.lastAppStateChange = now;
      });

      console.log("📱 Phone distraction monitoring started");
    } catch (error) {
      console.warn("Failed to start phone distraction monitoring:", error);
    }
  }

  /**
   * Stop phone distraction monitoring
   */
  private stopPhoneDistractionMonitoring(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;

      // Record any ongoing distraction when trip ends
      if (this.phoneUsageStartTime && this.currentTrip) {
        const now = Date.now();
        const distractionDuration = now - this.phoneUsageStartTime;

        if (distractionDuration >= this.MIN_PHONE_USAGE_DURATION) {
          this.recordDrivingEvent({
            type: "phone_use",
            severity: this.getPhoneUsageSeverity(distractionDuration),
            value: distractionDuration / 1000,
            description: `Phone distraction (${(distractionDuration / 1000).toFixed(1)}s)`,
          });
        }

        this.phoneUsageStartTime = null;
      }

      console.log("📱 Phone distraction monitoring stopped");
    }
  }

  /**
   * Determine phone usage severity based on duration
   */
  private getPhoneUsageSeverity(durationMs: number): DrivingEvent["severity"] {
    const seconds = durationMs / 1000;
    if (seconds >= 20) return "high"; // 20+ seconds is very dangerous
    if (seconds >= 10) return "medium"; // 10-20 seconds is risky
    return "low"; // 3-10 seconds is still bad but less severe
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
