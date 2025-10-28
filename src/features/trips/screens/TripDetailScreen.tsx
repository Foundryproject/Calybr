import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import { Colors, Typography, Spacing, BorderRadius, Shadow, getScoreColor } from "../../../utils/theme";
import { useTrips } from "../../../state/driveStore";
import { DriveEvent, EventType } from "../../../types/drive";

const getEventIcon = (eventType: EventType): keyof typeof Ionicons.glyphMap => {
  switch (eventType) {
    case "hard_brake":
      return "car-outline";
    case "speeding":
      return "speedometer-outline";
    case "phone_distraction":
      return "phone-portrait-outline";
    case "aggressive_corner":
      return "sync-outline";
    case "night_driving":
      return "moon-outline";
    default:
      return "alert-circle-outline";
  }
};

const getEventColor = (severity: string): string => {
  switch (severity) {
    case "high":
      return Colors.error;
    case "medium":
      return Colors.warning;
    case "low":
      return Colors.scoreGood;
    default:
      return Colors.textSecondary;
  }
};

export default function TripDetailScreen() {
  const route = useRoute();
  const { tripId } = (route.params as any) || {};
  const trips = useTrips();

  const trip = trips.find((t) => t.id === tripId);

  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>
            Trip not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const scoreColor = getScoreColor(trip.score);

  const renderEventCard = (event: DriveEvent) => {
    const eventColor = getEventColor(event.severity);
    const eventIcon = getEventIcon(event.type);

    return (
      <View
        key={event.id}
        style={{
          backgroundColor: Colors.surface,
          borderRadius: BorderRadius.medium,
          padding: Spacing.lg,
          marginBottom: Spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: eventColor,
          ...Shadow.subtle,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: eventColor + "20",
              justifyContent: "center",
              alignItems: "center",
              marginRight: Spacing.md,
            }}
          >
            <Ionicons name={eventIcon} size={20} color={eventColor} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xs }}>
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                }}
              >
                {event.description}
              </Text>
              <Text
                style={{
                  fontSize: Typography.caption.fontSize,
                  color: Colors.textSecondary,
                }}
              >
                {Math.floor(event.timestamp / 60)}:{String(event.timestamp % 60).padStart(2, "0")}
              </Text>
            </View>

            <Text
              style={{
                fontSize: Typography.bodySmall.fontSize,
                color: Colors.textSecondary,
                marginBottom: Spacing.sm,
              }}
            >
              {event.tip}
            </Text>

            <View
              style={{
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.xs,
                backgroundColor: eventColor + "15",
                borderRadius: BorderRadius.pill,
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  fontSize: Typography.caption.fontSize,
                  color: eventColor,
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                {event.severity} severity
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={{ height: 300 }}>
          <MapView
            style={{ flex: 1 }}
            provider={PROVIDER_DEFAULT}
            region={{
              latitude: trip.route[0].latitude,
              longitude: trip.route[0].longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Polyline coordinates={trip.route} strokeColor={scoreColor} strokeWidth={4} />
            {trip.events.map((event) => (
              <Marker
                key={event.id}
                coordinate={event.location}
                pinColor={getEventColor(event.severity)}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: getEventColor(event.severity),
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name={getEventIcon(event.type)} size={18} color="white" />
                </View>
              </Marker>
            ))}
          </MapView>
        </View>

        {/* Trip Info */}
        <View style={{ padding: Spacing.xl }}>
          {/* Score */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
            <Text
              style={{
                fontSize: 64,
                fontWeight: "600",
                color: scoreColor,
              }}
            >
              {trip.score}
            </Text>
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                color: Colors.textSecondary,
              }}
            >
              Trip Score
            </Text>
          </View>

          {/* Date & Time */}
          <View
            style={{
              backgroundColor: Colors.surfaceSecondary,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              marginBottom: Spacing.xl,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md }}>
              <View>
                <Text
                  style={{
                    fontSize: Typography.caption.fontSize,
                    color: Colors.textSecondary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  DATE
                </Text>
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "500",
                    color: Colors.textPrimary,
                  }}
                >
                  {format(trip.date, "MMM d, yyyy")}
                </Text>
              </View>

              <View>
                <Text
                  style={{
                    fontSize: Typography.caption.fontSize,
                    color: Colors.textSecondary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  TIME
                </Text>
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "500",
                    color: Colors.textPrimary,
                  }}
                >
                  {trip.startTime} - {trip.endTime}
                </Text>
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: Colors.divider,
                marginVertical: Spacing.md,
              }}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              <View style={{ alignItems: "center" }}>
                <Ionicons name="time-outline" size={24} color={Colors.textSecondary} />
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "500",
                    color: Colors.textPrimary,
                    marginTop: Spacing.xs,
                  }}
                >
                  {trip.duration} min
                </Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <Ionicons name="navigate-outline" size={24} color={Colors.textSecondary} />
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "500",
                    color: Colors.textPrimary,
                    marginTop: Spacing.xs,
                  }}
                >
                  {trip.distance} mi
                </Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <Ionicons name="cash-outline" size={24} color={Colors.textSecondary} />
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "500",
                    color: Colors.textPrimary,
                    marginTop: Spacing.xs,
                  }}
                >
                  ${trip.estimatedCost.toFixed(2)}
                </Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <Ionicons name="warning-outline" size={24} color={Colors.textSecondary} />
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "500",
                    color: Colors.textPrimary,
                    marginTop: Spacing.xs,
                  }}
                >
                  {trip.events.length} events
                </Text>
              </View>
            </View>
          </View>

          {/* Events */}
          {trip.events.length > 0 && (
            <>
              <Text
                style={{
                  fontSize: Typography.h2.fontSize,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                  marginBottom: Spacing.lg,
                }}
              >
                Events
              </Text>

              {trip.events.map(renderEventCard)}
            </>
          )}

          {trip.events.length === 0 && (
            <View
              style={{
                backgroundColor: Colors.success + "15",
                borderRadius: BorderRadius.medium,
                padding: Spacing.xl,
                alignItems: "center",
              }}
            >
              <Ionicons name="checkmark-circle" size={60} color={Colors.success} />
              <Text
                style={{
                  fontSize: Typography.h3.fontSize,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                  marginTop: Spacing.lg,
                  textAlign: "center",
                }}
              >
                Perfect Trip!
              </Text>
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  color: Colors.textSecondary,
                  marginTop: Spacing.sm,
                  textAlign: "center",
                }}
              >
                No issues detected on this trip. Keep up the great driving!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
