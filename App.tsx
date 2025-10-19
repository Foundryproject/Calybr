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
    if (!isSupabaseConfigured() || !supabase) {
      setIsInitializing(false);
      return;
    }

    const handleAuthUser = async (user: any) => {
      const authProvider = user.app_metadata?.provider;
      login({
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.first_name || user.email?.split("@")[0] || "User",
        authProvider: (authProvider === "google" || authProvider === "email") ? authProvider : "email",
      });

      const onboardingComplete = await checkOnboarding(user.id);
      if (onboardingComplete) {
        completeOnboarding({
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
          phoneNumber: "",
          age: "",
          gender: "",
          carMake: "",
          carModel: "",
          carYear: "",
          licensePlate: "",
        });
      }
    };

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await handleAuthUser(session.user);
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await handleAuthUser(session.user);
        } else if (event === "SIGNED_OUT") {
          logout();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && hasCompletedOnboarding && isAutoTrackingEnabled) {
      tripTracker.initialize().then(success => success && console.log('✅ Trip tracker initialized'));
    } else {
      tripTracker.shutdown();
    }
  }, [isAuthenticated, hasCompletedOnboarding, isAutoTrackingEnabled]);

  useEffect(() => {
    if (!isAuthenticated || !hasCompletedOnboarding) return;

    return tripTracker.subscribe((state) => {
      if (!navigationRef.current) return;

      if (state.status === 'recording' && state.currentTrip) {
        navigationRef.current.navigate('TripsTab', { screen: 'ActiveTrip' });
      } else if (state.status === 'ending' && state.currentTrip) {
        navigationRef.current.navigate('TripsTab', { screen: 'TripSummary', params: { trip: state.currentTrip } });
      }
    });
  }, [isAuthenticated, hasCompletedOnboarding]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer ref={navigationRef}>
          {!isAuthenticated ? <SignUpScreen /> : !hasCompletedOnboarding ? <OnboardingScreen /> : <MainNavigator />}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
