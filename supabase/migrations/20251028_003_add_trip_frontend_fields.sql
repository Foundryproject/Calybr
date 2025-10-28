-- Add frontend-friendly fields to trip table
-- This allows the mobile app to easily access commonly needed data

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
-- Formula: distance_km * 0.02 * 3.13 (as per user's request)
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
  -- Only update if geom exists and has been modified
  IF NEW.geom IS NOT NULL THEN
    -- Extract start point (first point in LineString)
    start_point := ST_PointN(NEW.geom, 1);
    NEW.start_lat := ST_Y(start_point);
    NEW.start_lon := ST_X(start_point);
    
    -- Extract end point (last point in LineString)
    end_point := ST_PointN(NEW.geom, ST_NPoints(NEW.geom));
    NEW.end_lat := ST_Y(end_point);
    NEW.end_lon := ST_X(end_point);
  END IF;
  
  -- Calculate estimated cost if distance exists
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

-- Function to sync score from trip_score table to trip table
CREATE OR REPLACE FUNCTION sync_trip_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the score in trip table when trip_score is inserted/updated
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
  -- Update event count in trip table
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
-- This combines data from trip, trip_score, and event tables
CREATE OR REPLACE VIEW trips_mobile AS
SELECT 
  t.id,
  t.user_id,
  t.started_at as date,
  to_char(t.started_at, 'HH24:MI') as start_time,
  to_char(t.ended_at, 'HH24:MI') as end_time,
  ROUND((t.duration_s / 60.0)::numeric, 1) as duration, -- minutes
  ROUND((t.distance_km * 0.621371)::numeric, 2) as distance, -- convert to miles
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

-- Grant permissions on the view
GRANT SELECT ON trips_mobile TO authenticated;
GRANT SELECT ON trips_mobile TO anon;

-- Create RLS policy for the view
ALTER VIEW trips_mobile SET (security_invoker = on);

-- Create a simplified view for events (mobile frontend format)
CREATE OR REPLACE VIEW drive_events_mobile AS
SELECT 
  e.id,
  e.trip_id,
  e.type,
  EXTRACT(EPOCH FROM (e.ts_start - t.started_at))::integer as timestamp, -- seconds from trip start
  CASE 
    WHEN e.severity >= 0.7 THEN 'high'
    WHEN e.severity >= 0.4 THEN 'medium'
    ELSE 'low'
  END as severity,
  jsonb_build_object(
    'latitude', e.lat,
    'longitude', e.lon
  ) as location,
  'Event detected' as description, -- Can be customized based on type
  'Avoid this in future' as tip, -- Can be customized based on type
  NULL::numeric as speed, -- Can be populated from sample data if needed
  NULL::numeric as g_force, -- Can be populated if available
  e.created_at
FROM event e
JOIN trip t ON t.id = e.trip_id
WHERE e.lat IS NOT NULL AND e.lon IS NOT NULL;

-- Grant permissions
GRANT SELECT ON drive_events_mobile TO authenticated;
GRANT SELECT ON drive_events_mobile TO anon;

-- Create RLS policy for the view
ALTER VIEW drive_events_mobile SET (security_invoker = on);

-- Backfill existing trips with coordinates and costs
UPDATE trip t
SET 
  start_lat = ST_Y(ST_PointN(t.geom, 1)),
  start_lon = ST_X(ST_PointN(t.geom, 1)),
  end_lat = ST_Y(ST_PointN(t.geom, ST_NPoints(t.geom))),
  end_lon = ST_X(ST_PointN(t.geom, ST_NPoints(t.geom))),
  estimated_cost_usd = calculate_trip_cost(t.distance_km),
  score = (SELECT tss FROM trip_score WHERE trip_id = t.id),
  event_count = (SELECT COUNT(*) FROM event WHERE trip_id = t.id)
WHERE t.geom IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN trip.start_lat IS 'Starting latitude (extracted from geom)';
COMMENT ON COLUMN trip.start_lon IS 'Starting longitude (extracted from geom)';
COMMENT ON COLUMN trip.end_lat IS 'Ending latitude (extracted from geom)';
COMMENT ON COLUMN trip.end_lon IS 'Ending longitude (extracted from geom)';
COMMENT ON COLUMN trip.estimated_cost_usd IS 'Estimated cost in USD (distance_km * 0.02 * 3.13)';
COMMENT ON COLUMN trip.score IS 'Cached trip score from trip_score.tss';
COMMENT ON COLUMN trip.event_count IS 'Number of driving events in this trip';
COMMENT ON VIEW trips_mobile IS 'Simplified view for mobile app consumption';
COMMENT ON VIEW drive_events_mobile IS 'Simplified events view for mobile app';

