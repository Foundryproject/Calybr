import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";
import { Trip, DriverScore, UserPreferences, WeeklySummary } from "../types/drive";

interface User {
  id: string;
  email: string;
  name: string;
  authProvider: "email" | "google";
}

interface OnboardingData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: string;
  gender: string;
  carMake: string;
  carModel: string;
  carYear: string;
  licensePlate: string;
}

interface DriveStoreState {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;

  // Onboarding state
  hasCompletedOnboarding: boolean;
  onboardingData: OnboardingData | null;

  // User preferences
  userPreferences: UserPreferences;

  // Score & metrics
  driverScore: DriverScore | null;

  // Trips
  trips: Trip[];

  // Weekly summary
  weeklySummary: WeeklySummary | null;

  // Actions
  login: (user: User) => void;
  logout: () => void;
  completeOnboarding: (data: OnboardingData) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setDriverScore: (score: DriverScore) => void;
  addTrip: (trip: Trip) => void;
  setWeeklySummary: (summary: WeeklySummary) => void;
  loadTripsFromSupabase: () => Promise<void>;

  // Auto-tracking state
  isAutoTrackingEnabled: boolean;
  setAutoTrackingEnabled: (enabled: boolean) => void;

  // Auto trip detection
  isAutoTripDetectionEnabled: boolean;
  setAutoTripDetectionEnabled: (enabled: boolean) => void;
  activeAutoTrip: any | null;
  setActiveAutoTrip: (trip: any | null) => void;
}

export const useDriveStore = create<DriveStoreState>()(
  persist(
    (set) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      hasCompletedOnboarding: false,
      onboardingData: null,
      userPreferences: {
        dashcamEnabled: false,
        blurFacesPlates: true,
        clipRetentionDays: 30,
        notificationsEnabled: true,
      },
      driverScore: null,
      trips: [],
      weeklySummary: null,
      isAutoTrackingEnabled: false,
      isAutoTripDetectionEnabled: false,
      activeAutoTrip: null,

      // Actions
      login: async (user) => {
        set({ isAuthenticated: true, user });

        // Load trips from Supabase after login
        try {
          const { getUserTrips } = await import("../services/trips.service");
          const { data: trips, error } = await getUserTrips();

          if (error) {
            console.error("Error loading trips after login:", error);
          } else if (trips && trips.length > 0) {
            set({ trips: trips.slice(0, 50) }); // Keep last 50 trips
            console.log(`✅ Loaded ${trips.length} trips after login`);
          }
        } catch (error) {
          console.error("Failed to load trips after login:", error);
        }
      },

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          hasCompletedOnboarding: false,
          onboardingData: null,
          driverScore: null,
          trips: [],
          weeklySummary: null,
        }),

      completeOnboarding: (data) => set({ hasCompletedOnboarding: true, onboardingData: data }),

      updatePreferences: (preferences) =>
        set((state) => ({
          userPreferences: { ...state.userPreferences, ...preferences },
        })),

      setDriverScore: (score) => set({ driverScore: score }),

      addTrip: (trip) =>
        set((state) => ({
          trips: [trip, ...state.trips].slice(0, 50), // Keep last 50 trips
        })),

      setWeeklySummary: (summary) => set({ weeklySummary: summary }),

      loadTripsFromSupabase: async () => {
        try {
          console.log('📥 Loading trips from Supabase...');
          const { getUserTrips } = await import("../services/trips.service");
          const { data: trips, error } = await getUserTrips();

          if (error) {
            console.error("Error loading trips from Supabase:", error);
            return;
          }

          console.log(`📦 Received ${trips?.length || 0} trips from database`);
          
          if (trips && trips.length > 0) {
            console.log('📋 First trip sample:', JSON.stringify(trips[0], null, 2));
            set({ trips: trips.slice(0, 50) }); // Keep last 50 trips
            console.log(`✅ Loaded ${trips.length} trips from Supabase into store`);
          } else {
            console.log('📭 No trips found in database');
            set({ trips: [] });
          }
        } catch (error) {
          console.error("Failed to load trips from Supabase:", error);
        }
      },

      setAutoTrackingEnabled: (enabled) => set({ isAutoTrackingEnabled: enabled }),
      setAutoTripDetectionEnabled: (enabled) => set({ isAutoTripDetectionEnabled: enabled }),
      setActiveAutoTrip: (trip) => set({ activeAutoTrip: trip }),
    }),
    {
      name: "drive-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        onboardingData: state.onboardingData,
        userPreferences: state.userPreferences,
        driverScore: state.driverScore,
        trips: state.trips,
      }),
    },
  ),
);

// Individual selectors to avoid re-renders
export const useIsAuthenticated = () => useDriveStore((s) => s.isAuthenticated);

export const useUser = () => useDriveStore((s) => s.user);

export const useHasCompletedOnboarding = () => useDriveStore((s) => s.hasCompletedOnboarding);

export const useOnboardingData = () => useDriveStore((s) => s.onboardingData);

export const useUserPreferences = () => useDriveStore((s) => s.userPreferences);

export const useDriverScore = () => useDriveStore((s) => s.driverScore);

export const useTrips = () => useDriveStore((s) => s.trips);

export const useWeeklySummary = () => useDriveStore((s) => s.weeklySummary);

export const useAutoTrackingEnabled = () => useDriveStore((s) => s.isAutoTrackingEnabled);

export const useAutoTripDetectionEnabled = () => useDriveStore((s) => s.isAutoTripDetectionEnabled);

export const useActiveAutoTrip = () => useDriveStore((s) => s.activeAutoTrip);
