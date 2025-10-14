import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { useEffect, useState, useRef } from "react";
import { useDriveStore, useAutoTrackingEnabled } from "./src/state/driveStore";
import SignUpScreen from "./src/screens/SignUpScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import MainNavigator from "./src/navigation/MainNavigator";
import { supabase, isSupabaseConfigured } from "./src/lib/supabase";
import { hasCompletedOnboarding as checkOnboarding } from "./src/services/auth.service";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "./src/utils/theme";
import { tripTracker } from "./src/services/trip-tracker";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const isAuthenticated = useDriveStore((state) => state.isAuthenticated);
  const hasCompletedOnboarding = useDriveStore((state) => state.hasCompletedOnboarding);
  const login = useDriveStore((state) => state.login);
  const logout = useDriveStore((state) => state.logout);
  const completeOnboarding = useDriveStore((state) => state.completeOnboarding);
  const isAutoTrackingEnabled = useAutoTrackingEnabled();
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured() || !supabase) {
      // Skip Supabase initialization if not configured
      setIsInitializing(false);
      return;
    }

    // Check initial session
    const initializeAuth = async () => {
      try {
        if (!supabase) return;
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const authProvider = session.user.app_metadata?.provider;
          
          // User is authenticated
          login({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.first_name || session.user.email?.split("@")[0] || "User",
            authProvider: (authProvider === "google" || authProvider === "email") ? authProvider : "email",
          });

          // Check if onboarding is completed
          const onboardingComplete = await checkOnboarding(session.user.id);
          if (onboardingComplete) {
            completeOnboarding({
              firstName: session.user.user_metadata?.first_name || "",
              lastName: session.user.user_metadata?.last_name || "",
              phoneNumber: "",
              age: "",
              gender: "",
              carMake: "",
              carModel: "",
              carYear: "",
              licensePlate: "",
            });
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    // Listen for auth changes (only if supabase is configured)
    if (!supabase) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const authProvider = session.user.app_metadata?.provider;
          
          login({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.first_name || session.user.email?.split("@")[0] || "User",
            authProvider: (authProvider === "google" || authProvider === "email") ? authProvider : "email",
          });

          // Check if onboarding is completed
          const onboardingComplete = await checkOnboarding(session.user.id);
          if (onboardingComplete) {
            completeOnboarding({
              firstName: session.user.user_metadata?.first_name || "",
              lastName: session.user.user_metadata?.last_name || "",
              phoneNumber: "",
              age: "",
              gender: "",
              carMake: "",
              carModel: "",
              carYear: "",
              licensePlate: "",
            });
          }
        } else if (event === "SIGNED_OUT") {
          logout();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize trip tracker when auto-tracking is enabled
  useEffect(() => {
    if (isAuthenticated && hasCompletedOnboarding && isAutoTrackingEnabled) {
      const initTracker = async () => {
        const success = await tripTracker.initialize();
        if (success) {
          console.log('✅ Trip tracker initialized');
        }
      };
      initTracker();
    } else {
      // Shutdown tracker if disabled
      tripTracker.shutdown();
    }
  }, [isAuthenticated, hasCompletedOnboarding, isAutoTrackingEnabled]);

  // Subscribe to trip tracker events for navigation
  useEffect(() => {
    if (!isAuthenticated || !hasCompletedOnboarding) return;

    const unsubscribe = tripTracker.subscribe((state) => {
      if (!navigationRef.current) return;

      if (state.status === 'recording' && state.currentTrip) {
        // Navigate to active trip screen
        navigationRef.current.navigate('TripsTab', {
          screen: 'ActiveTrip',
        });
      } else if (state.status === 'ending' && state.currentTrip) {
        // Navigate to trip summary
        navigationRef.current.navigate('TripsTab', {
          screen: 'TripSummary',
          params: { trip: state.currentTrip },
        });
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, hasCompletedOnboarding]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderScreen = () => {
    if (!isAuthenticated) {
      return <SignUpScreen />;
    }
    if (!hasCompletedOnboarding) {
      return <OnboardingScreen />;
    }
    return <MainNavigator />;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer ref={navigationRef}>
          {renderScreen()}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
