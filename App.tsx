import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import MainNavigator from "./src/navigation/MainNavigator";
import { SignUpScreen, OnboardingScreen } from "./src/features/auth";
import { useIsAuthenticated, useHasCompletedOnboarding } from "./src/state/driveStore";

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const hasCompletedOnboarding = useHasCompletedOnboarding();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {!isAuthenticated ? <SignUpScreen /> : !hasCompletedOnboarding ? <OnboardingScreen /> : <MainNavigator />}
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
