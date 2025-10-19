# Calybr Backend - Project Structure

Complete file structure and module organization.

```
supabase/
├── README.md                           # Main documentation
├── DEPLOYMENT.md                       # Deployment guide
├── PROJECT_STRUCTURE.md                # This file
├── config.toml                         # Supabase local config
├── seed-weights.ts                     # Script to seed score_weights table
├── examples.http                       # HTTP request examples (REST Client)
├── Calybr-Backend.postman_collection.json  # Postman API collection
│
├── migrations/
│   └── 20251019_001_init_schema.sql   # Initial database schema
│       ├── PostGIS extension
│       ├── Tables: profile, device, trip, sample, event,
│       │          trip_features, trip_score, driver_score_daily,
│       │          score_weights
│       ├── Indexes (foreign keys, GIST spatial)
│       ├── RLS policies (user data isolation)
│       └── RPC function: get_trips_to_finalize()
│
└── functions/
    ├── deno.json                       # Deno config & import map
    │
    ├── _shared/                        # Shared library modules
    │   ├── types.ts                    # TypeScript type definitions
    │   │   ├── IngestPayload, TelemetrySample
    │   │   ├── ProcessedSample, DetectedEvent
    │   │   ├── TripFeatures, TripContext
    │   │   ├── ScoreWeights, ScoreBreakdown, TripScore
    │   │   ├── DriverScoreDaily
    │   │   └── QualityGates
    │   │
    │   ├── signal.ts                   # Signal processing
    │   │   ├── lowPassFilter()         # Smooth acceleration data
    │   │   ├── projectToRoadFrame()    # Device → road coordinates
    │   │   ├── preprocessSamples()     # Apply smoothing & projection
    │   │   └── Unit conversion helpers
    │   │
    │   ├── geo.ts                      # Geometric utilities
    │   │   ├── haversineDistance()     # GPS distance calculation
    │   │   ├── calculateTripDistance() # Total trip distance
    │   │   ├── buildLineString()       # PostGIS WKT geometry
    │   │   ├── calculateBearing()      # Heading between points
    │   │   ├── estimateCurvature()     # Centripetal acceleration
    │   │   └── calculateNightFraction()
    │   │
    │   ├── segment.ts                  # Trip segmentation
    │   │   ├── excludeTripEnds()       # Remove first/last 200m
    │   │   ├── groupConsecutiveSamples()
    │   │   ├── filterSegmentsByDuration()
    │   │   ├── debounceSegments()      # Merge close events
    │   │   └── meetsMinimumRequirements()
    │   │
    │   ├── events.ts                   # Event detection
    │   │   ├── detectHarshBrakes()     # < -3.5 m/s² for >300ms
    │   │   ├── detectHarshAccels()     # > +3.0 m/s² for >300ms
    │   │   ├── detectHarshCorners()    # > 0.35g lateral (0.40g motorway)
    │   │   ├── detectSpeeding()        # +5, +10, +20 mph buckets
    │   │   ├── detectDistraction()     # screen_on while driving
    │   │   └── detectAllEvents()       # Master function
    │   │
    │   ├── features.ts                 # Feature extraction
    │   │   ├── countEventsByType()
    │   │   ├── sumEventDurationMinutes()
    │   │   ├── normalizeCountPer100Km()
    │   │   ├── extractTripFeatures()   # Complete feature vector
    │   │   ├── calculateRoadMix()      # Road class distribution
    │   │   ├── calculateQualityMetrics()
    │   │   └── calculateWeatherPenalty()
    │   │
    │   ├── score.ts                    # Scoring engine
    │   │   ├── calculateTSS()          # Trip Safety Score (300-1000)
    │   │   ├── scoreTripWithBreakdown() # TSS + detailed breakdown
    │   │   ├── updateDailyRDS()        # Exponential Moving Average
    │   │   ├── updateRDSWithSingleTrip()
    │   │   └── determineConfidence()   # high/low based on quality
    │   │
    │   ├── providers/
    │   │   ├── map.ts                  # Map matching provider interface
    │   │   │   ├── MapProvider interface
    │   │   │   ├── MockMapProvider (active)
    │   │   │   ├── GoogleMapProvider (TODO)
    │   │   │   ├── MapboxMapProvider (TODO)
    │   │   │   ├── HEREMapProvider (TODO)
    │   │   │   ├── createMapProvider() # Factory
    │   │   │   └── applyMapMatchingToSamples()
    │   │   │
    │   │   └── weather.ts              # Weather provider interface
    │   │       ├── WeatherProvider interface
    │   │       ├── MockWeatherProvider (active)
    │   │       ├── OpenWeatherMapProvider (TODO)
    │   │       ├── WeatherAPIProvider (TODO)
    │   │       ├── createWeatherProvider() # Factory
    │   │       └── calculateWeatherPenalty()
    │   │
    │   ├── events_test.ts              # Unit tests for event detection
    │   ├── score_test.ts               # Unit tests for scoring
    │   └── features_test.ts            # Unit tests for feature extraction
    │
    ├── ingest-telemetry/
    │   └── index.ts                    # Edge Function: Ingest telemetry
    │       ├── POST /functions/v1/ingest-telemetry
    │       ├── Validates payload
    │       ├── Upserts device
    │       ├── Finds or creates open trip
    │       ├── Upserts samples (idempotent)
    │       └── Returns tripId + count
    │
    └── trips-finalize/
        └── index.ts                    # Edge Function: Finalize trips
            ├── POST /functions/v1/trips-finalize
            ├── Scheduled every 3 minutes
            ├── Gets trips from get_trips_to_finalize()
            ├── For each trip:
            │   ├── Mark as 'finalizing'
            │   ├── Load samples
            │   ├── Preprocess (smooth, project to road frame)
            │   ├── Map matching (speed limits, road class)
            │   ├── Calculate context (night, weather, quality)
            │   ├── Detect events (harsh driving, speeding, distraction)
            │   ├── Extract features (normalized counts/durations)
            │   ├── Calculate TSS with breakdown
            │   ├── Update trip → 'closed'
            │   ├── Insert events
            │   ├── Upsert trip_features
            │   ├── Upsert trip_score
            │   └── Update driver_score_daily (EMA)
            └── Returns {finalized: count, errors: []}
```

