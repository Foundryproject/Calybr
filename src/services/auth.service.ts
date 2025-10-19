import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const getSupabase = (): SupabaseClient<Database> => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env');
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

export const signUpWithEmail = async (data: SignUpData) => {
  const client = getSupabase();
  
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

  try {
    const { error: profileError } = await client
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
      });

    if (profileError && !['23505', '42501'].some(code => profileError.code === code || profileError.message?.includes('duplicate'))) {
      console.warn('Profile creation warning:', profileError);
    }
  } catch (profileError) {
    console.warn('Could not create profile manually:', profileError);
  }

  return { user: authData.user, session: authData.session };
};

export const signInWithEmail = async (email: string, password: string) => {
  const client = getSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  const client = getSupabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { skipBrowserRedirect: true },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
};

export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await getSupabase().auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};

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

export const completeOnboarding = async (userId: string, data: OnboardingData) => {
  const { error } = await getSupabase()
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
};

export const hasCompletedOnboarding = async (userId: string) => {
  try {
    const { data, error } = await getSupabase()
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

export const onAuthStateChange = (callback: (event: string, session: any) => void) =>
  getSupabase().auth.onAuthStateChange(callback);
