-- ============================================
-- COMBINED MIGRATION - RUN THIS FIRST
-- This combines all three migrations in order
-- ============================================

-- ============================================
-- MIGRATION 1: Create Base Tables
-- ============================================

-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profile table (extends auth.users)
CREATE TABLE IF NOT EXISTS profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device table
CREATE TABLE IF NOT EXISTS device (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'other')),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_device_user_id ON device(user_id);

-- Trip status enum
DO $$ BEGIN
    CREATE TYPE trip_status AS ENUM ('open', 'finalizing', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trip table with PostGIS LineString
CREATE TABLE IF NOT EXISTS trip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES device(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  distance_km REAL,
  duration_s INTEGER,
  night_fraction REAL DEFAULT 0.0,
  weather JSONB DEFAULT '{}'::jsonb,
  road_mix JSONB DEFAULT '{}'::jsonb,
  quality JSONB DEFAULT '{}'::jsonb,
  geom geometry(LineString, 4326),
  status trip_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_user_id ON trip(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_device_id ON trip(device_id);
CREATE INDEX IF NOT EXISTS idx_trip_status ON trip(status);
CREATE INDEX IF NOT EXISTS idx_trip_started_at ON trip(started_at);
CREATE INDEX IF NOT EXISTS idx_trip_geom ON trip USING GIST(geom);

-- Sample table (telemetry data points)
CREATE TABLE IF NOT EXISTS sample (
  trip_id UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  speed_mps REAL NOT NULL,
  heading_deg REAL,
  hdop REAL,
  ax REAL,
  ay REAL,
  az REAL,
  screen_on BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (trip_id, ts)
);

CREATE INDEX IF NOT EXISTS idx_sample_trip_id ON sample(trip_id);
CREATE INDEX IF NOT EXISTS idx_sample_ts ON sample(ts);

-- Event table (detected driving events)
CREATE TABLE IF NOT EXISTS event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
  ts_start TIMESTAMPTZ NOT NULL,
  ts_end TIMESTAMPTZ,
  type TEXT NOT NULL CHECK (type IN (
    'harsh_brake', 'harsh_accel', 'harsh_corner',
    'speeding_5', 'speeding_10', 'speeding_20',
    'distraction'
  )),
  severity REAL CHECK (severity >= 0 AND severity <= 1),
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_trip_id ON event(trip_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON event(type);
CREATE INDEX IF NOT EXISTS idx_event_ts_start ON event(ts_start);

-- Trip features (normalized metrics per trip)
CREATE TABLE IF NOT EXISTS trip_features (
  trip_id UUID PRIMARY KEY REFERENCES trip(id) ON DELETE CASCADE,
  distance_km REAL NOT NULL,
  trip_minutes REAL NOT NULL,
  harsh_brake_per_100km REAL DEFAULT 0.0,
  harsh_accel_per_100km REAL DEFAULT 0.0,
  harsh_corner_per_100km REAL DEFAULT 0.0,
  mins_speeding_5 REAL DEFAULT 0.0,
  mins_speeding_10 REAL DEFAULT 0.0,
  mins_speeding_20 REAL DEFAULT 0.0,
  distraction_mins REAL DEFAULT 0.0,
  night_fraction REAL DEFAULT 0.0,
  weather_penalty_mins REAL DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip score (TSS and breakdown)
DO $$ BEGIN
    CREATE TYPE score_confidence AS ENUM ('high', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS trip_score (
  trip_id UUID PRIMARY KEY REFERENCES trip(id) ON DELETE CASCADE,
  tss INTEGER NOT NULL CHECK (tss >= 300 AND tss <= 1000),
  breakdown JSONB NOT NULL,
  confidence score_confidence NOT NULL DEFAULT 'high',
  weights_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_score_tss ON trip_score(tss);
CREATE INDEX IF NOT EXISTS idx_trip_score_confidence ON trip_score(confidence);

-- Driver score daily (EMA rolling score)
CREATE TABLE IF NOT EXISTS driver_score_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  rds INTEGER NOT NULL CHECK (rds >= 300 AND rds <= 1000),
  trips_count INTEGER DEFAULT 0,
  total_distance_km REAL DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_driver_score_daily_user_id ON driver_score_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_score_daily_day ON driver_score_daily(day);

-- Score weights (versioned scoring configuration)
CREATE TABLE IF NOT EXISTS score_weights (
  version TEXT PRIMARY KEY,
  weights JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MIGRATION 2: Update Profile Schema
-- ============================================

-- Add missing columns to profile table
ALTER TABLE profile ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS car_make TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS car_model TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS car_year INTEGER;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS license_plate TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States';
ALTER TABLE profile ADD COLUMN IF NOT EXISTS member_since TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profile ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create or replace function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profile (user_id, email, full_name, first_name, last_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create profiles view/alias for frontend compatibility (frontend uses 'profiles' plural)
CREATE OR REPLACE VIEW profiles AS
SELECT 
  user_id as id,
  email,
  first_name,
  last_name,
  phone_number,
  age,
  gender,
  car_make,
  car_model,
  car_year,
  license_plate,
  avatar_url,
  city,
  country,
  member_since,
  onboarding_completed,
  created_at,
  updated_at
FROM profile;

-- Create INSTEAD OF triggers for the view to allow INSERT/UPDATE operations
CREATE OR REPLACE FUNCTION profiles_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profile (user_id, email, first_name, last_name, phone_number, age, gender, 
                       car_make, car_model, car_year, license_plate, avatar_url, 
                       city, country, member_since, onboarding_completed, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.first_name, NEW.last_name, NEW.phone_number, NEW.age, 
          NEW.gender, NEW.car_make, NEW.car_model, NEW.car_year, NEW.license_plate, 
          NEW.avatar_url, NEW.city, NEW.country, NEW.member_since, NEW.onboarding_completed,
          COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profiles_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profile SET
    email = NEW.email,
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    phone_number = NEW.phone_number,
    age = NEW.age,
    gender = NEW.gender,
    car_make = NEW.car_make,
    car_model = NEW.car_model,
    car_year = NEW.car_year,
    license_plate = NEW.license_plate,
    avatar_url = NEW.avatar_url,
    city = NEW.city,
    country = NEW.country,
    member_since = NEW.member_since,
    onboarding_completed = NEW.onboarding_completed,
    updated_at = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_insert_trigger ON profiles;
CREATE TRIGGER profiles_insert_trigger
  INSTEAD OF INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_insert();

DROP TRIGGER IF EXISTS profiles_update_trigger ON profiles;
CREATE TRIGGER profiles_update_trigger
  INSTEAD OF UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_update();

-- ============================================
-- MIGRATION 3: Add Trip Frontend Fields
-- ============================================

-- Add coordinate fields for quick access (extracted from geom)
ALTER TABLE trip ADD COLUMN IF NOT EXISTS start_lat DOUBLE PRECISION;
ALTER TABLE trip ADD COLUMN IF NOT EXISTS start_lon DOUBLE PRECISION;
ALTER TABLE trip ADD COLUMN IF NOT EXISTS end_lat DOUBLE PRECISION;
ALTER TABLE trip ADD COLUMN IF NOT EXISTS end_lon DOUBLE PRECISION;

-- Add display fields
ALTER TABLE trip ADD COLUMN IF NOT EXISTS start_address TEXT;
ALTER TABLE trip ADD COLUMN IF NOT EXISTS end_address TEXT;

-- Add route as JSONB for mobile app (simplified format)
ALTER TABLE trip ADD COLUMN IF NOT EXISTS route_json JSONB;

-- Add computed cost field (will be calculated on insert/update)
ALTER TABLE trip ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 2);

-- Add cached score field (synced from trip_score table)
ALTER TABLE trip ADD COLUMN IF NOT EXISTS score INTEGER;

-- Add cached event count
ALTER TABLE trip ADD COLUMN IF NOT EXISTS event_count INTEGER DEFAULT 0;

-- Create index on coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_trip_start_coords ON trip(start_lat, start_lon);
CREATE INDEX IF NOT EXISTS idx_trip_end_coords ON trip(end_lat, end_lon);

-- Function to calculate estimated cost based on distance
CREATE OR REPLACE FUNCTION calculate_trip_cost(distance_km REAL)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND((distance_km * 0.02 * 3.13)::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract start/end coordinates from PostGIS geometry
CREATE OR REPLACE FUNCTION update_trip_coordinates()
RETURNS TRIGGER AS $$
DECLARE
  start_point geometry;
  end_point geometry;
BEGIN
  IF NEW.geom IS NOT NULL THEN
    start_point := ST_PointN(NEW.geom, 1);
    NEW.start_lat := ST_Y(start_point);
    NEW.start_lon := ST_X(start_point);
    
    end_point := ST_PointN(NEW.geom, ST_NPoints(NEW.geom));
    NEW.end_lat := ST_Y(end_point);
    NEW.end_lon := ST_X(end_point);
  END IF;
  
  IF NEW.distance_km IS NOT NULL THEN
    NEW.estimated_cost_usd := calculate_trip_cost(NEW.distance_km);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update coordinates and cost
DROP TRIGGER IF EXISTS trip_coordinates_trigger ON trip;
CREATE TRIGGER trip_coordinates_trigger
  BEFORE INSERT OR UPDATE OF geom, distance_km ON trip
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_coordinates();

-- ============================================
-- HELPER FUNCTIONS & VIEWS
-- ============================================

-- Helper function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS profile_updated_at ON profile;
CREATE TRIGGER profile_updated_at
  BEFORE UPDATE ON profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS device_updated_at ON device;
CREATE TRIGGER device_updated_at
  BEFORE UPDATE ON device
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trip_updated_at ON trip;
CREATE TRIGGER trip_updated_at
  BEFORE UPDATE ON trip
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS driver_score_daily_updated_at ON driver_score_daily;
CREATE TRIGGER driver_score_daily_updated_at
  BEFORE UPDATE ON driver_score_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RPC Function: get_trips_to_finalize
CREATE OR REPLACE FUNCTION get_trips_to_finalize()
RETURNS TABLE (
  trip_id UUID,
  user_id UUID,
  device_id UUID,
  started_at TIMESTAMPTZ,
  last_sample_ts TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS trip_id,
    t.user_id,
    t.device_id,
    t.started_at,
    MAX(s.ts) AS last_sample_ts
  FROM trip t
  LEFT JOIN sample s ON s.trip_id = t.id
  WHERE t.status = 'open'
  GROUP BY t.id, t.user_id, t.device_id, t.started_at
  HAVING MAX(s.ts) IS NOT NULL
    AND MAX(s.ts) < NOW() - INTERVAL '180 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync score from trip_score table to trip table
CREATE OR REPLACE FUNCTION sync_trip_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trip
  SET score = NEW.tss
  WHERE id = NEW.trip_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-sync score
DROP TRIGGER IF EXISTS trip_score_sync_trigger ON trip_score;
CREATE TRIGGER trip_score_sync_trigger
  AFTER INSERT OR UPDATE OF tss ON trip_score
  FOR EACH ROW
  EXECUTE FUNCTION sync_trip_score();

-- Function to update event count when events are added/removed
CREATE OR REPLACE FUNCTION update_trip_event_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE trip
    SET event_count = (
      SELECT COUNT(*) FROM event WHERE trip_id = OLD.trip_id
    )
    WHERE id = OLD.trip_id;
    RETURN OLD;
  ELSE
    UPDATE trip
    SET event_count = (
      SELECT COUNT(*) FROM event WHERE trip_id = NEW.trip_id
    )
    WHERE id = NEW.trip_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update event count
DROP TRIGGER IF EXISTS event_count_trigger ON event;
CREATE TRIGGER event_count_trigger
  AFTER INSERT OR DELETE ON event
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_event_count();

-- Create a simplified view for mobile frontend
CREATE OR REPLACE VIEW trips_mobile AS
SELECT 
  t.id,
  t.user_id,
  t.started_at as date,
  to_char(t.started_at, 'HH24:MI') as start_time,
  to_char(t.ended_at, 'HH24:MI') as end_time,
  ROUND((t.duration_s / 60.0)::numeric, 1) as duration,
  ROUND((t.distance_km * 0.621371)::numeric, 2) as distance,
  COALESCE(t.score, 0) as score,
  ROUND(t.estimated_cost_usd::numeric, 2) as estimated_cost,
  t.start_lat as start_latitude,
  t.start_lon as start_longitude,
  t.end_lat as end_latitude,
  t.end_lon as end_longitude,
  COALESCE(t.start_address, '') as start_address,
  COALESCE(t.end_address, '') as end_address,
  COALESCE(t.route_json, '[]'::jsonb) as route,
  COALESCE(t.event_count, 0) as event_count,
  t.status,
  t.created_at,
  t.updated_at
FROM trip t
WHERE t.status = 'closed'
ORDER BY t.started_at DESC;

-- Create a simplified view for events (mobile frontend format)
CREATE OR REPLACE VIEW drive_events_mobile AS
SELECT 
  e.id,
  e.trip_id,
  e.type,
  EXTRACT(EPOCH FROM (e.ts_start - t.started_at))::integer as timestamp,
  CASE 
    WHEN e.severity >= 0.7 THEN 'high'
    WHEN e.severity >= 0.4 THEN 'medium'
    ELSE 'low'
  END as severity,
  jsonb_build_object(
    'latitude', e.lat,
    'longitude', e.lon
  ) as location,
  'Event detected' as description,
  'Avoid this in future' as tip,
  NULL::numeric as speed,
  NULL::numeric as g_force,
  e.created_at
FROM event e
JOIN trip t ON t.id = e.trip_id
WHERE e.lat IS NOT NULL AND e.lon IS NOT NULL;

-- ============================================
-- RLS POLICIES & PERMISSIONS
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE device ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_score_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_weights ENABLE ROW LEVEL SECURITY;

-- Profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profile;
CREATE POLICY "Users can view own profile"
  ON profile FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profile;
CREATE POLICY "Users can insert own profile"
  ON profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profile;
CREATE POLICY "Users can update own profile"
  ON profile FOR UPDATE
  USING (auth.uid() = user_id);

-- Device policies
DROP POLICY IF EXISTS "Users can view own devices" ON device;
CREATE POLICY "Users can view own devices"
  ON device FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own devices" ON device;
CREATE POLICY "Users can insert own devices"
  ON device FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own devices" ON device;
CREATE POLICY "Users can update own devices"
  ON device FOR UPDATE
  USING (auth.uid() = user_id);

-- Trip policies
DROP POLICY IF EXISTS "Users can view own trips" ON trip;
CREATE POLICY "Users can view own trips"
  ON trip FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trips" ON trip;
CREATE POLICY "Users can insert own trips"
  ON trip FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sample policies
DROP POLICY IF EXISTS "Users can view own trip samples" ON sample;
CREATE POLICY "Users can view own trip samples"
  ON sample FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip
      WHERE trip.id = sample.trip_id
      AND trip.user_id = auth.uid()
    )
  );

-- Event policies
DROP POLICY IF EXISTS "Users can view own trip events" ON event;
CREATE POLICY "Users can view own trip events"
  ON event FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip
      WHERE trip.id = event.trip_id
      AND trip.user_id = auth.uid()
    )
  );

-- Score weights policies (public read)
DROP POLICY IF EXISTS "Anyone can view score weights" ON score_weights;
CREATE POLICY "Anyone can view score weights"
  ON score_weights FOR SELECT
  USING (true);

-- Grant permissions on views
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO anon;
GRANT SELECT ON trips_mobile TO authenticated;
GRANT SELECT ON trips_mobile TO anon;
GRANT SELECT ON drive_events_mobile TO authenticated;
GRANT SELECT ON drive_events_mobile TO anon;

-- Enable security invoker for views (inherits RLS from underlying tables)
ALTER VIEW profiles SET (security_invoker = on);
ALTER VIEW trips_mobile SET (security_invoker = on);
ALTER VIEW drive_events_mobile SET (security_invoker = on);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ All migrations applied successfully!';
  RAISE NOTICE '✅ Tables created: profile, device, trip, event, sample, trip_score';
  RAISE NOTICE '✅ Trip fields added: coordinates, cost, score, event_count';
  RAISE NOTICE '✅ Views created: profiles, trips_mobile, drive_events_mobile';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Database is ready for use!';
END $$;

