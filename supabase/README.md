# Calybr Backend - Supabase Implementation

A production-ready backend for Calybr driving safety score platform using Supabase (Postgres + PostGIS + Edge Functions).

## Overview

This backend implements:
- **Telemetry ingestion** from mobile devices (batched GPS + accelerometer data)
- **Trip finalization** with event detection, scoring, and daily EMA updates
- **Deterministic scoring** with versioned weights and explainable breakdowns
- **PostGIS spatial data** for trip routes
- **RLS security** for user data isolation

### Tech Stack
- **Database**: PostgreSQL 15+ with PostGIS extension
- **Edge Functions**: Deno + TypeScript
- **ORM**: Supabase JS Client
- **Testing**: Deno test framework

## Architecture

```
Mobile App → ingest-telemetry Edge Function → Postgres (samples, trips)
                                                    ↓
              Scheduled (every 3 min) ← trips-finalize Edge Function
                                                    ↓
                          (events, features, scores, daily RDS)
```

### Database Schema

- `profile` - User profiles (extends auth.users)
- `device` - Mobile devices
- `trip` - Driving trips (open → finalizing → closed)
- `sample` - Telemetry data points (GPS + accel)
- `event` - Detected driving events (harsh braking, speeding, etc.)
- `trip_features` - Normalized metrics per trip
- `trip_score` - Trip Safety Score (TSS) with breakdown
- `driver_score_daily` - Daily Rolling Driver Score (RDS) via EMA
- `score_weights` - Versioned scoring configuration

### Scoring System

**Trip Safety Score (TSS)**: 300-1000 scale
```
TSS = 1000 - Σ(weight × feature_value)
```

**Features**:
- Harsh acceleration/braking/cornering (per 100km)
- Speeding buckets: +5, +10, +20 mph (minutes)
- Distraction (screen on while driving, minutes)
- Night driving penalty (22:00-05:00)
- Weather penalty (rain, snow, ice)

**Rolling Driver Score (RDS)**: Exponential Moving Average
```
RDS = α × mean(TSS_today) + (1-α) × RDS_yesterday
```

Default α=0.15, cold start at 760.

## Setup

### Prerequisites

1. **Supabase CLI** (v1.27.7+)
   ```bash
   brew install supabase/tap/supabase
   # or
   npm install -g supabase
   ```

2. **Deno** (v1.37+)
   ```bash
   brew install deno
   # or
   curl -fsSL https://deno.land/install.sh | sh
   ```

3. **Supabase Account** (for cloud deployment)
   - Create project at https://supabase.com

### Local Development

1. **Initialize Supabase locally**
   ```bash
   cd supabase
   supabase init
   supabase start
   ```

   This starts:
   - Postgres on `postgresql://postgres:postgres@localhost:54322/postgres`
   - Studio UI on `http://localhost:54323`
   - API on `http://localhost:54321`

2. **Apply migrations**
   ```bash
   supabase db reset
   ```

   This creates all tables, indexes, RLS policies, and functions.

3. **Seed score weights**
   ```bash
   export SUPABASE_URL="http://localhost:54321"
   export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
   
   deno run --allow-net --allow-env seed-weights.ts
   ```

   Get service role key from `supabase status` output.

4. **Run tests**
   ```bash
   cd functions
   deno test --allow-all
   ```

### Environment Variables

Edge Functions require these environment variables:

```bash
# Required
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Optional - Map Provider (choose one)
GOOGLE_MAPS_API_KEY=<key>
MAPBOX_ACCESS_TOKEN=<token>
HERE_API_KEY=<key>

# Optional - Weather Provider (choose one)
OPENWEATHER_API_KEY=<key>
WEATHERAPI_KEY=<key>
```

**Note**: Without map/weather providers, the system uses mock implementations that return synthetic data. See "Provider Setup" section below.

### Deploy to Supabase Cloud

1. **Link to your project**
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

2. **Push migrations**
   ```bash
   supabase db push
   ```

3. **Deploy Edge Functions**
   ```bash
   # Deploy ingest-telemetry
   supabase functions deploy ingest-telemetry
   
   # Deploy trips-finalize
   supabase functions deploy trips-finalize
   ```

