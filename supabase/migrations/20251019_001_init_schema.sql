-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profile table (extends auth.users)
CREATE TABLE profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device table
CREATE TABLE device (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'other')),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, id)
);

CREATE INDEX idx_device_user_id ON device(user_id);

-- Trip status enum
CREATE TYPE trip_status AS ENUM ('open', 'finalizing', 'closed');

-- Trip table with PostGIS LineString
CREATE TABLE trip (
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

CREATE INDEX idx_trip_user_id ON trip(user_id);
CREATE INDEX idx_trip_device_id ON trip(device_id);
CREATE INDEX idx_trip_status ON trip(status);
CREATE INDEX idx_trip_started_at ON trip(started_at);
CREATE INDEX idx_trip_geom ON trip USING GIST(geom);

-- Sample table (telemetry data points)
CREATE TABLE sample (
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

CREATE INDEX idx_sample_trip_id ON sample(trip_id);
CREATE INDEX idx_sample_ts ON sample(ts);

-- Event table (detected driving events)
CREATE TABLE event (
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

CREATE INDEX idx_event_trip_id ON event(trip_id);
CREATE INDEX idx_event_type ON event(type);
CREATE INDEX idx_event_ts_start ON event(ts_start);

-- Trip features (normalized metrics per trip)
CREATE TABLE trip_features (
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
CREATE TYPE score_confidence AS ENUM ('high', 'low');

CREATE TABLE trip_score (
  trip_id UUID PRIMARY KEY REFERENCES trip(id) ON DELETE CASCADE,
  tss INTEGER NOT NULL CHECK (tss >= 300 AND tss <= 1000),
  breakdown JSONB NOT NULL,
  confidence score_confidence NOT NULL DEFAULT 'high',
  weights_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trip_score_tss ON trip_score(tss);
CREATE INDEX idx_trip_score_confidence ON trip_score(confidence);

-- Driver score daily (EMA rolling score)
CREATE TABLE driver_score_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  rds INTEGER NOT NULL CHECK (rds >= 300 AND rds <= 1000),
  trips_count INTEGER DEFAULT 0,
  total_distance_km REAL DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX idx_driver_score_daily_user_id ON driver_score_daily(user_id);
CREATE INDEX idx_driver_score_daily_day ON driver_score_daily(day);

-- Score weights (versioned scoring configuration)
CREATE TABLE score_weights (
  version TEXT PRIMARY KEY,
  weights JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

-- Profile policies
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profile FOR UPDATE
  USING (auth.uid() = user_id);

-- Device policies
ALTER TABLE device ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON device FOR SELECT
  USING (auth.uid() = user_id);

-- Trip policies
ALTER TABLE trip ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trip FOR SELECT
  USING (auth.uid() = user_id);

-- Sample policies (read-only for users)
ALTER TABLE sample ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip events"
  ON event FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip
      WHERE trip.id = event.trip_id
      AND trip.user_id = auth.uid()
    )
  );

-- Trip features policies
ALTER TABLE trip_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip features"
  ON trip_features FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip
      WHERE trip.id = trip_features.trip_id
      AND trip.user_id = auth.uid()
    )
  );

-- Trip score policies
ALTER TABLE trip_score ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip scores"
  ON trip_score FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip
      WHERE trip.id = trip_score.trip_id
      AND trip.user_id = auth.uid()
    )
  );

-- Driver score daily policies
ALTER TABLE driver_score_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily scores"
  ON driver_score_daily FOR SELECT
  USING (auth.uid() = user_id);

-- Score weights policies (public read)
ALTER TABLE score_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view score weights"
  ON score_weights FOR SELECT
  USING (true);

-- RPC Function: get_trips_to_finalize
-- Returns trips with status='open' and no new samples for ≥180 seconds
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

-- Helper function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER profile_updated_at
  BEFORE UPDATE ON profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER device_updated_at
  BEFORE UPDATE ON device
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trip_updated_at
  BEFORE UPDATE ON trip
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER driver_score_daily_updated_at
  BEFORE UPDATE ON driver_score_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();



