import { supabase } from '../lib/supabase';
import type { Trip, DriveEvent } from '../types/drive';

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

/**
 * Get all trips for the current user
 */
export async function getUserTrips(): Promise<{ data: Trip[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        drive_events (*)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching trips:', error);
      return { data: null, error };
    }

    // Transform database format to app format
    const trips: Trip[] = (data || []).map((trip: any) => ({
      id: trip.id,
      date: new Date(trip.date),
      startTime: trip.start_time,
      endTime: trip.end_time,
      duration: trip.duration,
      distance: trip.distance,
      score: trip.score,
      estimatedCost: trip.estimated_cost,
      startAddress: trip.start_address,
      endAddress: trip.end_address,
      route: trip.route || [],
      events: (trip.drive_events || []).map((event: any) => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        severity: event.severity,
        location: event.location,
        description: event.description,
        tip: event.tip,
        speed: event.speed,
        gForce: event.g_force,
      })),
    }));

    return { data: trips, error: null };
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
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        drive_events (*)
      `)
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching trip:', error);
      return { data: null, error };
    }

    if (!data) {
      return { data: null, error: { message: 'Trip not found' } };
    }

    // Transform database format to app format
    const trip: Trip = {
      id: data.id,
      date: new Date(data.date),
      startTime: data.start_time,
      endTime: data.end_time,
      duration: data.duration,
      distance: data.distance,
      score: data.score,
      estimatedCost: data.estimated_cost,
      startAddress: data.start_address,
      endAddress: data.end_address,
      route: data.route || [],
      events: (data.drive_events || []).map((event: any) => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        severity: event.severity,
        location: event.location,
        description: event.description,
        tip: event.tip,
        speed: event.speed,
        gForce: event.g_force,
      })),
    };

    return { data: trip, error: null };
  } catch (error) {
    console.error('Error in getTripById:', error);
    return { data: null, error };
  }
}

/**
 * Create a new trip
 */
export async function createTrip(tripData: CreateTripData): Promise<{ data: Trip | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Insert trip
    const { data: tripRecord, error: tripError } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        date: tripData.date.toISOString().split('T')[0],
        start_time: tripData.startTime,
        end_time: tripData.endTime,
        duration: tripData.duration,
        distance: tripData.distance,
        score: tripData.score,
        estimated_cost: tripData.estimatedCost,
        start_address: tripData.startAddress,
        end_address: tripData.endAddress,
        route: tripData.route,
      })
      .select()
      .single();

    if (tripError || !tripRecord) {
      console.error('Error creating trip:', tripError);
      return { data: null, error: tripError };
    }

    // Insert events if any
    if (tripData.events && tripData.events.length > 0) {
      const eventsToInsert = tripData.events.map((event) => ({
        trip_id: tripRecord.id,
        type: event.type,
        timestamp: event.timestamp,
        severity: event.severity,
        location: event.location,
        description: event.description,
        tip: event.tip,
        speed: event.speed,
        g_force: event.gForce,
      }));

      const { error: eventsError } = await supabase
        .from('drive_events')
        .insert(eventsToInsert);

      if (eventsError) {
        console.error('Error creating events:', eventsError);
      }
    }

    // Fetch the complete trip with events
    return await getTripById(tripRecord.id);
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
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    // Delete trip (events will cascade delete due to foreign key)
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting trip:', error);
      return { error };
    }

    return { error: null };
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
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        drive_events (*)
      `)
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching trips by date range:', error);
      return { data: null, error };
    }

    // Transform database format to app format
    const trips: Trip[] = (data || []).map((trip: any) => ({
      id: trip.id,
      date: new Date(trip.date),
      startTime: trip.start_time,
      endTime: trip.end_time,
      duration: trip.duration,
      distance: trip.distance,
      score: trip.score,
      estimatedCost: trip.estimated_cost,
      startAddress: trip.start_address,
      endAddress: trip.end_address,
      route: trip.route || [],
      events: (trip.drive_events || []).map((event: any) => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        severity: event.severity,
        location: event.location,
        description: event.description,
        tip: event.tip,
        speed: event.speed,
        gForce: event.g_force,
      })),
    }));

    return { data: trips, error: null };
  } catch (error) {
    console.error('Error in getTripsByDateRange:', error);
    return { data: null, error };
  }
}
