import React from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { Colors, Typography, Spacing, BorderRadius, Shadow, getScoreColor } from "../../../utils/theme";
import { useTrips, useDriveStore } from "../../../state/driveStore";
import { Trip } from "../../../types/drive";

export default function TripsScreen() {
  const navigation = useNavigation();
  const trips = useTrips();
  const loadTripsFromSupabase = useDriveStore((s) => s.loadTripsFromSupabase);
  const [refreshing, setRefreshing] = React.useState(false);

  // Load trips when screen mounts
  React.useEffect(() => {
    console.log('TripsScreen: Mounted, loading trips...');
    loadTripsFromSupabase();
  }, []);

  React.useEffect(() => {
    console.log('TripsScreen: Current trips count:', trips.length);
    if (trips.length > 0) {
      console.log('TripsScreen: First trip:', JSON.stringify(trips[0], null, 2));
    }
  }, [trips]);

  const handleRefresh = async () => {
    console.log('🔄 Manually refreshing trips...');
    setRefreshing(true);
    try {
      await loadTripsFromSupabase();
      console.log('✅ Trips refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing trips:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderTripCard = (trip: Trip) => {
    const scoreColor = getScoreColor(trip.score);

    return (
      <Pressable
        key={trip.id}
        onPress={() => (navigation as any).navigate("TripDetail", { tripId: trip.id })}
        style={{
          backgroundColor: Colors.surface,
          borderRadius: BorderRadius.medium,
          marginBottom: Spacing.lg,
          overflow: "hidden",
          ...Shadow.subtle,
        }}
      >
        {/* Map thumbnail */}
        <View style={{ height: 120, backgroundColor: Colors.surfaceSecondary }}>
          {trip.route && trip.route.length > 0 ? (
            <MapView
              style={{ flex: 1 }}
              provider={PROVIDER_DEFAULT}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              region={{
                latitude: trip.route[0].latitude,
                longitude: trip.route[0].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Polyline
                coordinates={trip.route}
                strokeColor={scoreColor}
                strokeWidth={4}
              />
            </MapView>
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="map-outline" size={40} color={Colors.textTertiary} />
            </View>
          )}
        </View>

        {/* Trip info */}
        <View style={{ padding: Spacing.lg }}>
          {/* Date & Time */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm }}>
            <Text
              style={{
                fontSize: Typography.bodySmall.fontSize,
                color: Colors.textSecondary,
              }}
            >
              {format(trip.date, "MMM d, yyyy")} • {trip.startTime}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: scoreColor + "20",
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.xs,
                borderRadius: BorderRadius.pill,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.label.fontSize,
                  fontWeight: "600",
                  color: scoreColor,
                }}
              >
                {trip.score}
              </Text>
            </View>
          </View>

          {/* Route */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
            <Ionicons name="location" size={16} color={Colors.textSecondary} />
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                color: Colors.textPrimary,
                fontWeight: "500",
                marginLeft: Spacing.xs,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {trip.startAddress}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
            <Ionicons name="location" size={16} color={Colors.textSecondary} />
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                color: Colors.textPrimary,
                fontWeight: "500",
                marginLeft: Spacing.xs,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {trip.endAddress}
            </Text>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: Spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: Colors.textSecondary,
                  marginLeft: Spacing.xs,
                }}
              >
                {trip.duration} min
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="navigate-outline" size={16} color={Colors.textSecondary} />
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: Colors.textSecondary,
                  marginLeft: Spacing.xs,
                }}
              >
                {trip.distance} mi
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="cash-outline" size={16} color={Colors.primary} />
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: Colors.primary,
                  marginLeft: Spacing.xs,
                  fontWeight: "600",
                }}
              >
                Est. ${(trip.estimatedCost || 0).toFixed(2)}
              </Text>
            </View>

            {trip.events.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    color: Colors.warning,
                    marginLeft: Spacing.xs,
                    fontWeight: "500",
                  }}
                >
                  {trip.events.length} {trip.events.length === 1 ? "event" : "events"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: Spacing.xl, 
          paddingVertical: Spacing.lg,
          flexGrow: 1, // Ensure ScrollView is always scrollable for pull-to-refresh
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header with refresh button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
          <Text
            style={{
              fontSize: Typography.h1.fontSize,
              fontWeight: Typography.h1.fontWeight,
              color: Colors.textPrimary,
            }}
          >
            Your Trips
          </Text>
          <Pressable
            onPress={handleRefresh}
            disabled={refreshing}
            style={{
              padding: Spacing.sm,
              borderRadius: BorderRadius.pill,
              backgroundColor: refreshing ? Colors.divider : Colors.primary + '20',
            }}
          >
            <Ionicons 
              name={refreshing ? "hourglass-outline" : "refresh"} 
              size={24} 
              color={Colors.primary} 
            />
          </Pressable>
        </View>
        <Text
          style={{
            fontSize: Typography.bodySmall.fontSize,
            color: Colors.textSecondary,
            marginBottom: Spacing.xl,
          }}
        >
          {trips.length} {trips.length === 1 ? "trip" : "trips"} recorded
        </Text>

        {trips.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: Spacing.xxl }}>
            <Ionicons name="car-outline" size={60} color={Colors.textTertiary} />
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                color: Colors.textSecondary,
                marginTop: Spacing.lg,
                textAlign: "center",
              }}
            >
              No trips yet. Start driving to see your trips here.
            </Text>
          </View>
        ) : (
          trips.map(renderTripCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
