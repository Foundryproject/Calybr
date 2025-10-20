-- Update profile table to match frontend expectations
-- Add all necessary columns for user profiles and onboarding

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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies for profile table to allow insertion during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON profile;
CREATE POLICY "Users can insert own profile"
  ON profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profile;
CREATE POLICY "Users can view own profile"
  ON profile FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profile;
CREATE POLICY "Users can update own profile"
  ON profile FOR UPDATE
  USING (auth.uid() = user_id);

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

-- Grant permissions on the view
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO anon;

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
          COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()));
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

-- Enable RLS on the view (inherits from underlying table)
ALTER VIEW profiles SET (security_invoker = on);

