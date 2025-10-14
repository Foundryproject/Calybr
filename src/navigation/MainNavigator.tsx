import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography } from "../utils/theme";

// Screens
import TripsScreen from "../screens/TripsScreen";
import CoachScreen from "../screens/CoachScreen";
import RewardsScreen from "../screens/RewardsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ScoreDetailsScreen from "../screens/ScoreDetailsScreen";
import TripDetailScreen from "../screens/TripDetailScreen";
import ActiveTripScreen from "../screens/ActiveTripScreen";
import TripSummaryScreen from "../screens/TripSummaryScreen";
import DriveScreen from "../screens/DriveScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTitleStyle: {
          fontSize: Typography.h2.fontSize,
          fontWeight: Typography.h2.fontWeight as any,
        },
        headerTintColor: Colors.textPrimary,
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScoreDetails"
        component={ScoreDetailsScreen}
        options={{ title: "Score Details" }}
      />
    </Stack.Navigator>
  );
}

// Trips Stack
function TripsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTitleStyle: {
          fontSize: Typography.h2.fontSize,
          fontWeight: Typography.h2.fontWeight as any,
        },
        headerTintColor: Colors.textPrimary,
      }}
    >
      <Stack.Screen
        name="TripsList"
        component={TripsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ 
          title: "Trip Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="ActiveTrip"
        component={ActiveTripScreen}
        options={{ 
          title: "Recording Trip",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TripSummary"
        component={TripSummaryScreen}
        options={{ 
          title: "Trip Summary",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Bottom Tab Navigator
export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.divider,
          height: Platform.OS === "ios" ? 88 : 60,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
        },
        tabBarLabelStyle: {
          fontSize: Typography.caption.fontSize,
          fontWeight: Typography.label.fontWeight as any,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="TripsTab"
        component={TripsStack}
        options={{
          tabBarLabel: "Trips",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CoachTab"
        component={CoachScreen}
        options={{
          tabBarLabel: "Community",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DriveTab"
        component={DriveScreen}
        options={{
          tabBarLabel: "Drive",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RewardsTab"
        component={RewardsScreen}
        options={{
          tabBarLabel: "Rewards",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
