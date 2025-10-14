/**
 * Drive Mode Tracking Service
 * 
 * Real-time GPS tracking with driving behavior analysis
 * - Tracks speed, acceleration, braking, phone usage
 * - Calculates DriveScore in real-time
 * - Detects driving events (hard brake, speeding, etc.)
 * - Provides route and ETA via Google Directions API
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface DrivingEvent {
  id: string;
  type: 'hard_brake' | 'hard_acceleration' | 'speeding' | 'phone_use' | 'sharp_turn';
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
  };
  severity: 'low' | 'medium' | 'high';
  value?: number; // Speed, G-force, etc.
  description: string;
}

export interface DriveMetrics {
  distance: number; // meters
  duration: number; // seconds
  currentSpeed: number; // km/h
  averageSpeed: number;
  maxSpeed: number;
  score: number; // 0-100
  events: DrivingEvent[];
  route: Array<{
    latitude: number;
    longitude: number;
    timestamp: number;
    speed: number;
    heading: number;
  }>;
}

export interface DriveState {
  isTracking: boolean;
  metrics: DriveMetrics;
  lastLocation: Location.LocationObject | null;
  destination: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  eta: {
    duration: number; // seconds
    distance: number; // meters
    arrivalTime: Date;
  } | null;
}

class DriveTrackingService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private previousLocation: Location.LocationObject | null = null;
  private previousSpeed: number = 0;
  private startTime: number = 0;
  
  private state: DriveState = {
    isTracking: false,
    metrics: {
      distance: 0,
      duration: 0,
      currentSpeed: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      score: 100,
      events: [],
      route: [],
    },
    lastLocation: null,
    destination: null,
    eta: null,
  };

  private listeners: Array<(state: DriveState) => void> = [];

  // Thresholds for event detection
  private readonly HARD_BRAKE_THRESHOLD = -0.4; // G-force (negative = braking)
  private readonly HARD_ACCEL_THRESHOLD = 0.4; // G-force
  private readonly SPEED_LIMIT_DEFAULT = 100; // km/h (will be dynamic based on road type)
  // Note: Sharp turn detection would require gyroscope data - reserved for future use

  /**
   * Start tracking drive mode
   */
  async startTracking(destination?: { latitude: number; longitude: number; address?: string }): Promise<boolean> {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return false;
      }

      // Request background permission for continuous tracking
      if (Platform.OS === 'ios') {
        await Location.requestBackgroundPermissionsAsync();
      }

      // Reset state
      this.startTime = Date.now();
      this.state = {
        isTracking: true,
        metrics: {
          distance: 0,
          duration: 0,
          currentSpeed: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          score: 100,
          events: [],
          route: [],
        },
        lastLocation: null,
        destination: destination || null,
        eta: null,
      };

      // Start GPS tracking with high accuracy
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Or every 5 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      // Get initial ETA if destination provided
      if (destination) {
        await this.updateETA(destination);
      }

      this.notifyListeners();
      console.log('🚗 Drive tracking started');
      return true;
    } catch (error) {
      console.error('Failed to start drive tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking
   */
  async stopTracking(): Promise<DriveMetrics> {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.state.isTracking = false;
    this.state.metrics.duration = (Date.now() - this.startTime) / 1000;

    const finalMetrics = { ...this.state.metrics };
    this.notifyListeners();
    
    console.log('🛑 Drive tracking stopped', finalMetrics);
    return finalMetrics;
  }

  /**
   * Handle new location update
   */
  private handleLocationUpdate(location: Location.LocationObject) {
    const { coords } = location;
    const currentSpeed = (coords.speed || 0) * 3.6; // m/s to km/h

    // Calculate distance from previous point
    let segmentDistance = 0;
    if (this.previousLocation) {
      segmentDistance = this.calculateDistance(
        this.previousLocation.coords.latitude,
        this.previousLocation.coords.longitude,
        coords.latitude,
        coords.longitude
      );
    }

    // Update metrics
    this.state.metrics.distance += segmentDistance;
    this.state.metrics.duration = (Date.now() - this.startTime) / 1000;
    this.state.metrics.currentSpeed = currentSpeed;
    this.state.metrics.maxSpeed = Math.max(this.state.metrics.maxSpeed, currentSpeed);

    // Calculate average speed
    if (this.state.metrics.duration > 0) {
      this.state.metrics.averageSpeed = 
        (this.state.metrics.distance / 1000) / (this.state.metrics.duration / 3600);
    }

    // Add to route
    this.state.metrics.route.push({
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: location.timestamp,
      speed: currentSpeed,
      heading: coords.heading || 0,
    });

    // Detect driving events
    this.detectDrivingEvents(location);

    // Update score based on events
    this.calculateDriveScore();

    // Update state
    this.state.lastLocation = location;
    this.previousLocation = location;
    this.previousSpeed = currentSpeed;

    this.notifyListeners();
  }

  /**
   * Detect driving events (hard braking, acceleration, etc.)
   */
  private detectDrivingEvents(location: Location.LocationObject) {
    if (!this.previousLocation) return;

    const currentSpeed = (location.coords.speed || 0) * 3.6;
    const timeDelta = (location.timestamp - this.previousLocation.timestamp) / 1000; // seconds

    if (timeDelta === 0) return;

    // Calculate acceleration (m/s²)
    const acceleration = ((currentSpeed - this.previousSpeed) / 3.6) / timeDelta;

    // Hard Braking Detection
    if (acceleration < this.HARD_BRAKE_THRESHOLD) {
      this.addEvent({
        type: 'hard_brake',
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        severity: this.getSeverityFromValue(Math.abs(acceleration), 0.4, 0.7),
        value: acceleration,
        description: `Hard brake detected (${Math.abs(acceleration).toFixed(2)}g)`,
      });
    }

    // Hard Acceleration Detection
    if (acceleration > this.HARD_ACCEL_THRESHOLD) {
      this.addEvent({
        type: 'hard_acceleration',
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        severity: this.getSeverityFromValue(acceleration, 0.4, 0.7),
        value: acceleration,
        description: `Hard acceleration detected (${acceleration.toFixed(2)}g)`,
      });
    }

    // Speeding Detection (simplified - would use actual speed limits from map data)
    if (currentSpeed > this.SPEED_LIMIT_DEFAULT) {
      const overspeed = currentSpeed - this.SPEED_LIMIT_DEFAULT;
      this.addEvent({
        type: 'speeding',
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        severity: this.getSeverityFromValue(overspeed, 10, 20),
        value: currentSpeed,
        description: `Speeding: ${currentSpeed.toFixed(0)} km/h (limit: ${this.SPEED_LIMIT_DEFAULT})`,
      });
    }

    // TODO: Sharp turn detection would require gyroscope data
    // TODO: Phone usage detection would require additional sensors/permissions
  }

  /**
   * Add driving event
   */
  private addEvent(eventData: Omit<DrivingEvent, 'id' | 'timestamp'>) {
    const event: DrivingEvent = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
    };

    this.state.metrics.events.push(event);
  }

  /**
   * Calculate real-time drive score
   */
  private calculateDriveScore() {
    let score = 100;

    // Deduct points for each event based on severity
    this.state.metrics.events.forEach((event) => {
      const deduction = event.severity === 'high' ? 10 : event.severity === 'medium' ? 5 : 2;
      score -= deduction;
    });

    // Deduct points for excessive speeding
    if (this.state.metrics.maxSpeed > this.SPEED_LIMIT_DEFAULT + 20) {
      score -= 10;
    }

    // Ensure score stays within bounds
    this.state.metrics.score = Math.max(0, Math.min(100, score));
  }

  /**
   * Update ETA using Google Directions API
   */
  private async updateETA(destination: { latitude: number; longitude: number }) {
    if (!this.state.lastLocation) return;

    try {
      const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn('Google Maps API key not found, using simple ETA calculation');
        // Fallback to simple calculation
        this.calculateSimpleETA(destination);
        return;
      }

      const origin = `${this.state.lastLocation.coords.latitude},${this.state.lastLocation.coords.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin}&destination=${dest}&` +
        `key=${GOOGLE_MAPS_API_KEY}&` +
        `departure_time=now&traffic_model=best_guess`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        // Use duration_in_traffic if available, otherwise use duration
        const duration = leg.duration_in_traffic?.value || leg.duration.value;
        const distance = leg.distance.value;
        
        this.state.eta = {
          duration,
          distance,
          arrivalTime: new Date(Date.now() + duration * 1000),
        };
      } else {
        console.warn('Google Directions API error:', data.status);
        this.calculateSimpleETA(destination);
      }
    } catch (error) {
      console.error('Failed to update ETA:', error);
      this.calculateSimpleETA(destination);
    }
  }

  /**
   * Fallback: Calculate simple ETA based on straight-line distance
   */
  private calculateSimpleETA(destination: { latitude: number; longitude: number }) {
    if (!this.state.lastLocation) return;

    const distance = this.calculateDistance(
      this.state.lastLocation.coords.latitude,
      this.state.lastLocation.coords.longitude,
      destination.latitude,
      destination.longitude
    );

    // Simple ETA estimation
    const averageSpeed = this.state.metrics.averageSpeed || 50; // km/h
    const duration = (distance / 1000) / averageSpeed * 3600; // seconds

    this.state.eta = {
      duration,
      distance,
      arrivalTime: new Date(Date.now() + duration * 1000),
    };
  }

  /**
   * Set destination and get route
   */
  async setDestination(latitude: number, longitude: number, address?: string) {
    this.state.destination = { latitude, longitude, address };
    await this.updateETA({ latitude, longitude });
    this.notifyListeners();
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

    return R * c;
  }

  /**
   * Get severity level from value
   */
  private getSeverityFromValue(value: number, mediumThreshold: number, highThreshold: number): 'low' | 'medium' | 'high' {
    if (value >= highThreshold) return 'high';
    if (value >= mediumThreshold) return 'medium';
    return 'low';
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: DriveState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get current state
   */
  getState(): DriveState {
    return this.state;
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

// Singleton instance
export const driveTrackingService = new DriveTrackingService();
