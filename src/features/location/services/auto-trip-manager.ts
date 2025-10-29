/**
 * Auto Trip Manager
 *
 * Manages the lifecycle of automatic trip detection:
 * - Starts/stops auto detection
 * - Listens for trip events
 * - Saves trips to database
 * - Updates UI state
 */

import { autoTripDetection, DetectedTrip } from "./auto-trip-detection.service";
import { tripDatabase } from "../../trips/services/trip-database.service";
import { useDriveStore } from "../../../state/driveStore";
import { getShortLocationName } from "../../../utils/geocoding";
import { calculateDriverScore, calculateTripScore } from "../../../services/driver-score-calculator.service";

class AutoTripManager {
  private unsubscribers: (() => void)[] = [];

  /**
   * Initialize and start automatic trip detection
   */
  async start(userId: string): Promise<boolean> {
    if (!userId) {
      console.error("Cannot start auto trip detection: No user ID");
      return false;
    }

    try {
      // Start auto detection
      const started = await autoTripDetection.start({
        startSpeedKmh: 15, // 15 km/h to start trip
        startDurationMs: 10000, // 10 seconds
        stopSpeedKmh: 5, // 5 km/h = stopped
        stopDurationMs: 120000, // 2 minutes stopped = trip ended
        minTripDistanceM: 500, // 500m minimum
        minTripDurationS: 60, // 1 minute minimum
      });

      if (!started) {
        return false;
      }

      // Subscribe to trip start events
      const unsubStart = autoTripDetection.onTripStart((trip) => {
        this.handleTripStart(trip);
      });

      // Subscribe to trip update events
      const unsubUpdate = autoTripDetection.onTripUpdate((trip) => {
        this.handleTripUpdate(trip);
      });

      // Subscribe to trip end events
      const unsubEnd = autoTripDetection.onTripEnd((trip) => {
        this.handleTripEnd(trip, userId);
      });

      this.unsubscribers = [unsubStart, unsubUpdate, unsubEnd];

      // Update state
      useDriveStore.getState().setAutoTripDetectionEnabled(true);

      console.log("✅ Auto trip manager started");
      return true;
    } catch (error) {
      console.error("Failed to start auto trip manager:", error);
      return false;
    }
  }

  /**
   * Stop automatic trip detection
   */
  async stop(): Promise<void> {
    // Unsubscribe from events
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Stop auto detection
    await autoTripDetection.stop();

    // Update state
    useDriveStore.getState().setAutoTripDetectionEnabled(false);
    useDriveStore.getState().setActiveAutoTrip(null);

    console.log("✅ Auto trip manager stopped");
  }

  /**
   * Handle trip start
   */
  private handleTripStart(trip: DetectedTrip): void {
    console.log("🚗 Trip started:", {
      id: trip.id,
      time: trip.startTime.toLocaleTimeString(),
    });

    // Update active trip in state
    useDriveStore.getState().setActiveAutoTrip({
      id: trip.id,
      startTime: trip.startTime,
      distance: trip.distance,
      duration: trip.duration,
      status: "active",
    });

    // Silent - no notification needed, user is driving
  }

  /**
   * Handle trip update (called periodically while driving)
   */
  private handleTripUpdate(trip: DetectedTrip): void {
    // Update active trip in state with latest data
    useDriveStore.getState().setActiveAutoTrip({
      id: trip.id,
      startTime: trip.startTime,
      distance: trip.distance,
      duration: trip.duration,
      avgSpeed: trip.averageSpeed,
      maxSpeed: trip.maxSpeed,
      status: "active",
    });
  }

  /**
   * Handle trip end and save to database
   */
  private async handleTripEnd(trip: DetectedTrip, userId: string): Promise<void> {
    console.log("🏁 Trip ended, saving to database...", {
      id: trip.id,
      distance: `${(trip.distance / 1000).toFixed(2)} km`,
      duration: `${(trip.duration / 60).toFixed(1)} min`,
    });

    try {
      // Save to database
      const savedTrip = await tripDatabase.saveTrip(trip, userId);

      if (savedTrip) {
        // Get current trips and driver score
        const currentTrips = useDriveStore.getState().trips;
        const currentDriverScore = useDriveStore.getState().driverScore?.overall || 500;

        // Create trip object for scoring
        const tripForScoring = {
          id: savedTrip.id,
          date: new Date(savedTrip.start_time),
          startTime: new Date(savedTrip.start_time).toLocaleTimeString(),
          endTime: new Date(savedTrip.end_time).toLocaleTimeString(),
          duration: Math.round(savedTrip.duration_s / 60),
          distance: savedTrip.distance_km,
          score: 0, // Will be calculated
          estimatedCost: savedTrip.distance_km * 0.5,
          startAddress: "Auto-detected trip",
          endAddress: "Auto-detected trip",
          route: savedTrip.route,
          events: [],
          speedViolations: savedTrip.speed_violations || [],
        };

        // Calculate comprehensive score for this trip
        const allTripsForScoring = [...currentTrips, tripForScoring];
        const scoreData = calculateDriverScore(allTripsForScoring, currentDriverScore);

        // Update trip with calculated score
        tripForScoring.score = scoreData.tripScore;

        // Add to local trips list
        useDriveStore.getState().addTrip(tripForScoring);

        // Update overall driver score
        useDriveStore.getState().setDriverScore({
          overall: scoreData.overallScore,
          metrics: [
            {
              name: "Hard Braking",
              score: Math.round(scoreData.breakdown.hardBraking * 4), // 0-100 scale
              trend: scoreData.trend === 'improving' ? 'up' : scoreData.trend === 'declining' ? 'down' : 'stable',
              percentile: 50,
              advice: "Brake gradually to improve safety",
            },
            {
              name: "Acceleration",
              score: Math.round(scoreData.breakdown.rapidAcceleration * 6.67), // 0-100 scale
              trend: scoreData.trend === 'improving' ? 'up' : scoreData.trend === 'declining' ? 'down' : 'stable',
              percentile: 50,
              advice: "Accelerate smoothly for better efficiency",
            },
            {
              name: "Speed Compliance",
              score: scoreData.breakdown.speedViolations ? Math.max(0, 100 - scoreData.breakdown.speedViolations * 5) : 100,
              trend: 'stable',
              percentile: 50,
              advice: "Stay within speed limits",
            },
          ],
          lastUpdated: new Date(),
        });

        console.log("✅ Trip saved successfully:", {
          id: savedTrip.id,
          tripScore: scoreData.tripScore,
          newOverallScore: scoreData.overallScore,
          trend: scoreData.trend,
        });

        // Silent save - no notification needed
      } else {
        console.warn("⚠️ Failed to save trip to database");
      }
    } catch (error) {
      console.error("❌ Error saving trip:", error);
    } finally {
      // Clear active trip
      useDriveStore.getState().setActiveAutoTrip(null);
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    const detectionState = autoTripDetection.getState();
    const storeState = useDriveStore.getState();

    return {
      isEnabled: detectionState.isEnabled,
      state: detectionState.state,
      activeTrip: storeState.activeAutoTrip,
      currentTrip: detectionState.currentTrip,
    };
  }

  /**
   * Check if auto detection is running
   */
  isRunning(): boolean {
    return autoTripDetection.getState().isEnabled;
  }
}

// Export singleton
export const autoTripManager = new AutoTripManager();