4. **Set environment secrets**
   ```bash
   supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
   
   # Optional providers
   supabase secrets set GOOGLE_MAPS_API_KEY=<key>
   supabase secrets set OPENWEATHER_API_KEY=<key>
   ```

5. **Seed weights in production**
   ```bash
   export SUPABASE_URL="https://<project-ref>.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
   
   deno run --allow-net --allow-env seed-weights.ts
   ```

6. **Schedule trips-finalize**
   
   Using Supabase Cron (recommended):
   ```sql
   -- Run every 3 minutes
   SELECT cron.schedule(
     'finalize-trips',
     '*/3 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/trips-finalize',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || '<anon-key>'
       )
     );
     $$
   );
   ```

   Or use external cron (crontab, GitHub Actions, etc.):
   ```bash
   curl -X POST https://<project-ref>.supabase.co/functions/v1/trips-finalize \
     -H "Authorization: Bearer <anon-key>"
   ```

## API Usage

### Ingest Telemetry

**Endpoint**: `POST /functions/v1/ingest-telemetry`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <anon-key>
```

**Payload**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceId": "660e8400-e29b-41d4-a716-446655440000",
  "samples": [
    {
      "ts": "2025-10-19T04:33:12.120Z",
      "lat": 39.9526,
      "lon": -75.1652,
      "speed_mps": 12.4,
      "heading_deg": 108,
      "hdop": 0.7,
      "accel": {
        "ax": -0.2,
        "ay": 0.05,
        "az": 9.65
      },
      "screen_on": true
    }
  ]
}
```

**Response**:
```json
{
  "tripId": "770e8400-e29b-41d4-a716-446655440000",
  "samplesIngested": 30
}
```

### Finalize Trips (scheduled)

**Endpoint**: `POST /functions/v1/trips-finalize`

Automatically called by cron. Returns:
```json
{
  "finalized": 5,
  "errors": []
}
```

### Query Scores (SQL/REST)

**Get user's trips**:
```sql
SELECT 
  t.id,
  t.started_at,
  t.distance_km,
  t.duration_s,
  ts.tss,
  ts.confidence
FROM trip t
LEFT JOIN trip_score ts ON ts.trip_id = t.id
WHERE t.user_id = '<user-id>'
  AND t.status = 'closed'
ORDER BY t.started_at DESC;
```

**Get daily scores**:
```sql
SELECT day, rds, trips_count, total_distance_km
FROM driver_score_daily
WHERE user_id = '<user-id>'
ORDER BY day DESC
LIMIT 30;
```

**Get trip breakdown**:
```sql
SELECT breakdown
FROM trip_score
WHERE trip_id = '<trip-id>';
```

## Provider Setup

### Map Matching Providers

The system needs road network data for:
- Speed limits (for speeding detection)
- Road class (for adaptive thresholds)
- Map matching confidence

**TODO: Choose and configure ONE provider**

#### Option 1: Google Maps Roads API
```bash
# Get API key: https://console.cloud.google.com/google/maps-apis
supabase secrets set GOOGLE_MAPS_API_KEY=<key>
```

Implement in `functions/_shared/providers/map.ts` → `GoogleMapProvider`:
- Use `snapToRoads` endpoint
- Use `speedLimits` endpoint
- Handle rate limits (10 requests/sec)

#### Option 2: Mapbox Map Matching
```bash
# Get token: https://account.mapbox.com/
supabase secrets set MAPBOX_ACCESS_TOKEN=<token>
```

Implement in `functions/_shared/providers/map.ts` → `MapboxMapProvider`:
- Use Map Matching API v5
- Note: Speed limits may not be available in all regions

#### Option 3: HERE Map Matching
```bash
# Get API key: https://developer.here.com/
supabase secrets set HERE_API_KEY=<key>
```

Implement in `functions/_shared/providers/map.ts` → `HEREMapProvider`:
- Use HERE Location Services
- Includes speed limit data

**Current Status**: Using `MockMapProvider` (returns synthetic data)

### Weather Providers

Weather data affects scoring (rain, snow penalties).