## Module Dependencies

```
ingest-telemetry/
└── types.ts

trips-finalize/
├── types.ts
├── signal.ts → types
├── geo.ts → types
├── segment.ts → types, geo
├── events.ts → types, signal, segment
├── features.ts → types, events
├── score.ts → types, features
├── providers/map.ts → types
└── providers/weather.ts → types
```

## Data Flow

```
Mobile App
    ↓ (batch samples every 10-30s)
ingest-telemetry
    ↓ (INSERT samples, upsert device, find/create trip)
Database (trip: status='open', sample[])
    ↓ (wait 180s idle)
get_trips_to_finalize() RPC
    ↓ (returns trip_id list)
trips-finalize (scheduled every 3 min)
    ↓
[Load samples] → [Preprocess] → [Map Match] → [Context]
    ↓
[Event Detection] → [Feature Extraction] → [Scoring]
    ↓
Database (trip: status='closed', events, features, score, daily_score)
    ↓
REST API / Mobile App
```

## Key Algorithms

### 1. Signal Processing
- **Low-pass filter**: 3-sample moving average for acceleration
- **Road frame projection**: Rotate device accel by heading angle
- **Quality gates**: HDOP < 1.5, map_match_conf > 0.6, speed > 10 km/h

### 2. Event Detection
- **Harsh brake**: a_long < -3.5 m/s² for ≥300ms, severity = excess/3
- **Harsh accel**: a_long > +3.0 m/s² for ≥300ms
- **Harsh corner**: |a_lat| > 0.35g for ≥400ms (0.40g on motorways)
- **Speeding**: continuous ≥10s at +5, +10, +20 mph over limit
- **Distraction**: screen_on while speed ≥ 10 km/h
- **Debouncing**: merge events within 500ms
- **Exclusion zones**: ignore first/last 200m of trips

### 3. Feature Normalization
- **Harsh events**: counts per 100km
- **Speeding/distraction**: duration in minutes
- **Night**: fraction of trip 22:00-05:00 local
- **Weather**: penalty minutes (rain +0.5×, snow +1×)

### 4. Scoring Formula
```
TSS = 1000 - Σ(weight_i × feature_i)

Where weights (v2025-10-19-a):
  w_a = 10   (harsh_accel per 100km)
  w_b = 14   (harsh_brake per 100km)
  w_c = 12   (harsh_corner per 100km)
  w_s1 = 2   (speeding +5 mph, minutes)
  w_s2 = 6   (speeding +10 mph, minutes)
  w_s3 = 12  (speeding +20 mph, minutes)
  w_d = 15   (distraction, minutes)
  w_n = 2    (night_fraction × trip_minutes)
  w_w = 4    (weather_penalty_mins)

Confidence: high if quality_ratio ≥ 0.7, else low (halves weights)
Clamped: [300, 1000]
```

### 5. Exponential Moving Average
```
RDS_today = α × mean(TSS_today) + (1-α) × RDS_yesterday

Where:
  α = 0.15 (smoothing factor)
  mean(TSS_today) = distance-weighted average of trips
  RDS_cold_start = 760 (neutral-good)
```

## Testing Strategy

### Unit Tests (Deno)
- `events_test.ts`: Synthetic acceleration patterns
- `score_test.ts`: Fixed features → expected TSS
- `features_test.ts`: Event counts → normalized features

### Integration Tests
1. Send sample batch → verify trip created
2. Wait 3 min → trigger finalization
3. Verify trip closed with score
4. Check daily RDS updated

### Test Data
- Mock providers return synthetic values
- Can inject real GPS traces for end-to-end testing
- Use `examples.http` for manual API testing

## Performance Notes

- **Batch ingestion**: 10-30 samples per request (mobile)
- **Finalization**: ~1-2s per trip (depends on sample count)
- **Map matching**: Can batch 100 points per request (provider-dependent)
- **Indexes**: All FK indexed, GIST on trip.geom
- **RLS**: Bypassed in Edge Functions (service role)

## Security Model

- **Client → API**: Supabase Auth + RLS (anon key)
- **Edge Functions → DB**: Service role (bypasses RLS)
- **Providers**: API keys stored in Supabase secrets
- **CORS**: Enabled in Edge Functions

## Extensibility

### Adding New Event Types
1. Add to `EventType` in `types.ts`
2. Implement detector in `events.ts`
3. Add feature in `features.ts`
4. Add weight in `score_weights` table
5. Update breakdown logic in `score.ts`

### Changing Weights
1. Insert new version in `score_weights` table
2. Edge Function auto-loads latest version
3. Old scores preserve their weights_version

### Adding Providers
1. Implement interface in `providers/map.ts` or `providers/weather.ts`
2. Add factory logic in `createProvider()`
3. Set env var for API key
4. System automatically uses real provider

## Roadmap

- [ ] Real map provider integration
- [ ] Real weather provider integration
- [ ] Timezone-aware night detection
- [ ] Navigation app filtering for distraction
- [ ] Trip merging logic
- [ ] Geofencing (parking detection)
- [ ] Coaching recommendations
- [ ] Leaderboards
- [ ] Score history analytics

