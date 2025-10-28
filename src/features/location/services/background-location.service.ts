/**
 * Background Location Service
 *
 * Enables continuous location tracking even when the app is in the background
 * Essential for automatic trip detection and drive tracking
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

// Notification priority options
export type NotificationPriority = "min" | "low" | "default" | "high" | "max";

export interface BackgroundTrackingOptions {
  accuracy?: Location.LocationAccuracy;
  timeInterval?: number;
  distanceInterval?: number;
  notificationPriority?: NotificationPriority; // Android only
  showMinimalNotification?: boolean; // Shortcut for 'min' priority
}

// Define the task name for background location
export const BACKGROUND_LOCATION_TASK = "background-location-task";

// Background location data interface
export interface BackgroundLocationData {
  locations: Location.LocationObject[];
}

// Callback type for background location updates
type LocationCallback = (locations: Location.LocationObject[]) => void;

class BackgroundLocationService {
  private callbacks: LocationCallback[] = [];
  private isRunning = false;

  /**
   * Request location permissions with proper flow
   * iOS requires requesting "Always" permission after "When In Use"
   */
  async requestPermissions(): Promise<{
    granted: boolean;
    foreground: boolean;
    background: boolean;
  }> {
    try {
      // Step 1: Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        console.warn("Foreground location permission denied");
        return { granted: false, foreground: false, background: false };
      }

      console.log("✅ Foreground location permission granted");

      // Step 2: Request background permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== "granted") {
        console.warn("Background location permission denied");
        return { granted: false, foreground: true, background: false };
      }

      console.log("✅ Background location permission granted");

      return { granted: true, foreground: true, background: true };
    } catch (error) {
      console.error("Error requesting location permissions:", error);
      return { granted: false, foreground: false, background: false };
    }
  }

  /**
   * Check if all required permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();

    return foreground.granted && background.granted;
  }

  /**
   * Get current permission status with details
   */
  async getPermissionStatus(): Promise<{
    foreground: Location.PermissionStatus;
    background: Location.PermissionStatus;
  }> {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();

    return {
      foreground: foreground.status,
      background: background.status,
    };
  }

  /**
   * Start background location tracking
   * This will continue tracking even when app is closed/backgrounded
   * @param options - Optional configuration for tracking behavior
   */
  async startBackgroundTracking(options?: BackgroundTrackingOptions): Promise<boolean> {
    try {
      // Check permissions
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        console.error("Missing location permissions");
        return false;
      }

      // Check if task is already defined
      const isTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
      if (!isTaskDefined) {
        this.defineBackgroundTask();
      }

      // Check if already running
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        console.log("Background location task already running");
        this.isRunning = true;
        return true;
      }

      // Determine notification priority
      const notificationPriority = options?.showMinimalNotification ? "min" : options?.notificationPriority || "min"; // Default to minimal

      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: options?.accuracy || Location.Accuracy.Balanced,
        timeInterval: options?.timeInterval || 5000, // Update every 5 seconds
        distanceInterval: options?.distanceInterval || 10, // Or every 10 meters
        foregroundService: {
          notificationTitle: "Calybr",
          notificationBody: "Drive tracking active",
          notificationColor: "#1E1E1E", // Dark gray - subtle
          // Android: Make notification minimal and silent by default
          ...(Platform.OS === "android" && {
            killServiceOnDestroy: false,
            notificationPriority, // 'min' = icon in status bar only, no expanded view
            notificationChannelName: "Background Location",
            notificationChannelDescription: "Location tracking for drive monitoring",
            notificationChannelImportance:
              notificationPriority === "min" || notificationPriority === "low"
                ? "low" // Silent notification
                : "default",
          }),
        },
        pausesUpdatesAutomatically: false, // Keep tracking even when stationary
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true, // iOS: Show blue bar
      });

      this.isRunning = true;
      console.log("🚗 Background location tracking started");
      return true;
    } catch (error) {
      console.error("Failed to start background tracking:", error);
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  async stopBackgroundTracking(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log("🛑 Background location tracking stopped");
      }

      this.isRunning = false;
    } catch (error) {
      console.error("Failed to stop background tracking:", error);
    }
  }

  /**
   * Check if background tracking is currently active
   */
  async isTrackingActive(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      this.isRunning = isRegistered;
      return isRegistered;
    } catch {
      return false;
    }
  }

  /**
   * Define the background task handler
   * This function runs in the background even when app is closed
   */
  private defineBackgroundTask() {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error("Background location task error:", error);
        return;
      }

      if (data) {
        const { locations } = data as BackgroundLocationData;

        // Notify all registered callbacks
        this.callbacks.forEach((callback) => {
          try {
            callback(locations);
          } catch (err) {
            console.error("Error in location callback:", err);
          }
        });

        // Log for debugging (will appear in device logs)
        if (locations && locations.length > 0) {
          const { latitude, longitude, speed } = locations[0].coords;
          console.log(
            `📍 Background location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}, ` +
              `Speed: ${((speed || 0) * 3.6).toFixed(1)} km/h`,
          );
        }
      }
    });
  }

  /**
   * Register a callback for location updates
   * Useful for processing locations in your app
   */
  onLocationUpdate(callback: LocationCallback): () => void {
    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Get the current status of the service
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeCallbacks: this.callbacks.length,
      taskName: BACKGROUND_LOCATION_TASK,
    };
  }
}

// Export singleton instance
export const backgroundLocationService = new BackgroundLocationService();

// Export for direct use in other files
export { Location, TaskManager };
