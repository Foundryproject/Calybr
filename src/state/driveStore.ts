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
  
  // Auto-tracking state
  isAutoTrackingEnabled: boolean;
  setAutoTrackingEnabled: (enabled: boolean) => void;
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
      
      // Actions
      login: (user) => set({ isAuthenticated: true, user }),
      
      logout: () => set({ 
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
      
      setAutoTrackingEnabled: (enabled) => set({ isAutoTrackingEnabled: enabled }),
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
    }
  )
);

// Individual selectors to avoid re-renders
export const useIsAuthenticated = () => 
  useDriveStore((s) => s.isAuthenticated);

export const useUser = () => 
  useDriveStore((s) => s.user);

export const useHasCompletedOnboarding = () => 
  useDriveStore((s) => s.hasCompletedOnboarding);

export const useOnboardingData = () => 
  useDriveStore((s) => s.onboardingData);

export const useUserPreferences = () => 
  useDriveStore((s) => s.userPreferences);

export const useDriverScore = () => 
  useDriveStore((s) => s.driverScore);

export const useTrips = () => 
  useDriveStore((s) => s.trips);

export const useWeeklySummary = () => 
  useDriveStore((s) => s.weeklySummary);

export const useAutoTrackingEnabled = () =>
  useDriveStore((s) => s.isAutoTrackingEnabled);
