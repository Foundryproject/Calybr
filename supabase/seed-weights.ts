/**
 * Seed script for score_weights table
 * 
 * Inserts the initial scoring weights configuration into the database.
 * Run with: deno run --allow-net --allow-env seed-weights.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const WEIGHTS_VERSION_2025_10_19_A = {
  version: '2025-10-19-a',
  weights: {
    w_a: 10, // harsh_accel per 100km
    w_b: 14, // harsh_brake per 100km
    w_c: 12, // harsh_corner per 100km
    w_s1: 2, // speeding +5 mph (minutes)
    w_s2: 6, // speeding +10 mph (minutes)
    w_s3: 12, // speeding +20 mph (minutes)
    w_d: 15, // distraction (minutes)
    w_n: 2, // night penalty (night_fraction * trip_minutes)
    w_w: 4, // weather penalty (minutes)
    alpha: 0.15, // EMA smoothing factor

    // Per-term deduction caps (optional, prevents single bursts from tanking score)
    cap_harsh_accel: 100,
    cap_harsh_brake: 150,
    cap_harsh_corner: 100,
    cap_speeding_5: 50,
    cap_speeding_10: 150,
    cap_speeding_20: 300,
    cap_distraction: 200,
    cap_night: 50,
    cap_weather: 100,
  },
};

async function seedWeights() {
  // Get Supabase credentials from environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      'Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
    );
    Deno.exit(1);
  }

  console.log(`Connecting to Supabase at ${supabaseUrl}...`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Insert weights
  console.log(
    `Inserting score weights version: ${WEIGHTS_VERSION_2025_10_19_A.version}`,
  );

  const { data, error } = await supabase
    .from('score_weights')
    .upsert(WEIGHTS_VERSION_2025_10_19_A, {
      onConflict: 'version',
    })
    .select();

  if (error) {
    console.error('Error inserting weights:', error);
    Deno.exit(1);
  }

  console.log('✅ Successfully seeded score weights:', data);
  console.log('\nWeights configuration:');
  console.log(JSON.stringify(WEIGHTS_VERSION_2025_10_19_A.weights, null, 2));
}

// Run the seed script
if (import.meta.main) {
  await seedWeights();
}



