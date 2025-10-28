/**
 * Trip Database Service
 *
 * Handles saving and retrieving trips from Supabase
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { DetectedTrip } from "./auto-trip-detection.service";

export interface SavedTrip {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  distance_km: number;
  duration_s: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
  route: any; // JSONB
  score?: number;
  created_at?: string;
}

class TripDatabaseService {
  /**
   * Save a detected trip to Supabase
   */
  async saveTrip(trip: DetectedTrip, userId: string): Promise<SavedTrip | null> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn("Supabase not configured, cannot save trip");
      return null;
    }

    try {
      // Get or create device
      const deviceId = await this.getOrCreateDevice(userId);
      if (!deviceId) {
        console.error("Failed to get/create device");
        return null;
      }

      // Get start and end coordinates from route
      const startCoords = trip.route && trip.route.length > 0 ? trip.route[0] : null;
      const endCoords = trip.route && trip.route.length > 0 ? trip.route[trip.route.length - 1] : null;

      const tripData = {
        user_id: userId,
        device_id: deviceId,
        started_at: trip.startTime.toISOString(),
        ended_at: trip.endTime ? trip.endTime.toISOString() : new Date().toISOString(),
        distance_km: trip.distance / 1000, // Convert meters to km
        duration_s: Math.round(trip.duration), // Duration in seconds
        start_lat: startCoords?.latitude,
        start_lon: startCoords?.longitude,
        end_lat: endCoords?.latitude,
        end_lon: endCoords?.longitude,
        start_address: "Auto-detected trip",
        end_address: "Auto-detected trip",
        route_json: trip.route.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })),
        status: 'closed' as const, // Mark as closed immediately for mobile app
      };

      const { data, error } = await supabase
        .from("trip") // NEW: Use 'trip' table (singular)
        .insert(tripData as any)
        .select()
        .single();

      if (error) {
        console.error("Error saving trip to database:", error);
        return null;
      }

      if (!data) {
        console.error("No data returned from insert");
        return null;
      }

      console.log("✅ Trip saved to database:", (data as any).id);
      
      // Map back to old format for compatibility
      return {
        id: (data as any).id,
        user_id: userId,
        start_time: tripData.started_at,
        end_time: tripData.ended_at,
        distance_km: tripData.distance_km,
        duration_s: tripData.duration_s,
        max_speed_kmh: trip.maxSpeed || 0,
        avg_speed_kmh: trip.averageSpeed || 0,
        route: tripData.route_json,
        score: (data as any).score,
        created_at: (data as any).created_at,
      };
    } catch (error) {
      console.error("Failed to save trip:", error);
      return null;
    }
  }

  /**
   * Get or create a device for the user
   */
  private async getOrCreateDevice(userId: string): Promise<string | null> {
    try {
      // Try to get existing device
      const { data: existingDevices, error: fetchError } = await supabase!
        .from("device")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (!fetchError && existingDevices && existingDevices.length > 0) {
        return existingDevices[0].id;
      }

      // Create new device
      const { data: newDevice, error: createError } = await supabase!
        .from("device")
        .insert({
          user_id: userId,
          platform: "ios", // You can detect this dynamically if needed
          label: "Mobile App",
        })
        .select()
        .single();

      if (createError || !newDevice) {
        console.error("Failed to create device:", createError);
        return null;
      }

      return (newDevice as any).id;
    } catch (error) {
      console.error("Error in getOrCreateDevice:", error);
      return null;
    }
  }

  /**
   * Get recent trips for a user
   */
  async getUserTrips(userId: string, limit: number = 20): Promise<SavedTrip[]> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn("Supabase not configured");
      return [];
    }

    try {
      // Use the trips_mobile view for easy access
      const { data, error } = await supabase
        .from("trips_mobile")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching trips:", error);
        return [];
      }

      // Map to expected format
      return (data || []).map((trip: any) => ({
        id: trip.id,
        user_id: trip.user_id,
        start_time: trip.date,
        end_time: trip.date, // Same day
        distance_km: trip.distance * 1.60934, // Convert miles back to km for consistency
        duration_s: trip.duration * 60, // Convert minutes back to seconds
        max_speed_kmh: 0, // Not in view
        avg_speed_kmh: 0, // Not in view
        route: trip.route || [],
        score: trip.score,
        created_at: trip.created_at,
      }));
    } catch (error) {
      console.error("Failed to fetch trips:", error);
      return [];
    }
  }

  /**
   * Get a single trip by ID
   */
  async getTrip(tripId: string): Promise<SavedTrip | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("trip")
        .select("*")
        .eq("id", tripId)
        .single();

      if (error) {
        console.error("Error fetching trip:", error);
        return null;
      }

      return {
        id: (data as any).id,
        user_id: (data as any).user_id,
        start_time: (data as any).started_at,
        end_time: (data as any).ended_at,
        distance_km: (data as any).distance_km,
        duration_s: (data as any).duration_s,
        max_speed_kmh: 0,
        avg_speed_kmh: 0,
        route: (data as any).route_json || [],
        score: (data as any).score,
        created_at: (data as any).created_at,
      };
    } catch (error) {
      console.error("Failed to fetch trip:", error);
      return null;
    }
  }

  /**
   * Delete a trip
   */
  async deleteTrip(tripId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) {
      return false;
    }

    try {
      const { error } = await supabase
        .from("trip")
        .delete()
        .eq("id", tripId);

      if (error) {
        console.error("Error deleting trip:", error);
        return false;
      }

      console.log("✅ Trip deleted:", tripId);
      return true;
    } catch (error) {
      console.error("Failed to delete trip:", error);
      return false;
    }
  }

  /**
   * Calculate basic score for a trip
   * This is a simplified scoring - the backend will calculate the real score
   */
  private calculateBasicScore(trip: DetectedTrip): number {
    let score = 100;

    // Deduct for high speeds (simplified)
    if (trip.maxSpeed > 120) score -= 10;
    else if (trip.maxSpeed > 100) score -= 5;

    // Deduct for very short trips (might be erratic)
    if (trip.distance < 1000 && trip.duration < 300) score -= 5;

    return Math.max(0, Math.min(100, score));
  }
}

// Export singleton
export const tripDatabase = new TripDatabaseService();
