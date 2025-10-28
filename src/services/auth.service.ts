import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

// Helper to check if Supabase is available and return typed client
const getSupabase = (): SupabaseClient<Database> => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error(
      "Supabase is not configured. Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.",
    );
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
    if (!authData.user) throw new Error("No user returned from sign up");

    // 2. Try to create profile manually (if trigger doesn't exist or RLS blocks it)
    // This may fail due to RLS policy, but we handle it gracefully
    try {
      const { error: profileError } = await client.from("profiles").insert({
        id: authData.user.id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
      });

      // Log any errors but don't fail signup
      if (profileError) {
        // Check if it's a duplicate key error (profile already exists from trigger)
        if (profileError.code === "23505" || profileError.message?.includes("duplicate")) {
          console.log("Profile already exists (created by database trigger)");
        } else if (profileError.code === "42501") {
          // RLS policy error - this is expected if policies aren't set up yet
          console.warn(
            "RLS policy blocks manual profile creation. Profile may be created by trigger or needs policy fix.",
          );
        } else {
          console.warn("Profile creation warning:", profileError);
        }
      } else {
        console.log("Profile created successfully");
      }
    } catch (profileError) {
      // Non-critical error - user was created successfully
      console.warn("Could not create profile manually, but user account was created:", profileError);
    }

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  const client = getSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return { user: data.user, session: data.session };
};

/**
 * Sign out
 */
export const signOut = async () => {
  const client = getSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const client = getSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
};

/**
 * Reset password
 */
export const resetPassword = async (email: string) => {
  const client = getSupabase();
  const redirectTo = makeRedirectUri({ path: "reset-password" });

  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw error;
  return data;
};

/**
 * Update user password
 */
export const updatePassword = async (newPassword: string) => {
  const client = getSupabase();
  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
};

/**
 * Complete onboarding by updating user profile
 */
export const completeOnboarding = async (userId: string, onboardingData: OnboardingData) => {
  try {
    const client = getSupabase();

    const { error } = await client
      .from("profiles")
      .update({
        phone_number: onboardingData.phoneNumber,
        age: onboardingData.age,
        gender: onboardingData.gender,
        car_make: onboardingData.carMake,
        car_model: onboardingData.carModel,
        car_year: onboardingData.carYear,
        license_plate: onboardingData.licensePlate,
        city: onboardingData.city,
        country: onboardingData.country,
        onboarding_completed: true,
      })
      .eq("id", userId);

    if (error) throw error;
  } catch (error) {
    console.error("Onboarding error:", error);
    throw error;
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async () => {
  try {
    const client = getSupabase();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await client.from("profiles").select("*").eq("id", user.id).single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Get profile error:", error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  updates: Partial<OnboardingData & { firstName?: string; lastName?: string }>,
) => {
  try {
    const client = getSupabase();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Map updates to database columns
    const profileUpdates: any = {};
    if (updates.firstName !== undefined) profileUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) profileUpdates.last_name = updates.lastName;
    if (updates.phoneNumber !== undefined) profileUpdates.phone_number = updates.phoneNumber;
    if (updates.age !== undefined) profileUpdates.age = updates.age;
    if (updates.gender !== undefined) profileUpdates.gender = updates.gender;
    if (updates.carMake !== undefined) profileUpdates.car_make = updates.carMake;
    if (updates.carModel !== undefined) profileUpdates.car_model = updates.carModel;
    if (updates.carYear !== undefined) profileUpdates.car_year = updates.carYear;
    if (updates.licensePlate !== undefined) profileUpdates.license_plate = updates.licensePlate;
    if (updates.city !== undefined) profileUpdates.city = updates.city;
    if (updates.country !== undefined) profileUpdates.country = updates.country;

    const { error } = await client.from("profiles").update(profileUpdates).eq("id", user.id);

    if (error) throw error;
  } catch (error) {
    console.error("Update profile error:", error);
    throw error;
  }
};

/**
 * Check if onboarding is completed
 */
export const isOnboardingCompleted = async (): Promise<boolean> => {
  try {
    const profile = await getUserProfile();
    return profile?.onboarding_completed ?? false;
  } catch (error) {
    console.error("Check onboarding error:", error);
    return false;
  }
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
  try {
    const client = getSupabase();
    
    // Create redirect URI for OAuth callback
    // For Expo Go, this will create exp://... URL
    // For production builds, this will create calybr://... URL
    const redirectTo = makeRedirectUri({
      path: 'auth/callback',
      // Don't specify scheme - let Expo choose based on environment
      // In Expo Go: exp://...
      // In standalone app: calybr://...
    });

    console.log('Google OAuth redirect URI:', redirectTo);

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true, // We handle the redirect manually
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Google sign in error:", error);
    throw error;
  }
};
