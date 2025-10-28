import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../../../utils/theme";
import { TripMetrics } from "../services/trip-tracker";
import { useDriveStore } from "../../../state/driveStore";

export default function TripSummaryScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { trip } = (route.params as any) || {};
  const addTrip = useDriveStore((s) => s.addTrip);
  
  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>
            No trip data available
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
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  // Format distance
  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  // Format time
  const formatTime = (timestamp: number) => {
    return format(timestamp, "h:mm a");
  };

  // Calculate estimated fuel cost (example: 8L/100km @ $1.50/L)
  const estimateFuelCost = (distanceKm: number) => {
    const fuelConsumption = 8; // L/100km
    const fuelPrice = 1.50; // $/L
    const litersUsed = (distanceKm / 100) * fuelConsumption;
    return (litersUsed * fuelPrice).toFixed(2);
  };

  const distanceKm = trip.distance / 1000;
  const fuelCost = estimateFuelCost(distanceKm);

  // Calculate a simple drive score based on metrics
  const calculateDriveScore = () => {
    let score = 100;
    
    // Penalize high speeds
    if (trip.maxSpeed > 120) score -= 20;
    else if (trip.maxSpeed > 100) score -= 10;
    
    // Penalize very low average speed (traffic/city driving is harder)
    if (trip.averageSpeed < 30) score -= 5;
    
    // Reward longer trips (more data)
    if (distanceKm > 10) score += 5;
    
    // Penalize speed variability (rapid changes)
    const speedVariability = trip.maxSpeed - trip.averageSpeed;
    if (speedVariability > 50) score -= 15;
    else if (speedVariability > 30) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  };

  const driveScore = calculateDriveScore();
  
  // Handle save trip
  const handleSave = () => {
    // Convert TripMetrics to Trip format
    const newTrip = {
      id: Date.now().toString(),
      date: new Date(trip.startTime),
      startTime: format(trip.startTime, "h:mm a"),
      endTime: format(trip.endTime || Date.now(), "h:mm a"),
      duration: Math.round(trip.duration / 60), // convert seconds to minutes
      distance: parseFloat((trip.distance / 1609.34).toFixed(2)), // meters to miles
      score: driveScore,
      estimatedCost: parseFloat((trip.distance / 1609.34 * 0.33).toFixed(2)), // rough estimate
      startAddress: "Start Location",
      endAddress: "End Location",
      route: trip.points.map((p: any) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
      events: [], // Events would be detected separately
    };
    
    addTrip(newTrip);
    (navigation as any).navigate("TripsList");
  };
  
  const handleDiscard = () => {
    (navigation as any).navigate("TripsList");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ padding: Spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
            <Text style={{
              fontSize: Typography.h1.fontSize,
              fontWeight: "700",
              color: Colors.textPrimary,
              marginLeft: Spacing.md,
            }}>
              Trip Complete
            </Text>
          </View>
          <Text style={{
            fontSize: Typography.body.fontSize,
            color: Colors.textSecondary,
          }}>
            {formatTime(trip.startTime)} - {formatTime(trip.endTime || Date.now())}
          </Text>
        </View>

        {/* Drive Score */}
        <View style={{ 
          marginHorizontal: Spacing.xl,
          marginBottom: Spacing.xl,
          backgroundColor: Colors.primary + "15",
          borderRadius: BorderRadius.large,
          padding: Spacing.xl,
          alignItems: "center",
          ...Shadow.subtle,
        }}>
          <Text style={{
            fontSize: 72,
            fontWeight: "700",
            color: Colors.primary,
            letterSpacing: -2,
          }}>
            {driveScore}
          </Text>
          <Text style={{
            fontSize: Typography.h3.fontSize,
            fontWeight: "600",
            color: Colors.textPrimary,
            marginTop: Spacing.sm,
          }}>
            Drive Score
          </Text>
          <Text style={{
            fontSize: Typography.bodySmall.fontSize,
            color: Colors.textSecondary,
            textAlign: "center",
            marginTop: Spacing.xs,
          }}>
            {driveScore >= 90 ? "Excellent driving!" : driveScore >= 75 ? "Good job!" : "Keep practicing"}
          </Text>
        </View>

        {/* Map Placeholder */}
        <View style={{ 
          marginHorizontal: Spacing.xl,
          height: 200,
          backgroundColor: Colors.surfaceSecondary,
          borderRadius: BorderRadius.medium,
          marginBottom: Spacing.xl,
          justifyContent: "center",
          alignItems: "center",
          ...Shadow.subtle,
        }}>
          <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
          <Text style={{
            fontSize: Typography.body.fontSize,
            color: Colors.textSecondary,
            marginTop: Spacing.md,
          }}>
            Route Map
          </Text>
          <Text style={{
            fontSize: Typography.caption.fontSize,
            color: Colors.textTertiary,
            marginTop: Spacing.xs,
          }}>
            {trip.points.length} GPS points recorded
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          <Text style={{
            fontSize: Typography.h3.fontSize,
            fontWeight: "600",
            color: Colors.textPrimary,
            marginBottom: Spacing.lg,
          }}>
            Trip Statistics
          </Text>

          {/* Row 1 */}
          <View style={{ flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.md }}>
            <View style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
                <Ionicons name="navigate" size={20} color={Colors.primary} />
                <Text style={{
                  fontSize: Typography.label.fontSize,
                  color: Colors.textSecondary,
                  marginLeft: Spacing.xs,
                }}>
                  Distance
                </Text>
              </View>
              <Text style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}>
                {formatDistance(trip.distance)}
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
                <Ionicons name="time" size={20} color={Colors.primary} />
                <Text style={{
                  fontSize: Typography.label.fontSize,
                  color: Colors.textSecondary,
                  marginLeft: Spacing.xs,
                }}>
                  Duration
                </Text>
              </View>
              <Text style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}>
                {formatDuration(trip.duration)}
              </Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={{ flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.md }}>
            <View style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
                <Ionicons name="speedometer" size={20} color={Colors.primary} />
                <Text style={{
                  fontSize: Typography.label.fontSize,
                  color: Colors.textSecondary,
                  marginLeft: Spacing.xs,
                }}>
                  Avg Speed
                </Text>
              </View>
              <Text style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}>
                {trip.averageSpeed.toFixed(0)} km/h
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
                <Ionicons name="flash" size={20} color={Colors.primary} />
                <Text style={{
                  fontSize: Typography.label.fontSize,
                  color: Colors.textSecondary,
                  marginLeft: Spacing.xs,
                }}>
                  Max Speed
                </Text>
              </View>
              <Text style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}>
                {trip.maxSpeed.toFixed(0)} km/h
              </Text>
            </View>
          </View>

          {/* Fuel Cost */}
          <View style={{
            backgroundColor: Colors.surface,
            borderRadius: BorderRadius.medium,
            padding: Spacing.lg,
            ...Shadow.subtle,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
              <Ionicons name="water" size={20} color={Colors.primary} />
              <Text style={{
                fontSize: Typography.label.fontSize,
                color: Colors.textSecondary,
                marginLeft: Spacing.xs,
              }}>
                Estimated Fuel Cost
              </Text>
            </View>
            <Text style={{
              fontSize: Typography.h2.fontSize,
              fontWeight: "700",
              color: Colors.textPrimary,
            }}>
              ${fuelCost}
            </Text>
            <Text style={{
              fontSize: Typography.caption.fontSize,
              color: Colors.textTertiary,
              marginTop: Spacing.xs,
            }}>
              Based on 8L/100km @ $1.50/L
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: Spacing.xl, gap: Spacing.md }}>
          <Pressable
            onPress={handleSave}
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: Spacing.lg,
              borderRadius: BorderRadius.pill,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              ...Shadow.subtle,
            }}
          >
            <Ionicons name="save" size={24} color={Colors.textPrimary} style={{ marginRight: Spacing.sm }} />
            <Text style={{
              fontSize: Typography.body.fontSize,
              fontWeight: "700",
              color: Colors.textPrimary,
            }}>
              Save Trip
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDiscard}
            style={{
              backgroundColor: Colors.surface,
              paddingVertical: Spacing.lg,
              borderRadius: BorderRadius.pill,
              alignItems: "center",
              borderWidth: 1,
              borderColor: Colors.divider,
            }}
          >
            <Text style={{
              fontSize: Typography.body.fontSize,
              fontWeight: "600",
              color: Colors.textSecondary,
            }}>
              Discard Trip
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
