-- Calybr Database Schema for Supabase
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  age INTEGER,
  gender TEXT,
  car_make TEXT,
  car_model TEXT,
  car_year INTEGER,
  license_plate TEXT,
  avatar_url TEXT,
  city TEXT,
  country TEXT DEFAULT 'United States',
  member_since TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  distance DECIMAL NOT NULL, -- miles
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  estimated_cost DECIMAL NOT NULL,
  start_address TEXT NOT NULL,
  end_address TEXT NOT NULL,
  route JSONB, -- array of {latitude, longitude}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drive events table
CREATE TABLE IF NOT EXISTS drive_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- hard_brake, speeding, phone_distraction, aggressive_corner, night_driving
  timestamp INTEGER NOT NULL, -- seconds from trip start
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  location JSONB NOT NULL, -- {latitude, longitude}
  description TEXT NOT NULL,
  tip TEXT NOT NULL,
  speed DECIMAL,
  g_force DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver scores table (aggregated metrics)
CREATE TABLE IF NOT EXISTS driver_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  overall_score INTEGER DEFAULT 800 CHECK (overall_score >= 0 AND overall_score <= 1000),
  week_delta INTEGER DEFAULT 0,
  speeding_score INTEGER DEFAULT 800,
  hard_brakes_score INTEGER DEFAULT 800,
  phone_distraction_score INTEGER DEFAULT 800,
  cornering_score INTEGER DEFAULT 800,
  night_driving_score INTEGER DEFAULT 800,
  highway_score INTEGER DEFAULT 800,
  total_trips INTEGER DEFAULT 0,
  driving_streak INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date DESC);
CREATE INDEX IF NOT EXISTS idx_drive_events_trip_id ON drive_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_scores_user_id ON driver_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_scores_overall ON driver_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);

-- City Leaderboard View
CREATE OR REPLACE VIEW leaderboard_city AS
SELECT 
  p.id as user_id,
  CONCAT(p.first_name, ' ', p.last_name) as name,
  ds.overall_score,
  p.city,
  p.car_make,
  p.car_model,
  p.car_year,
  ds.driving_streak,
  ds.total_trips,
  p.member_since,
  ROW_NUMBER() OVER (PARTITION BY p.city ORDER BY ds.overall_score DESC) as rank
FROM profiles p
INNER JOIN driver_scores ds ON p.id = ds.user_id
WHERE p.city IS NOT NULL
ORDER BY p.city, ds.overall_score DESC;

-- Country Leaderboard View
CREATE OR REPLACE VIEW leaderboard_country AS
SELECT 
  p.id as user_id,
  CONCAT(p.first_name, ' ', p.last_name) as name,
  ds.overall_score,
  p.country,
  p.car_make,
  p.car_model,
  p.car_year,
  ds.driving_streak,
  ds.total_trips,
  p.member_since,
  ROW_NUMBER() OVER (PARTITION BY p.country ORDER BY ds.overall_score DESC) as rank
FROM profiles p
INNER JOIN driver_scores ds ON p.id = ds.user_id
WHERE p.country IS NOT NULL
ORDER BY p.country, ds.overall_score DESC;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_scores_updated_at BEFORE UPDATE ON driver_scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create driver_scores entry when profile is created
CREATE OR REPLACE FUNCTION create_driver_scores_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO driver_scores (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create driver_scores
CREATE TRIGGER on_profile_created
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION create_driver_scores_for_new_user();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_scores ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trips policies
CREATE POLICY "Users can view own trips" ON trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id);

-- Drive events policies
CREATE POLICY "Users can view events for own trips" ON drive_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = drive_events.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events for own trips" ON drive_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = drive_events.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Driver scores policies
CREATE POLICY "Users can view all driver scores" ON driver_scores
  FOR SELECT USING (true);

CREATE POLICY "Users can update own driver scores" ON driver_scores
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Success message
SELECT 'Calybr database schema created successfully!' as message;
