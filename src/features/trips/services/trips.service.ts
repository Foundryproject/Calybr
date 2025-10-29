import { supabase } from '../../../lib/supabase';
import type { Trip, DriveEvent } from '../../../types/drive';

/**
 * Trips Service
 * Handles all trip-related database operations
 */

export interface CreateTripData {
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  distance: number; // miles
  score: number;
  estimatedCost: number;
  startAddress: string;
  endAddress: string;
  route: { latitude: number; longitude: number }[];
  events: DriveEvent[];
}

const transformTrip = (trip: any): Trip => {
  try {
    // Extract date and time from started_at timestamp
    const startDate = new Date(trip.started_at);
    const endDate = trip.ended_at ? new Date(trip.ended_at) : startDate;
    
    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
      console.error('Invalid start date for trip:', trip.id, trip.started_at);
      return null as any; // Skip invalid trips
    }
    
    const transformed = {
      id: trip.id,
      date: startDate,
      startTime: startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      endTime: endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      duration: trip.duration_s ? Math.round(trip.duration_s / 60) : 0, // Convert seconds to minutes
      distance: trip.distance_km || 0,
      score: trip.score || 85, // Default score if null
      estimatedCost: trip.estimated_cost_usd || (trip.distance_km * 0.15) || 0, // Calculate if missing
      startAddress: trip.start_address || 'Unknown location',
      endAddress: trip.end_address || 'Unknown location',
      route: Array.isArray(trip.route_json) ? trip.route_json : [],
      events: (trip.event || []).map((event: any) => ({
        id: event.id,
        type: event.type,
        timestamp: event.ts_start,
        severity: event.severity || 0.5,
        location: event.lat && event.lon ? { latitude: event.lat, longitude: event.lon } : undefined,
        description: `${event.type.replace(/_/g, ' ')}`,
        tip: 'Review this event to improve your driving score',
        speed: 0, // Not stored in base event table
        gForce: 0, // Not stored in base event table
      })),
    };
    
    return transformed;
  } catch (error) {
    console.error('Error transforming trip:', trip.id, error);
    return null as any; // Skip trips that fail to transform
  }
};

/**
 * Get all trips for the current user
 */
export async function getUserTrips(): Promise<{ data: Trip[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('getUserTrips: No user authenticated');
      return { data: null, error: { message: 'User not authenticated' } };
    }

    console.log('getUserTrips: Querying trips for user:', user.id);

    const { data, error } = await supabase
      .from('trip')
      .select(`
        id,
        user_id,
        device_id,
        started_at,
        ended_at,
        distance_km,
        duration_s,
        score,
        estimated_cost_usd,
        start_address,
        end_address,
        start_lat,
        start_lon,
        end_lat,
        end_lon,
        route_json,
        status,
        event (
          id,
          type,
          ts_start,
          ts_end,
          severity,
          lat,
          lon
        )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('getUserTrips: Database error:', error);
      return { data: null, error };
    }

    console.log(`getUserTrips: Found ${data?.length || 0} raw trips in database`);
    if (data && data.length > 0) {
      console.log('getUserTrips: First raw trip:', JSON.stringify(data[0], null, 2));
    }

    const transformedTrips = (data || [])
      .map(transformTrip)
      .filter(trip => trip !== null && trip !== undefined); // Remove failed transforms
      
    console.log(`getUserTrips: Transformed ${transformedTrips.length} trips`);
    if (transformedTrips.length > 0) {
      console.log('getUserTrips: First transformed trip:', JSON.stringify(transformedTrips[0], null, 2));
    }

    return { data: transformedTrips, error: null };
  } catch (error) {
    console.error('Error in getUserTrips:', error);
    return { data: null, error };
  }
}

/**
 * Get a single trip by ID
 */
export async function getTripById(tripId: string): Promise<{ data: Trip | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('trip')
      .select('*, event (*)')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: { message: 'Trip not found' } };
    return { data: transformTrip(data), error: null };
  } catch (error) {
    console.error('Error in getTripById:', error);
    return { data: null, error };
  }
}

/**
 * Create a new trip
 * Note: This function expects device_id to already exist. Use trip-database.service.ts for auto-creating device.
 */
export async function createTrip(tripData: CreateTripData): Promise<{ data: Trip | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    // Get first device for user (simplified - you may want to track active device)
    const { data: devices } = await supabase
      .from('device')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (!devices || devices.length === 0) {
      return { data: null, error: { message: 'No device found for user' } };
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + tripData.duration * 60000); // duration is in minutes

    const { data: tripRecord, error: tripError } = await supabase
      .from('trip')
      .insert({
        user_id: user.id,
        device_id: (devices[0] as any).id,
        started_at: startDate.toISOString(),
        ended_at: endDate.toISOString(),
        duration_s: tripData.duration * 60, // Convert minutes to seconds
        distance_km: tripData.distance, // Assuming distance is already in km
        score: tripData.score,
        estimated_cost_usd: tripData.estimatedCost,
        start_address: tripData.startAddress,
        end_address: tripData.endAddress,
        route_json: tripData.route,
        status: 'closed', // Mark as closed for completed trips
      } as any)
      .select()
      .single();

    if (tripError || !tripRecord) return { data: null, error: tripError };

    if (tripData.events?.length > 0) {
      await supabase.from('event').insert(
        tripData.events.map((event) => ({
          trip_id: (tripRecord as any).id,
          type: event.type,
          ts_start: event.timestamp,
          severity: event.severity,
          lat: event.location?.latitude,
          lon: event.location?.longitude,
        })) as any
      );
    }

    return await getTripById((tripRecord as any).id);
  } catch (error) {
    console.error('Error in createTrip:', error);
    return { data: null, error };
  }
}

/**
 * Delete a trip
 */
export async function deleteTrip(tripId: string): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not authenticated' } };

    const { error } = await supabase
      .from('trip') // Use actual table (singular) for DELETE
      .delete()
      .eq('id', tripId)
      .eq('user_id', user.id);

    return { error };
  } catch (error) {
    console.error('Error in deleteTrip:', error);
    return { error };
  }
}

/**
 * Get trips for a specific date range
 */
export async function getTripsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<{ data: Trip[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('trip')
      .select('*, event (*)')
      .eq('user_id', user.id)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .order('started_at', { ascending: false });

    if (error) return { data: null, error };
    return { data: (data || []).map(transformTrip), error: null };
  } catch (error) {
    console.error('Error in getTripsByDateRange:', error);
    return { data: null, error };
  }
}
