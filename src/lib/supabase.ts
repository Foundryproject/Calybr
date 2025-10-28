import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase configuration
// IMPORTANT: Add your Supabase credentials to .env file:
// EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
// EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
// Get them from: https://app.supabase.com/project/_/settings/api

// Support both EXPO_PUBLIC_ prefix and direct env vars
// Trim whitespace to handle .env formatting issues
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

// Debug logging
console.log("Supabase URL loaded:", supabaseUrl ? "YES" : "NO");
console.log("Supabase Key loaded:", supabaseAnonKey ? "YES" : "NO");

// Create a placeholder client that will work without configuration
const createSupabaseClient = () => {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")) {
    console.log("✅ Creating Supabase client");
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  console.log("❌ Supabase not configured - missing URL or Key");
  return null;
};

export const supabase = createSupabaseClient();
export type SupabaseClientType = typeof supabase;

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"));
};

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone_number: string | null;
          age: number | null;
          gender: string | null;
          car_make: string | null;
          car_model: string | null;
          car_year: number | null;
          license_plate: string | null;
          avatar_url: string | null;
          city: string | null;
          country: string | null;
          member_since: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone_number?: string | null;
          age?: number | null;
          gender?: string | null;
          car_make?: string | null;
          car_model?: string | null;
          car_year?: number | null;
          license_plate?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          member_since?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          phone_number?: string | null;
          age?: number | null;
          gender?: string | null;
          car_make?: string | null;
          car_model?: string | null;
          car_year?: number | null;
          license_plate?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          member_since?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          start_time: string;
          end_time: string;
          duration: number;
          distance: number;
          score: number;
          estimated_cost: number;
          start_address: string;
          end_address: string;
          route: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          start_time: string;
          end_time: string;
          duration: number;
          distance: number;
          score: number;
          estimated_cost: number;
          start_address: string;
          end_address: string;
          route?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          duration?: number;
          distance?: number;
          score?: number;
          estimated_cost?: number;
          start_address?: string;
          end_address?: string;
          route?: any;
          created_at?: string;
        };
      };
      drive_events: {
        Row: {
          id: string;
          trip_id: string;
          type: string;
          timestamp: number;
          severity: string;
          location: any;
          description: string;
          tip: string;
          speed: number | null;
          g_force: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          type: string;
          timestamp: number;
          severity: string;
          location: any;
          description: string;
          tip: string;
          speed?: number | null;
          g_force?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          type?: string;
          timestamp?: number;
          severity?: string;
          location?: any;
          description?: string;
          tip?: string;
          speed?: number | null;
          g_force?: number | null;
          created_at?: string;
        };
      };
      driver_scores: {
        Row: {
          id: string;
          user_id: string;
          overall_score: number;
          week_delta: number;
          speeding_score: number;
          hard_brakes_score: number;
          phone_distraction_score: number;
          cornering_score: number;
          night_driving_score: number;
          highway_score: number;
          total_trips: number;
          driving_streak: number;
          level: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          overall_score?: number;
          week_delta?: number;
          speeding_score?: number;
          hard_brakes_score?: number;
          phone_distraction_score?: number;
          cornering_score?: number;
          night_driving_score?: number;
          highway_score?: number;
          total_trips?: number;
          driving_streak?: number;
          level?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          overall_score?: number;
          week_delta?: number;
          speeding_score?: number;
          hard_brakes_score?: number;
          phone_distraction_score?: number;
          cornering_score?: number;
          night_driving_score?: number;
          highway_score?: number;
          total_trips?: number;
          driving_streak?: number;
          level?: number;
          updated_at?: string;
        };
      };
    };
    Views: {
      leaderboard_city: {
        Row: {
          user_id: string;
          name: string;
          overall_score: number;
          city: string;
          car_make: string;
          car_model: string;
          car_year: number;
          driving_streak: number;
          total_trips: number;
          member_since: string;
          rank: number;
        };
      };
      leaderboard_country: {
        Row: {
          user_id: string;
          name: string;
          overall_score: number;
          country: string;
          car_make: string;
          car_model: string;
          car_year: number;
          driving_streak: number;
          total_trips: number;
          member_since: string;
          rank: number;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
