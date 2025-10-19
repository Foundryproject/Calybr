/**
 * Trips Finalize Edge Function
 * 
 * Scheduled function that runs every 3 minutes to finalize open trips.
 * Processes trip data: map matching, event detection, feature extraction, scoring.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type {
  DEFAULT_QUALITY_GATES,
  ProcessedSample,
  ScoreWeights,
  TripContext,
} from '../_shared/types.ts';
import { preprocessSamples } from '../_shared/signal.ts';
import {
  buildLineString,
  calculateNightFraction,
  calculateTripDistance,
} from '../_shared/geo.ts';
import { excludeTripEnds, meetsMinimumRequirements } from '../_shared/segment.ts';
import { detectAllEvents } from '../_shared/events.ts';
import {
  calculateQualityMetrics,
  calculateRoadMix,
  extractTripFeatures,
} from '../_shared/features.ts';
import {
  determineConfidence,
  scoreTripWithBreakdown,
  updateRDSWithSingleTrip,
} from '../_shared/score.ts';
import {
  applyMapMatchingToSamples,
  createMapProvider,
} from '../_shared/providers/map.ts';
import {
  calculateWeatherPenalty,
  createWeatherProvider,
  getDominantWeatherCondition,
} from '../_shared/providers/weather.ts';

interface FinalizeResponse {
  finalized: number;
  errors: string[];
}

Deno.serve(async (_req) => {
  const errors: string[] = [];
  let finalizedCount = 0;

  try {
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current score weights
    const { data: weightsData, error: weightsError } = await supabase
      .from('score_weights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (weightsError || !weightsData) {
      console.error('Failed to load score weights:', weightsError);
      errors.push('Failed to load score weights');
      return new Response(
        JSON.stringify({ finalized: 0, errors }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const weights: ScoreWeights = {
      version: weightsData.version,
      ...weightsData.weights,
    };

    // Get trips to finalize using RPC
    const { data: tripsToFinalize, error: tripsError } = await supabase
      .rpc('get_trips_to_finalize');

    if (tripsError) {
      console.error('Failed to get trips to finalize:', tripsError);
      errors.push('Failed to get trips to finalize');
      return new Response(
        JSON.stringify({ finalized: 0, errors }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (!tripsToFinalize || tripsToFinalize.length === 0) {
      console.log('No trips to finalize');
      return new Response(
        JSON.stringify({ finalized: 0, errors: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Found ${tripsToFinalize.length} trips to finalize`);

    // Process each trip
    for (const tripInfo of tripsToFinalize) {
      try {
        await processTripFinalization(
          supabase,
          tripInfo.trip_id,
          weights,
        );
        finalizedCount++;
      } catch (error) {
        console.error(`Failed to finalize trip ${tripInfo.trip_id}:`, error);
        errors.push(
          `Trip ${tripInfo.trip_id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    const response: FinalizeResponse = {
      finalized: finalizedCount,
      errors,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error in trips-finalize:', error);
    return new Response(
      JSON.stringify({
        finalized: finalizedCount,
        errors: [
          ...errors,
          `Unexpected error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});

/**
 * Process a single trip finalization
 */
