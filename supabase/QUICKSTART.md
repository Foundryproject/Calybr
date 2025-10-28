# Calybr Backend - Quick Start Guide

Get the backend running locally in 5 minutes.

## Prerequisites

Install these tools:

```bash
# Supabase CLI
brew install supabase/tap/supabase

# Deno (for tests & seed script)
brew install deno

# Docker Desktop (required for Supabase local)
# Download from: https://www.docker.com/products/docker-desktop
```

## Step 1: Start Supabase

```bash
cd supabase
supabase start
```

This starts local Postgres, Studio, and APIs. Takes ~2 minutes first time.

**Output**:
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
        anon key: eyJhbGc...
service_role key: eyJhbGc...
```

**Save these keys!** You'll need them.

## Step 2: Apply Migrations

```bash
supabase db reset
```

This creates all tables, indexes, RLS policies, and functions.

**Verify** in Studio (http://localhost:54323):
- Check "Table Editor" → see 10+ tables
- Check "Database" → "Extensions" → PostGIS enabled

## Step 3: Seed Score Weights

```bash
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_SERVICE_ROLE_KEY="<paste-service-role-key>"

deno run --allow-net --allow-env seed-weights.ts
```

**Expected output**:
```
✅ Successfully seeded score weights
```

## Step 4: Test Ingestion

Create a test payload file:

```bash
cat > test-payload.json <<EOF
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceId": "660e8400-e29b-41d4-a716-446655440000",
  "samples": [
    {
      "ts": "2025-10-19T14:30:00.000Z",
      "lat": 39.9526,
      "lon": -75.1652,
      "speed_mps": 12.4,
      "heading_deg": 108,
      "hdop": 0.7,
      "accel": {"ax": -0.2, "ay": 0.05, "az": 9.65},
      "screen_on": false
    }
  ]
}
EOF
```

**Note**: First create a user in Supabase Auth (Studio → Authentication → Add User) with the UUID `550e8400-e29b-41d4-a716-446655440000`, or use your own user ID.

Send the payload:

```bash
curl -X POST http://localhost:54321/functions/v1/ingest-telemetry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <paste-anon-key>" \
  -d @test-payload.json
```

**Expected response**:
```json
{
  "tripId": "770e8400-e29b-41d4-a716-446655440000",
  "samplesIngested": 1
}
```

## Step 5: Wait & Finalize

Wait 3+ minutes (or trigger manually):

```bash
curl -X POST http://localhost:54321/functions/v1/trips-finalize \
  -H "Authorization: Bearer <paste-anon-key>"
```

**Expected response**:
```json
{
  "finalized": 1,
  "errors": []
}
```

## Step 6: Check Results

**In Studio (http://localhost:54323)**:

1. **Table Editor** → `trip`:
   - Status should be `closed`
   - See `distance_km`, `duration_s`, etc.

2. **Table Editor** → `trip_score`:
   - See TSS (300-1000)
   - Check `breakdown` JSON

3. **Table Editor** → `event`:
   - See detected events (if any)

4. **Table Editor** → `driver_score_daily`:
   - See daily RDS score

**Or query via SQL** (Studio → SQL Editor):

```sql
SELECT 
  t.id,
  t.distance_km,
  t.duration_s,
  ts.tss,
  ts.confidence,
  jsonb_pretty(ts.breakdown) as breakdown
FROM trip t
LEFT JOIN trip_score ts ON ts.trip_id = t.id
ORDER BY t.started_at DESC
LIMIT 1;
```

## Step 7: Run Tests

```bash
cd functions
deno test --allow-all
```

**Expected output**:
```
running 20 tests...
test events_test.ts ... ok
test score_test.ts ... ok
test features_test.ts ... ok
✅ All tests passed
```

## Next Steps

### Generate More Test Data

Send more samples to create realistic trips:

```bash
# Use Postman collection
# Import: supabase/Calybr-Backend.postman_collection.json

# Or use examples.http
# Open in VS Code with REST Client extension
```

### Setup Scheduled Finalization

Add to crontab (every 3 minutes):

```bash
*/3 * * * * curl -X POST http://localhost:54321/functions/v1/trips-finalize -H "Authorization: Bearer <anon-key>"
```

Or use Supabase cron (see DEPLOYMENT.md).

### Deploy to Production

See **DEPLOYMENT.md** for full production checklist.

## Troubleshooting

### "Cannot connect to Docker"
- Start Docker Desktop
- Run `docker ps` to verify

### "Migrations failed"
- Check logs: `supabase logs`
- Reset: `supabase db reset --force`

### "Function not found"
- Functions auto-deployed with `supabase start`
- Manual deploy: `supabase functions deploy <name>`

### "No trips to finalize"
- Check: `SELECT * FROM get_trips_to_finalize();`
- Verify 3+ minutes since last sample
- Check trip status: `SELECT status FROM trip;`

### "Events not detected"
- Short trips may not meet minimum requirements (2km, 5min)
- Mock map provider doesn't provide real speed limits
- Check quality ratio in `trip.quality`

## Resources

- **Full Documentation**: `README.md`
- **API Examples**: `examples.http`
- **Project Structure**: `PROJECT_STRUCTURE.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Supabase Docs**: https://supabase.com/docs

## Support

For issues: engineering@calybr.com

---

**You're all set!** 🚀 

The backend is now:
- ✅ Ingesting telemetry
- ✅ Detecting events
- ✅ Calculating scores
- ✅ Updating daily RDS

Start sending real trip data from your mobile app!

