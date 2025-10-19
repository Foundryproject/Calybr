import { supabase } from '../lib/supabase';
import type { Trip, DriveEvent } from '../types/drive';

export interface CreateTripData {
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  distance: number;
  score: number;
  estimatedCost: number;
  startAddress: string;
  endAddress: string;
  route: { latitude: number; longitude: number }[];
  events: DriveEvent[];
}

const transformTrip = (trip: any): Trip => ({
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
});

export async function getUserTrips(): Promise<{ data: Trip[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('trips')
      .select('*, drive_events (*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) return { data: null, error };
    return { data: (data || []).map(transformTrip), error: null };
  } catch (error) {
    console.error('Error in getUserTrips:', error);
    return { data: null, error };
  }
}

export async function getTripById(tripId: string): Promise<{ data: Trip | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('trips')
      .select('*, drive_events (*)')
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

export async function createTrip(tripData: CreateTripData): Promise<{ data: Trip | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

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

    if (tripError || !tripRecord) return { data: null, error: tripError };

    if (tripData.events?.length > 0) {
      await supabase.from('drive_events').insert(
        tripData.events.map((event) => ({
          trip_id: tripRecord.id,
          type: event.type,
          timestamp: event.timestamp,
          severity: event.severity,
          location: event.location,
          description: event.description,
          tip: event.tip,
          speed: event.speed,
          g_force: event.gForce,
        }))
      );
    }

    return await getTripById(tripRecord.id);
  } catch (error) {
    console.error('Error in createTrip:', error);
    return { data: null, error };
  }
}

export async function deleteTrip(tripId: string): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not authenticated' } };

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', user.id);

    return { error };
  } catch (error) {
    console.error('Error in deleteTrip:', error);
    return { error };
  }
}

export async function getTripsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<{ data: Trip[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('trips')
      .select('*, drive_events (*)')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) return { data: null, error };
    return { data: (data || []).map(transformTrip), error: null };
  } catch (error) {
    console.error('Error in getTripsByDateRange:', error);
    return { data: null, error };
  }
}
