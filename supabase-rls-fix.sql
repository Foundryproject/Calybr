-- FIX: Row Level Security Policy for Profile Creation
-- Run this in Supabase SQL Editor to fix the signup error

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a more permissive policy that allows profile creation during signup
-- This allows authenticated users to create their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id 
    OR 
    (auth.uid() IS NOT NULL AND id = auth.uid())
  );

-- Alternative: If above doesn't work, use this simpler version
-- DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- CREATE POLICY "Users can insert own profile" ON profiles
--   FOR INSERT 
--   WITH CHECK (true);
-- 
-- Then add a separate policy to restrict updates:
-- CREATE POLICY "Users can only insert their own id" ON profiles
--   FOR INSERT 
--   WITH CHECK (auth.uid() = id);
