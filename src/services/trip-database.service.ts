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
      const tripData = {
        user_id: userId,
        date: trip.startTime.toISOString().split("T")[0], // Date only
        start_time: trip.startTime.toISOString(),
        end_time: trip.endTime ? trip.endTime.toISOString() : new Date().toISOString(),
        duration: Math.round(trip.duration), // Duration in seconds
        distance: trip.distance / 1000, // Distance in km
        score: this.calculateBasicScore(trip),
        estimated_cost: (trip.distance / 1000) * 0.5, // Simple cost calculation
        start_address: "Auto-detected trip",
        end_address: "Auto-detected trip",
        route: trip.route.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })),
      };

      const { data, error } = await supabase
        .from("trips")
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
      return data as any;
    } catch (error) {
      console.error("Failed to save trip:", error);
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
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "closed")
        .order("start_time", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching trips:", error);
        return [];
      }

      return data || [];
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
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();

      if (error) {
        console.error("Error fetching trip:", error);
        return null;
      }

      return data;
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
      const { error } = await supabase.from("trips").delete().eq("id", tripId);

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
