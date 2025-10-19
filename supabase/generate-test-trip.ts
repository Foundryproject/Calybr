/**
 * Test trip data generator
 * 
 * Generates realistic GPS + accelerometer data for testing the backend.
 * Creates a trip with various driving events (harsh braking, speeding, etc.)
 * 
 * Usage: deno run --allow-net --allow-env generate-test-trip.ts
 */

interface TelemetrySample {
  ts: string;
  lat: number;
  lon: number;
  speed_mps: number;
  heading_deg: number;
  hdop: number;
  accel: { ax: number; ay: number; az: number };
  screen_on: boolean;
}

// Starting point: Philadelphia
const START_LAT = 39.9526;
const START_LON = -75.1652;

/**
 * Generate a realistic trip with various driving events
 */
function generateTestTrip(durationSeconds: number): TelemetrySample[] {
  const samples: TelemetrySample[] = [];
  const startTime = new Date();

  let lat = START_LAT;
  let lon = START_LON;
  let heading = 90; // East
  let speed = 0;

  for (let t = 0; t < durationSeconds; t++) {
    const timestamp = new Date(startTime.getTime() + t * 1000);

    // Speed profile: gradual accel, cruise, decel
    if (t < 10) {
      // Accelerating (0-15 m/s over 10 seconds)
      speed = (t / 10) * 15;
    } else if (t > durationSeconds - 10) {
      // Decelerating
      speed = ((durationSeconds - t) / 10) * 15;
    } else {
      // Cruising with variation
      speed = 13 + Math.sin(t / 20) * 2;
    }

    // Add harsh brake at 30s
    let ax = 0;
    if (t >= 30 && t <= 32) {
      ax = -5.0; // Harsh brake
      speed = Math.max(0, speed - 2);
    }

    // Add harsh accel at 60s
    if (t >= 60 && t <= 62) {
      ax = 4.5; // Harsh accel
      speed = Math.min(20, speed + 2);
    }

    // Add harsh corner at 90s
    let ay = 0;
    if (t >= 90 && t <= 93) {
      ay = 4.5; // Harsh cornering
      heading = heading + 10; // Turn
    }

    // Screen on (distraction) at 120-140s
    const screenOn = t >= 120 && t <= 140;

    // Simulate GPS drift and movement
    const speedKmh = speed * 3.6;
    const metersPerSecond = speed;
    const degreesPerMeter = 1 / 111000; // Approximate

    lat += (metersPerSecond * Math.cos((heading * Math.PI) / 180)) *
      degreesPerSecond;
    lon += (metersPerSecond * Math.sin((heading * Math.PI) / 180)) *
      degreesPerSecond / Math.cos((lat * Math.PI) / 180);

    // Add slight heading variation
    heading += (Math.random() - 0.5) * 2;

    // HDOP varies
    const hdop = 0.6 + Math.random() * 0.4;

    samples.push({
      ts: timestamp.toISOString(),
      lat: lat,
      lon: lon,
      speed_mps: speed,
      heading_deg: heading % 360,
      hdop: hdop,
      accel: {
        ax: ax + (Math.random() - 0.5) * 0.2,
        ay: ay + (Math.random() - 0.5) * 0.2,
        az: 9.8 + (Math.random() - 0.5) * 0.3,
      },
      screen_on: screenOn,
    });

    // Reset accel after event
    if (t === 32 || t === 62 || t === 93) {
      ax = 0;
      ay = 0;
    }
  }

  return samples;
}

/**
 * Send trip data to ingest endpoint
 */
async function sendTripData(
  samples: TelemetrySample[],
  userId: string,
  deviceId: string,
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ||
    'http://localhost:54321';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!anonKey) {
    console.error('Error: SUPABASE_ANON_KEY environment variable not set');
    Deno.exit(1);
  }

  const payload = {
    userId,
    deviceId,
    samples,
  };

  console.log(`Sending ${samples.length} samples to ${supabaseUrl}...`);

  const response = await fetch(
    `${supabaseUrl}/functions/v1/ingest-telemetry`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', response.status, error);
    Deno.exit(1);
  }

  const result = await response.json();
  console.log('✅ Success:', result);
  return result.tripId;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚗 Calybr Test Trip Generator\n');

  // Get user/device IDs from args or use defaults
  const userId = Deno.args[0] || '550e8400-e29b-41d4-a716-446655440000';
  const deviceId = Deno.args[1] || '660e8400-e29b-41d4-a716-446655440000';
  const duration = parseInt(Deno.args[2] || '300', 10); // 5 minutes default

  console.log(`User ID: ${userId}`);
  console.log(`Device ID: ${deviceId}`);
  console.log(`Duration: ${duration}s\n`);

  // Generate trip data
  console.log('Generating test trip data...');
  const samples = generateTestTrip(duration);
  console.log(
    `Generated ${samples.length} samples (${(samples.length / 1024).toFixed(1)} KB)\n`,
  );

  // Send to backend
  const tripId = await sendTripData(samples, userId, deviceId);

  console.log('\n📊 Next steps:');
  console.log(`1. Wait 3+ minutes for automatic finalization`);
  console.log(`2. Or trigger manually: curl -X POST <url>/functions/v1/trips-finalize`);
  console.log(`3. Check results in Supabase Studio: trip_id = ${tripId}`);
  console.log(
    `\nSQL: SELECT * FROM trip_score WHERE trip_id = '${tripId}';\n`,
  );
}

if (import.meta.main) {
  await main();
}