async function processTripFinalization(
  supabase: any,
  tripId: string,
  weights: ScoreWeights,
): Promise<void> {
  console.log(`Processing trip ${tripId}`);

  // Mark trip as finalizing
  await supabase
    .from('trip')
    .update({ status: 'finalizing' })
    .eq('id', tripId);

  // Load trip data
  const { data: trip, error: tripError } = await supabase
    .from('trip')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw new Error(`Failed to load trip: ${tripError?.message}`);
  }

  // Load samples in ascending order
  const { data: sampleRows, error: samplesError } = await supabase
    .from('sample')
    .select('*')
    .eq('trip_id', tripId)
    .order('ts', { ascending: true });

  if (samplesError || !sampleRows || sampleRows.length === 0) {
    throw new Error(`Failed to load samples: ${samplesError?.message}`);
  }

  // Convert to ProcessedSample
  const samples: ProcessedSample[] = sampleRows.map((row: any) => ({
    ts: row.ts,
    timestamp: new Date(row.ts),
    lat: row.lat,
    lon: row.lon,
    speed_mps: row.speed_mps,
    heading_deg: row.heading_deg,
    hdop: row.hdop,
    accel: row.ax !== null && row.ay !== null && row.az !== null
      ? { ax: row.ax, ay: row.ay, az: row.az }
      : undefined,
    screen_on: row.screen_on,
  }));

  // Calculate trip metrics
  const distanceKm = calculateTripDistance(samples);
  const startTime = samples[0].timestamp;
  const endTime = samples[samples.length - 1].timestamp;
  const durationS = (endTime.getTime() - startTime.getTime()) / 1000;
  const tripMinutes = durationS / 60;

  // Check minimum requirements
  const gates = {
    min_map_match_conf: 0.6,
    max_hdop: 1.5,
    min_speed_kmh: 10,
    min_trip_distance_km: 2,
    min_trip_minutes: 5,
  };

  if (
    !meetsMinimumRequirements(
      distanceKm,
      tripMinutes,
      gates.min_trip_distance_km,
      gates.min_trip_minutes,
    )
  ) {
    console.log(
      `Trip ${tripId} does not meet minimum requirements (${distanceKm} km, ${tripMinutes} min)`,
    );

    // Close trip with insufficient data
    await supabase
      .from('trip')
      .update({
        status: 'closed',
        ended_at: endTime.toISOString(),
        distance_km: distanceKm,
        duration_s: Math.round(durationS),
        quality: { insufficient_data: true },
      })
      .eq('id', tripId);

    return;
  }

  // Preprocess: smooth acceleration and project to road frame
  preprocessSamples(samples);

  // Map matching
  const mapProvider = createMapProvider();
  try {
    const mapMatchRequest = {
      points: samples.map((s) => ({
        lat: s.lat,
        lon: s.lon,
        timestamp: s.timestamp,
      })),
    };
    const mapMatchResults = await mapProvider.matchToRoads(mapMatchRequest);
    applyMapMatchingToSamples(samples, mapMatchResults);
  } catch (error) {
    console.warn(`Map matching failed for trip ${tripId}:`, error);
    // Continue without map matching data
  }

  // Calculate context
  const nightFraction = calculateNightFraction(samples);
  const roadMix = calculateRoadMix(samples);
  const qualityMetrics = calculateQualityMetrics(
    samples,
    gates.min_map_match_conf,
    gates.max_hdop,
  );

  // Weather data
  const weatherProvider = createWeatherProvider();
  let weatherPenaltyMins = 0;
  let weatherData: any = {};

  try {
    const weatherConditions = await weatherProvider.getHistoricalWeather({
      lat: samples[0].lat,
      lon: samples[0].lon,
      start_time: startTime,
      end_time: endTime,
    });

    weatherPenaltyMins = calculateWeatherPenalty(
      weatherConditions,
      tripMinutes,
    );
    weatherData = {
      dominant_condition: getDominantWeatherCondition(weatherConditions),
      penalty_mins: weatherPenaltyMins,
    };
  } catch (error) {
    console.warn(`Weather lookup failed for trip ${tripId}:`, error);
  }

  const context: TripContext = {
    night_fraction: nightFraction,
    weather_penalty_mins: weatherPenaltyMins,
    road_mix: roadMix,
    quality: qualityMetrics,
  };

  // Exclude trip ends (first/last 200m)
  const filteredSamples = excludeTripEnds(samples, 200);

  // Event detection
  const events = detectAllEvents(filteredSamples, gates);

  console.log(`Detected ${events.length} events for trip ${tripId}`);

  // Extract features
  const features = extractTripFeatures(
    events,
    distanceKm,
    tripMinutes,
    context,
  );

  // Determine confidence
  const confidence = determineConfidence(qualityMetrics.quality_ratio);

  // Calculate score
  const tripScore = scoreTripWithBreakdown(
    tripId,
    features,
    weights,
    confidence,
  );

  console.log(
    `Trip ${tripId} scored ${tripScore.tss} with confidence ${confidence}`,
  );

  // Build LineString geometry
  const geomWkt = buildLineString(samples);

  // Persist results in transaction-like manner
  // Update trip
  const { error: updateTripError } = await supabase
    .from('trip')
    .update({
      status: 'closed',
      ended_at: endTime.toISOString(),
      distance_km: distanceKm,
      duration_s: Math.round(durationS),
      night_fraction: nightFraction,
      weather: weatherData,
      road_mix: roadMix,
      quality: qualityMetrics,
      geom: geomWkt,
    })
    .eq('id', tripId);

  if (updateTripError) {
    throw new Error(`Failed to update trip: ${updateTripError.message}`);
  }

  // Insert events
  if (events.length > 0) {
    const eventRows = events.map((e) => ({
      trip_id: tripId,
      ts_start: e.ts_start.toISOString(),
      ts_end: e.ts_end?.toISOString() ?? null,
      type: e.type,
      severity: e.severity,
      lat: e.lat,
      lon: e.lon,
    }));

    const { error: eventsError } = await supabase
      .from('event')
      .insert(eventRows);

    if (eventsError) {
      console.error(`Failed to insert events for trip ${tripId}:`, eventsError);
    }
  }

  // Upsert trip_features
  const { error: featuresError } = await supabase
    .from('trip_features')
    .upsert({
      trip_id: tripId,
      ...features,
    });

  if (featuresError) {
    throw new Error(`Failed to upsert features: ${featuresError.message}`);
  }

  // Upsert trip_score
  const { error: scoreError } = await supabase
    .from('trip_score')
    .upsert({
      trip_id: tripId,
      tss: tripScore.tss,
      breakdown: tripScore.breakdown,
      confidence: tripScore.confidence,
      weights_version: tripScore.weights_version,
    });

  if (scoreError) {
    throw new Error(`Failed to upsert score: ${scoreError.message}`);
  }

  // Update driver_score_daily with EMA
  const tripDay = startTime.toISOString().split('T')[0];

  // Get current daily score
  const { data: currentDailyScore } = await supabase
    .from('driver_score_daily')
    .select('rds')
    .eq('user_id', trip.user_id)
    .eq('day', tripDay)
    .single();

  const currentRds = currentDailyScore?.rds ?? null;

  // Calculate new RDS
  const newRds = updateRDSWithSingleTrip(
    currentRds,
    tripScore.tss,
    distanceKm,
    weights.alpha,
  );

  // Upsert daily score
  const { error: dailyScoreError } = await supabase
    .from('driver_score_daily')
    .upsert({
      user_id: trip.user_id,
      day: tripDay,
      rds: newRds,
      trips_count: (currentDailyScore?.trips_count ?? 0) + 1,
      total_distance_km: (currentDailyScore?.total_distance_km ?? 0) +
        distanceKm,
    });

  if (dailyScoreError) {
    console.error(
      `Failed to update daily score for trip ${tripId}:`,
      dailyScoreError,
    );
  }

  console.log(`Trip ${tripId} finalized successfully`);
}



