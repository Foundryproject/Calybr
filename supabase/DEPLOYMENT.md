# Calybr Backend - Deployment Checklist

Quick reference for deploying the Calybr driving safety backend to production.

## Pre-Deployment Checklist

### 1. Database Setup
- [ ] Run migrations: `supabase db push`
- [ ] Verify PostGIS extension enabled
- [ ] Check all tables created with proper indexes
- [ ] Verify RLS policies are active
- [ ] Test RPC function: `get_trips_to_finalize()`

### 2. Score Weights Configuration
- [ ] Seed initial weights: `deno run --allow-net --allow-env seed-weights.ts`
- [ ] Verify weights inserted: Query `score_weights` table
- [ ] Confirm version: `2025-10-19-a`

### 3. Edge Functions
- [ ] Deploy `ingest-telemetry`: `supabase functions deploy ingest-telemetry`
- [ ] Deploy `trips-finalize`: `supabase functions deploy trips-finalize`
- [ ] Set environment secrets (see below)
- [ ] Test both functions with example payloads

### 4. Environment Variables

**Required**:
```bash
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Optional Map Provider** (choose ONE):
```bash
# Google Maps
supabase secrets set GOOGLE_MAPS_API_KEY=<key>

# Mapbox
supabase secrets set MAPBOX_ACCESS_TOKEN=<token>

# HERE Maps
supabase secrets set HERE_API_KEY=<key>
```

**Optional Weather Provider** (choose ONE):
```bash
# OpenWeatherMap
supabase secrets set OPENWEATHER_API_KEY=<key>

# WeatherAPI
supabase secrets set WEATHERAPI_KEY=<key>
```

### 5. Scheduling

**Option A: Supabase Cron (Recommended)**
```sql
SELECT cron.schedule(
  'finalize-trips',
  '*/3 * * * *',  -- Every 3 minutes
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/trips-finalize',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <anon-key>'
    )
  );
  $$
);
```

**Option B: External Cron**
```bash
*/3 * * * * curl -X POST https://<project-ref>.supabase.co/functions/v1/trips-finalize -H "Authorization: Bearer <anon-key>"
```

**Option C: GitHub Actions** (see `.github/workflows/finalize-trips.yml` example below)

## Post-Deployment Verification

### 1. Test Ingestion
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/ingest-telemetry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -d @supabase/examples/test-payload.json
```

Expected response:
```json
{
  "tripId": "uuid",
  "samplesIngested": 10
}
```

### 2. Verify Database
```sql
-- Check trip created
SELECT * FROM trip WHERE status = 'open' ORDER BY created_at DESC LIMIT 1;

-- Check samples inserted
SELECT COUNT(*) FROM sample WHERE trip_id = '<trip-id>';
```

### 3. Test Finalization
Wait 3+ minutes or trigger manually:
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/trips-finalize \
  -H "Authorization: Bearer <anon-key>"
```

Expected response:
```json
{
  "finalized": 1,
  "errors": []
}
```

### 4. Verify Scoring
```sql
-- Check trip closed
SELECT status, distance_km, duration_s FROM trip WHERE id = '<trip-id>';

-- Check score calculated
SELECT tss, confidence, breakdown FROM trip_score WHERE trip_id = '<trip-id>';

-- Check features extracted
SELECT * FROM trip_features WHERE trip_id = '<trip-id>';

-- Check events detected
SELECT type, COUNT(*) FROM event WHERE trip_id = '<trip-id>' GROUP BY type;

-- Check daily score updated
SELECT * FROM driver_score_daily WHERE user_id = '<user-id>' ORDER BY day DESC LIMIT 1;
```

## Monitoring

### Edge Function Logs
```bash
supabase functions logs ingest-telemetry --tail
supabase functions logs trips-finalize --tail
```

### Database Metrics
```sql
-- Open trips waiting to finalize
SELECT COUNT(*) FROM get_trips_to_finalize();

-- Recent trips by status
SELECT status, COUNT(*) FROM trip 
WHERE created_at >= NOW() - INTERVAL '1 day'
GROUP BY status;

-- Average score last 24 hours
SELECT AVG(tss) as avg_score, confidence
FROM trip_score ts
JOIN trip t ON t.id = ts.trip_id
WHERE t.started_at >= NOW() - INTERVAL '1 day'
GROUP BY confidence;

-- Event distribution
SELECT type, COUNT(*) as count
FROM event e
JOIN trip t ON t.id = e.trip_id
WHERE t.started_at >= NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY count DESC;
```

### Performance Metrics
```sql
-- Avg finalization time (if tracking enabled)
-- Trips per day
SELECT DATE(started_at) as day, COUNT(*) as trips
FROM trip
WHERE status = 'closed'
  AND started_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY day DESC;
```

## Rollback Plan

### Revert Edge Function
```bash
# Deploy previous version
git checkout <previous-commit>
supabase functions deploy <function-name>
```

### Revert Migration
```bash
supabase db reset  # WARNING: Destructive in production!
# Or manually: DROP TABLE ..., CREATE TABLE ...
```

### Update Weights Version
```sql
-- Insert new weights version (doesn't affect existing scores)
INSERT INTO score_weights (version, weights)
VALUES ('2025-10-19-b', '{ ... }');
```

## Production Best Practices

1. **Staging Environment**: Test all changes in staging first
2. **Monitoring**: Set up alerts for function errors and failed finalizations
3. **Backups**: Enable point-in-time recovery (PITR) in Supabase dashboard
4. **Rate Limiting**: Consider rate limits on ingest-telemetry endpoint
5. **Costs**: Monitor database size, function invocations, and API usage
6. **Security**: Rotate service role key periodically
7. **Docs**: Keep API documentation in sync with changes

## GitHub Actions Example

`.github/workflows/finalize-trips.yml`:
```yaml
name: Finalize Trips (Cron)

on:
  schedule:
    - cron: '*/3 * * * *'  # Every 3 minutes

jobs:
  finalize:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger trips-finalize
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/trips-finalize \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

## Troubleshooting

### Trips not finalizing
1. Check cron is running: `SELECT * FROM cron.job;`
2. Check function logs: `supabase functions logs trips-finalize`
3. Verify trips exist: `SELECT * FROM get_trips_to_finalize();`
4. Check service role key is set correctly

### Ingestion errors
1. Verify payload format matches schema
2. Check user_id exists in auth.users
3. Verify CORS headers if calling from browser
4. Check function logs for detailed errors

### Low/unexpected scores
1. Check trip breakdown: `SELECT breakdown FROM trip_score WHERE trip_id = '...';`
2. Verify events detected: `SELECT * FROM event WHERE trip_id = '...';`
3. Check quality ratio: `SELECT quality FROM trip WHERE id = '...';`
4. Confirm weights version is correct

### Performance issues
1. Check indexes: `\d+ trip` (in psql)
2. Analyze slow queries: `EXPLAIN ANALYZE ...`
3. Consider partitioning large tables (sample, event)
4. Optimize map matching requests (batching, caching)

## Support Contacts

- **Engineering**: engineering@calybr.com
- **DevOps**: devops@calybr.com
- **Supabase Support**: https://supabase.com/dashboard/support

## Changelog

- **2025-10-19**: Initial deployment
  - Schema v1 with PostGIS
  - Weights v2025-10-19-a
  - Mock map/weather providers

