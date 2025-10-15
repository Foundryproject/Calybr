import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// Helper to check if Supabase is available and return typed client
const getSupabase = (): SupabaseClient<Database> => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured. Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.');
  }
  return supabase;
};

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface OnboardingData {
  phoneNumber: string;
  age: number;
  gender: string;
  carMake: string;
  carModel: string;
  carYear: number;
  licensePlate: string;
  city?: string;
  country?: string;
}

/**
 * Sign up with email and password
 * This now handles RLS policy errors gracefully
 */
export const signUpWithEmail = async (data: SignUpData) => {
  try {
    const client = getSupabase();
    
    // 1. Create auth user with metadata (Supabase may auto-create profile via trigger)
    const { data: authData, error: authError } = await client.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from sign up');

    // 2. Try to create profile manually (if trigger doesn't exist or RLS blocks it)
    // This may fail due to RLS policy, but we handle it gracefully
    try {
      const { error: profileError } = await client
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
        });

      // Log any errors but don't fail signup
      if (profileError) {
        // Check if it's a duplicate key error (profile already exists from trigger)
        if (profileError.code === '23505' || profileError.message?.includes('duplicate')) {
          console.log('Profile already exists (created by database trigger)');
        } else if (profileError.code === '42501') {
          // RLS policy error - this is expected if policies aren't set up yet
          console.warn('RLS policy blocks manual profile creation. Profile may be created by trigger or needs policy fix.');
        } else {
          console.warn('Profile creation warning:', profileError);
        }
      } else {
        console.log('Profile created successfully');
      }
    } catch (profileError) {
      // Non-critical error - user was created successfully
      console.warn('Could not create profile manually, but user account was created:', profileError);
    }

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const client = getSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
  try {
    const client = getSupabase();
    
    // Use skipBrowserRedirect to get the URL without automatic redirect
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    const client = getSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  try {
    const client = getSupabase();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};

/**
 * Get current user profile
 */
export const getCurrentUserProfile = async () => {
  try {
    const client = getSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
};

/**
 * Complete onboarding - update profile with additional data
 */
export const completeOnboarding = async (userId: string, data: OnboardingData) => {
  try {
    const client = getSupabase();
    const { error } = await client
      .from('profiles')
      .update({
        phone_number: data.phoneNumber,
        age: data.age,
        gender: data.gender,
        car_make: data.carMake,
        car_model: data.carModel,
        car_year: data.carYear,
        license_plate: data.licensePlate,
        city: data.city,
        country: data.country || 'United States',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Complete onboarding error:', error);
    throw error;
  }
};

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = async (userId: string) => {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('car_make, car_model')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return !!(data?.car_make && data?.car_model);
  } catch (error) {
    console.error('Check onboarding error:', error);
    return false;
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  const client = getSupabase();
  return client.auth.onAuthStateChange(callback);
};
