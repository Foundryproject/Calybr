/**
 * Ingest Telemetry Edge Function
 * 
 * Receives batched telemetry data from mobile devices and stores it in Supabase.
 * Creates or updates trips and samples.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { IngestPayload, IngestResponse } from '../_shared/types.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface DeviceRow {
  id: string;
  user_id: string;
  platform: string;
  label?: string;
}

interface TripRow {
  id: string;
  user_id: string;
  device_id: string;
  status: 'open' | 'finalizing' | 'closed';
  started_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: IngestPayload = await req.json();

    // Validate payload
    if (!payload.userId || !payload.deviceId || !payload.samples) {
      return new Response(
        JSON.stringify({
          error: 'Invalid payload. Required: userId, deviceId, samples',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!Array.isArray(payload.samples) || payload.samples.length === 0) {
      return new Response(
        JSON.stringify({ error: 'samples must be a non-empty array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Upsert device
    const { data: device, error: deviceError } = await supabase
      .from('device')
      .upsert({
        id: payload.deviceId,
        user_id: payload.userId,
        platform: 'unknown', // TODO: Extract from client headers
        label: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select('id, user_id')
      .single();

    if (deviceError) {
      console.error('Device upsert error:', deviceError);
      return new Response(
        JSON.stringify({ error: 'Failed to upsert device' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Find or create an open trip for this device
    const { data: existingTrips, error: tripQueryError } = await supabase
      .from('trip')
      .select('id, user_id, device_id, status, started_at')
      .eq('device_id', payload.deviceId)
      .eq('status', 'open')
      .order('started_at', { ascending: false })
      .limit(1);

    if (tripQueryError) {
      console.error('Trip query error:', tripQueryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query trips' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    let tripId: string;

    if (existingTrips && existingTrips.length > 0) {
      // Use existing open trip
      tripId = existingTrips[0].id;
    } else {
      // Create a new trip
      const firstSampleTs = payload.samples[0].ts;
      const { data: newTrip, error: tripCreateError } = await supabase
        .from('trip')
        .insert({
          user_id: payload.userId,
          device_id: payload.deviceId,
          started_at: firstSampleTs,
          status: 'open',
        })
        .select('id')
        .single();

      if (tripCreateError) {
        console.error('Trip creation error:', tripCreateError);
        return new Response(
          JSON.stringify({ error: 'Failed to create trip' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      tripId = newTrip.id;
    }

    // Insert samples (upsert by trip_id + ts for idempotency)
    const sampleRows = payload.samples.map((sample) => ({
      trip_id: tripId,
      ts: sample.ts,
      lat: sample.lat,
      lon: sample.lon,
      speed_mps: sample.speed_mps,
      heading_deg: sample.heading_deg ?? null,
      hdop: sample.hdop ?? null,
      ax: sample.accel?.ax ?? null,
      ay: sample.accel?.ay ?? null,
      az: sample.accel?.az ?? null,
      screen_on: sample.screen_on ?? false,
    }));

    const { error: sampleError } = await supabase
      .from('sample')
      .upsert(sampleRows, {
        onConflict: 'trip_id,ts',
        ignoreDuplicates: true,
      });

    if (sampleError) {
      console.error('Sample upsert error:', sampleError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert samples' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Return success response
    const response: IngestResponse = {
      tripId: tripId,
      samplesIngested: payload.samples.length,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});



