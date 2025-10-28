/**
 * Ingest Telemetry Edge Function
 * 
 * Receives batched telemetry data from mobile devices and stores it in Supabase.
 * Creates or updates trips and samples.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { IngestPayload, IngestResponse } from '../_shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase credentials');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: IngestPayload = await req.json();

    if (!payload.userId || !payload.deviceId || !payload.samples) {
      return jsonResponse({ error: 'Invalid payload. Required: userId, deviceId, samples' }, 400);
    }

    if (!Array.isArray(payload.samples) || payload.samples.length === 0) {
      return jsonResponse({ error: 'samples must be a non-empty array' }, 400);
    }

    const { error: deviceError } = await supabase
      .from('device')
      .upsert({
        id: payload.deviceId,
        user_id: payload.userId,
        platform: 'unknown',
        label: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false })
      .select('id, user_id')
      .single();

    if (deviceError) return jsonResponse({ error: 'Failed to upsert device' }, 500);

    const { data: existingTrips, error: tripQueryError } = await supabase
      .from('trip')
      .select('id')
      .eq('device_id', payload.deviceId)
      .eq('status', 'open')
      .order('started_at', { ascending: false })
      .limit(1);

    if (tripQueryError) return jsonResponse({ error: 'Failed to query trips' }, 500);

    let tripId: string;

    if (existingTrips?.length > 0) {
      tripId = existingTrips[0].id;
    } else {
      const { data: newTrip, error: tripCreateError } = await supabase
        .from('trip')
        .insert({
          user_id: payload.userId,
          device_id: payload.deviceId,
          started_at: payload.samples[0].ts,
          status: 'open',
        })
        .select('id')
        .single();

      if (tripCreateError) return jsonResponse({ error: 'Failed to create trip' }, 500);
      tripId = newTrip.id;
    }

    const { error: sampleError } = await supabase
      .from('sample')
      .upsert(
        payload.samples.map((sample) => ({
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
        })),
        { onConflict: 'trip_id,ts', ignoreDuplicates: true }
      );

    if (sampleError) return jsonResponse({ error: 'Failed to insert samples' }, 500);

    return jsonResponse({ tripId, samplesIngested: payload.samples.length });
  } catch (error) {
    console.error('Unexpected error:', error);
    return jsonResponse({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});



