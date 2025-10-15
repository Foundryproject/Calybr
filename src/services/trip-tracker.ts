/**
 * Automatic Trip Tracking Service
 * 
 * This service uses:
 * - Core Motion to detect automotive activity (battery efficient)
 * - Core Location to track GPS points during trips
 * - Background location updates for continuous tracking
 * 
 * Flow:
 * 1. Monitor motion activity continuously
 * 2. When automotive motion detected → Start GPS tracking
 * 3. Record location points, speed, and calculate metrics
 * 4. When stationary for 3+ minutes → End trip automatically
 * 5. Save trip data and generate summary
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  speed: number | null; // meters per second
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface TripMetrics {
  distance: number; // meters
  duration: number; // seconds
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h
  startTime: number;
  endTime: number | null;
  points: LocationPoint[];
}

export type TripStatus = 'idle' | 'detecting' | 'recording' | 'paused' | 'ending';

export interface TripTrackerState {
  status: TripStatus;
  currentTrip: TripMetrics | null;
  lastLocation: LocationPoint | null;
}

// Thresholds for trip detection
const MOTION_CHECK_INTERVAL = 5000; // Check every 5 seconds
const STATIONARY_THRESHOLD = 180000; // 3 minutes of no movement = trip ended
const MIN_SPEED_THRESHOLD = 1.4; // ~5 km/h in m/s (minimum speed to consider moving)
const MIN_DISTANCE_FOR_TRIP = 100; // meters (minimum distance to save a trip)
const MAX_TIME_BETWEEN_POINTS = 300000; // 5 minutes max gap

class TripTrackerService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private motionCheckInterval: NodeJS.Timeout | null = null;
  private lastMovementTime: number = Date.now();
  private stationaryStartTime: number | null = null;
  
  private state: TripTrackerState = {
    status: 'idle',
    currentTrip: null,
    lastLocation: null,
  };

  private listeners: Array<(state: TripTrackerState) => void> = [];

  /**
   * Initialize trip tracker - start monitoring for motion
   */
  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission denied');
        return false;
      }

      // Start motion detection
      this.startMotionDetection();
      
      console.log('✅ Trip Tracker initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize trip tracker:', error);
      return false;
    }
  }

  /**
   * Request background location permission (call this from settings/onboarding)
   */
  async requestBackgroundPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === 'granted';
    }
    // Android handles background in foreground permission
    return true;
  }

  /**
   * Start monitoring motion - check periodically for movement
   * In a real iOS app, this would use Core Motion CMMotionActivityManager
   * For React Native/Expo, we use location monitoring as a proxy
   */
  private startMotionDetection() {
    if (this.motionCheckInterval) return;

    this.updateState({ status: 'detecting' });

    // Start background location monitoring (low power mode)
    this.startBackgroundMonitoring();

    // Periodically check if we should start/stop tracking
    this.motionCheckInterval = setInterval(() => {
      this.checkTripStatus();
    }, MOTION_CHECK_INTERVAL);

    console.log('🔍 Motion detection started');
  }

  /**
   * Start low-power background location monitoring
   */
  private async startBackgroundMonitoring() {
    try {
      // Use significant location changes for battery efficiency
      // This wakes the app when user moves ~500m
      await Location.startLocationUpdatesAsync('background-location-task', {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 500, // Update every 500 meters
        deferredUpdatesInterval: 60000, // Batch updates every minute
        foregroundService: {
          notificationTitle: 'Calybr Trip Tracking',
          notificationBody: 'Monitoring your drives automatically',
          notificationColor: '#FFD60A',
        },
      });
    } catch (error) {
      console.warn('Could not start background monitoring:', error);
    }
  }

  /**
   * Check current motion status and decide if we should track
   */
  private async checkTripStatus() {
    const { status, currentTrip, lastLocation } = this.state;

    // Get current location to check speed
    try {
      const location = await Location.getLastKnownPositionAsync({
        maxAge: 30000, // Use cached location up to 30 seconds old
      });

      if (!location) return;

      const speed = location.coords.speed || 0;
      const isMoving = speed >= MIN_SPEED_THRESHOLD;

      // Update last movement time
      if (isMoving) {
        this.lastMovementTime = Date.now();
        this.stationaryStartTime = null;
      } else if (!this.stationaryStartTime) {
        this.stationaryStartTime = Date.now();
      }

      // Decision logic
      if (status === 'detecting' && isMoving) {
        // Start tracking a new trip
        this.startTrip(location);
      } else if (status === 'recording' && !isMoving) {
        // Check if we've been stationary long enough to end trip
        const stationaryDuration = this.stationaryStartTime
          ? Date.now() - this.stationaryStartTime
          : 0;

        if (stationaryDuration >= STATIONARY_THRESHOLD) {
          this.endTrip();
        }
      } else if (status === 'recording' && isMoving) {
        // Continue tracking - already handled by location subscription
        this.lastMovementTime = Date.now();
      }
    } catch (error) {
      console.error('Error checking trip status:', error);
    }
  }

  /**
   * Start recording a new trip
   */
  private async startTrip(initialLocation: Location.LocationObject) {
    console.log('🚗 Trip started!');

    const startPoint: LocationPoint = {
      latitude: initialLocation.coords.latitude,
      longitude: initialLocation.coords.longitude,
      speed: initialLocation.coords.speed ?? null,
      altitude: initialLocation.coords.altitude ?? null,
      accuracy: initialLocation.coords.accuracy,
      timestamp: initialLocation.timestamp,
    };

    const newTrip: TripMetrics = {
      distance: 0,
      duration: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      startTime: Date.now(),
      endTime: null,
      points: [startPoint],
    };

    this.updateState({
      status: 'recording',
      currentTrip: newTrip,
      lastLocation: startPoint,
    });

    // Start high-accuracy GPS tracking
    await this.startGPSTracking();

    // Notify listeners (to show recording screen)
    this.notifyListeners();
  }

  /**
   * Start high-accuracy GPS tracking for active trip
   */
  private async startGPSTracking() {
    if (this.locationSubscription) return;

    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000, // Update every 2 seconds
          distanceInterval: 10, // Or every 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      console.log('📍 GPS tracking started');
    } catch (error) {
      console.error('Failed to start GPS tracking:', error);
    }
  }

  /**
   * Handle new location point during active trip
   */
  private handleLocationUpdate(location: Location.LocationObject) {
    const { currentTrip, lastLocation } = this.state;
    
    if (!currentTrip || this.state.status !== 'recording') return;

    const newPoint: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      speed: location.coords.speed ?? null,
      altitude: location.coords.altitude ?? null,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };

    // Calculate distance from last point
    let segmentDistance = 0;
    if (lastLocation) {
      segmentDistance = this.calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        newPoint.latitude,
        newPoint.longitude
      );
    }

    // Update trip metrics
    const updatedTrip: TripMetrics = {
      ...currentTrip,
      distance: currentTrip.distance + segmentDistance,
      duration: (Date.now() - currentTrip.startTime) / 1000, // seconds
      maxSpeed: Math.max(
        currentTrip.maxSpeed,
        (newPoint.speed || 0) * 3.6 // m/s to km/h
      ),
      points: [...currentTrip.points, newPoint],
    };

    // Calculate average speed
    if (updatedTrip.duration > 0) {
      updatedTrip.averageSpeed = (updatedTrip.distance / 1000) / (updatedTrip.duration / 3600); // km/h
    }

    this.updateState({
      currentTrip: updatedTrip,
      lastLocation: newPoint,
    });

    // Notify listeners for live updates
    this.notifyListeners();
  }

  /**
   * End the current trip
   */
  private async endTrip() {
    const { currentTrip } = this.state;
    
    if (!currentTrip) return;

    console.log('🛑 Trip ended!');

    this.updateState({ status: 'ending' });

    // Stop GPS tracking
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Finalize trip data
    const finalTrip: TripMetrics = {
      ...currentTrip,
      endTime: Date.now(),
      duration: (Date.now() - currentTrip.startTime) / 1000,
    };

    // Check if trip is valid (minimum distance)
    if (finalTrip.distance < MIN_DISTANCE_FOR_TRIP) {
      console.log('Trip too short, discarding');
      this.updateState({
        status: 'detecting',
        currentTrip: null,
        lastLocation: null,
      });
      this.notifyListeners();
      return;
    }

    // Save trip (listeners will handle this)
    this.notifyListeners();

    // Reset to detecting mode
    setTimeout(() => {
      this.updateState({
        status: 'detecting',
        currentTrip: null,
        lastLocation: null,
      });
      this.notifyListeners();
    }, 3000); // Give listeners time to save trip
  }

  /**
   * Manually end trip (user pressed stop button)
   */
  async stopTrip() {
    await this.endTrip();
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Subscribe to trip state changes
   */
  subscribe(listener: (state: TripTrackerState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get current state
   */
  getState(): TripTrackerState {
    return this.state;
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<TripTrackerState>) {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Stop all tracking and clean up
   */
  async shutdown() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.motionCheckInterval) {
      clearInterval(this.motionCheckInterval);
      this.motionCheckInterval = null;
    }

    try {
      await Location.stopLocationUpdatesAsync('background-location-task');
    } catch (error) {
      // Ignore errors
    }

    this.updateState({
      status: 'idle',
      currentTrip: null,
      lastLocation: null,
    });

    console.log('🔴 Trip Tracker shut down');
  }
}

// Singleton instance
export const tripTracker = new TripTrackerService();
