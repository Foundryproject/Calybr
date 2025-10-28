import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../../../utils/theme";
import { tripTracker, TripTrackerState } from "../services/trip-tracker";

export default function ActiveTripScreen() {
  const [trackerState, setTrackerState] = useState<TripTrackerState>(tripTracker.getState());

  useEffect(() => {
    // Subscribe to trip tracker updates
    const unsubscribe = tripTracker.subscribe((state) => {
      setTrackerState(state);
    });

    return () => unsubscribe();
  }, []);

  const { currentTrip, lastLocation } = trackerState;

  if (!currentTrip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl }}>
          <Ionicons name="car-outline" size={60} color={Colors.textSecondary} />
          <Text style={{ 
            fontSize: Typography.h2.fontSize, 
            fontWeight: "600", 
            color: Colors.textPrimary,
            marginTop: Spacing.lg,
            textAlign: "center",
          }}>
            No Active Trip
          </Text>
          <Text style={{
            fontSize: Typography.body.fontSize,
            color: Colors.textSecondary,
            textAlign: "center",
            marginTop: Spacing.sm,
          }}>
            Start driving and your trip will be tracked automatically
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Format duration as HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format distance (meters to km/miles)
  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    if (km < 1) {
      return `${Math.round(meters)} m`;
    }
    return `${km.toFixed(2)} km`;
  };

  const currentSpeed = lastLocation?.speed 
    ? (lastLocation.speed * 3.6).toFixed(0) // m/s to km/h
    : "0";

  const handleStopTrip = () => {
    tripTracker.stopTrip();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ padding: Spacing.xl, paddingBottom: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
            <View style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: Colors.error,
              marginRight: Spacing.sm,
            }} />
            <Text style={{
              fontSize: Typography.h3.fontSize,
              fontWeight: "600",
              color: Colors.textPrimary,
            }}>
              Recording Trip
            </Text>
          </View>
          <Text style={{
            fontSize: Typography.bodySmall.fontSize,
            color: Colors.textSecondary,
          }}>
            Your drive is being tracked automatically
          </Text>
        </View>

        {/* Current Speed - Large Display */}
        <View style={{ 
          alignItems: "center", 
          paddingVertical: Spacing.xxl,
          paddingHorizontal: Spacing.xl,
        }}>
          <Text style={{
            fontSize: 80,
            fontWeight: "700",
            color: Colors.primary,
            letterSpacing: -2,
          }}>
            {currentSpeed}
          </Text>
          <Text style={{
            fontSize: Typography.h2.fontSize,
            fontWeight: "600",
            color: Colors.textSecondary,
            marginTop: -Spacing.md,
          }}>
            km/h
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ 
          paddingHorizontal: Spacing.xl,
          marginBottom: Spacing.xl,
        }}>
          <View style={{ 
            flexDirection: "row", 
            gap: Spacing.md,
          }}>
            {/* Distance */}
            <View style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}>
              <Ionicons name="navigate-outline" size={24} color={Colors.primary} />
              <Text style={{
                fontSize: 28,
                fontWeight: "700",
                color: Colors.textPrimary,
                marginTop: Spacing.sm,
              }}>
                {formatDistance(currentTrip.distance)}
              </Text>
              <Text style={{
                fontSize: Typography.caption.fontSize,
                color: Colors.textSecondary,
                marginTop: Spacing.xs,
              }}>
                Distance
              </Text>
            </View>

            {/* Duration */}
            <View style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}>
              <Ionicons name="time-outline" size={24} color={Colors.primary} />
              <Text style={{
                fontSize: 28,
                fontWeight: "700",
                color: Colors.textPrimary,
                marginTop: Spacing.sm,
              }}>
                {formatDuration(currentTrip.duration)}
              </Text>
              <Text style={{
                fontSize: Typography.caption.fontSize,
                color: Colors.textSecondary,
                marginTop: Spacing.xs,
              }}>
                Duration
              </Text>
            </View>
          </View>

          {/* Additional Stats Row */}
          <View style={{ 
            flexDirection: "row", 
            gap: Spacing.md,
            marginTop: Spacing.md,
          }}>
            {/* Average Speed */}
            <View style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}>
              <Text style={{
                fontSize: Typography.caption.fontSize,
                color: Colors.textSecondary,
                marginBottom: Spacing.xs,
              }}>
                Avg Speed
              </Text>
              <Text style={{
                fontSize: Typography.h3.fontSize,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}>
                {currentTrip.averageSpeed.toFixed(0)} km/h
              </Text>
            </View>

            {/* Max Speed */}
            <View style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}>
              <Text style={{
                fontSize: Typography.caption.fontSize,
                color: Colors.textSecondary,
                marginBottom: Spacing.xs,
              }}>
                Max Speed
              </Text>
              <Text style={{
                fontSize: Typography.h3.fontSize,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}>
                {currentTrip.maxSpeed.toFixed(0)} km/h
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Stop Button */}
        <View style={{ padding: Spacing.xl }}>
          <Pressable
            onPress={handleStopTrip}
            style={{
              backgroundColor: Colors.error,
              paddingVertical: Spacing.xl,
              borderRadius: BorderRadius.pill,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              ...Shadow.subtle,
            }}
          >
            <Ionicons name="stop" size={24} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
            <Text style={{
              fontSize: Typography.body.fontSize,
              fontWeight: "700",
              color: "#FFFFFF",
            }}>
              End Trip
            </Text>
          </Pressable>
          
          <Text style={{
            fontSize: Typography.caption.fontSize,
            color: Colors.textSecondary,
            textAlign: "center",
            marginTop: Spacing.md,
          }}>
            Or stop your car for 3+ minutes to end automatically
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