**TODO: Choose and configure ONE provider**

#### Option 1: OpenWeatherMap
```bash
# Get API key: https://openweathermap.org/api
supabase secrets set OPENWEATHER_API_KEY=<key>
```

Implement in `functions/_shared/providers/weather.ts` → `OpenWeatherMapProvider`:
- Use One Call API 3.0
- Historical data requires paid plan

#### Option 2: WeatherAPI
```bash
# Get API key: https://www.weatherapi.com/
supabase secrets set WEATHERAPI_KEY=<key>
```

Implement in `functions/_shared/providers/weather.ts` → `WeatherAPIProvider`:
- Use History API
- Free tier: 7 days of history

**Current Status**: Using `MockWeatherProvider` (returns clear weather)

## Testing

### Run Unit Tests
```bash
cd functions
deno test --allow-all
```

Tests cover:
- Event detection logic
- Scoring calculations
- Feature extraction
- EMA updates

### Manual Testing

See `examples.http` for manual API testing with curl/Postman.

### Test Data

To generate synthetic trip data for testing:
```sql
-- Create test user (via Supabase Auth UI or API)
-- Then insert samples via ingest-telemetry endpoint
-- Wait 3+ minutes for auto-finalization
```

## Monitoring

### Edge Function Logs
```bash
supabase functions logs ingest-telemetry
supabase functions logs trips-finalize
```

### Database Queries

**Check open trips**:
```sql
SELECT * FROM get_trips_to_finalize();
```

**Check recent scores**:
```sql
SELECT 
  t.id,
  t.started_at,
  ts.tss,
  ts.confidence,
  tf.harsh_brake_per_100km,
  tf.harsh_accel_per_100km
FROM trip t
JOIN trip_score ts ON ts.trip_id = t.id
JOIN trip_features tf ON tf.trip_id = t.id
ORDER BY t.started_at DESC
LIMIT 10;
```

**Check events**:
```sql
SELECT 
  e.type,
  COUNT(*) as count,
  AVG(e.severity) as avg_severity
FROM event e
JOIN trip t ON t.id = e.trip_id
WHERE t.started_at >= NOW() - INTERVAL '7 days'
GROUP BY e.type;
```

## Troubleshooting

### Trips not finalizing
1. Check if trips exist: `SELECT * FROM get_trips_to_finalize();`
2. Check cron is running: `SELECT * FROM cron.job;`
3. Check function logs: `supabase functions logs trips-finalize`

### Low scores
1. Check trip breakdown: `SELECT breakdown FROM trip_score WHERE trip_id = '...';`
2. Verify events: `SELECT * FROM event WHERE trip_id = '...';`
3. Check quality ratio: `SELECT quality FROM trip WHERE id = '...';`

### Map matching errors
1. Verify provider credentials are set
2. Check provider rate limits
3. Falls back to mock provider on error (no speed limits)

## Performance Considerations

- **Batch ingestion**: Mobile clients should batch samples (10-30s intervals)
- **Indexing**: All foreign keys and frequently queried columns are indexed
- **RLS overhead**: Use service role in Edge Functions to bypass RLS
- **Map matching**: Consider caching speed limits by road segment
- **Weather API**: Cache recent weather data to reduce API calls

## Security

- **RLS enabled** on all tables
- **Service role** used only in Edge Functions (never exposed to client)
- **Client access** via Supabase Auth + anon key + RLS policies
- **CORS** configured in Edge Functions

## Roadmap / TODOs

- [ ] Implement real map provider (Google/Mapbox/HERE)
- [ ] Implement real weather provider (OpenWeather/WeatherAPI)
- [ ] Add timezone-aware night detection (currently uses UTC)
- [ ] Add navigation app detection for distraction filtering
- [ ] Implement trip merging (if user accidentally starts multiple trips)
- [ ] Add geofencing for parking/destination detection
- [ ] Optimize map matching (batch requests, caching)
- [ ] Add score history charts (weekly/monthly trends)
- [ ] Implement leaderboards
- [ ] Add coaching recommendations based on event patterns

## License

Proprietary - Calybr Inc.

## Support

For issues or questions, contact: engineering@calybr.com

