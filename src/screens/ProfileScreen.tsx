import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { Colors, Typography, Spacing, BorderRadius, Shadow, getScoreColor } from "../utils/theme";
import { useDriverScore, useTrips, useWeeklySummary } from "../state/driveStore";
import ScoreGauge from "../components/ScoreGauge";
import { EventType } from "../types/drive";

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

const getEventLabel = (eventType: EventType): string => {
  switch (eventType) {
    case "hard_brake":
      return "Hard Brake";
    case "speeding":
      return "Speeding";
    case "phone_distraction":
      return "Phone";
    case "aggressive_corner":
      return "Corner";
    case "night_driving":
      return "Night";
    default:
      return "Event";
  }
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const driverScore = useDriverScore();
  const trips = useTrips();
  const weeklySummary = useWeeklySummary();

  // Filter trips with low scores or events
  const reviewableTrips = trips.filter((trip) => trip.score < 85 || trip.events.length > 0);

  if (!driverScore) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>
            Loading your score...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Settings Button */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text
              style={{
                fontSize: Typography.h1.fontSize,
                fontWeight: Typography.h1.fontWeight,
                color: Colors.textPrimary,
                marginBottom: Spacing.xs,
              }}
            >
              Your Score
            </Text>
            <Text
              style={{
                fontSize: Typography.bodySmall.fontSize,
                color: Colors.textSecondary,
              }}
            >
              Based on your recent trips
            </Text>
          </View>
          
          {/* Settings Button */}
          <Pressable
            onPress={() => (navigation as any).navigate("Settings")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: Colors.surface,
              justifyContent: "center",
              alignItems: "center",
              ...Shadow.subtle,
            }}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Score Gauge */}
        <View style={{ alignItems: "center", paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm }}>
          <ScoreGauge
            value={882}
            min={0}
            max={1000}
            ranges={[
              { to: 200, color: "#D84A3A" },
              { to: 400, color: "#F28C38" },
              { to: 600, color: "#F2C94C" },
              { to: 800, color: "#7AC142" },
              { to: 1000, color: "#1E9E63" },
            ]}
            labels={["Poor", "Fair", "OK", "Good", "Excellent"]}
            thickness={14}
            gap={3}
            startAngle={135}
            ariaLabel="Your driving score"
          />

          {/* Delta */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: Spacing.lg,
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.sm,
              backgroundColor: driverScore.delta >= 0 ? Colors.success + "20" : Colors.error + "20",
              borderRadius: BorderRadius.pill,
            }}
          >
            <Ionicons
              name={driverScore.delta >= 0 ? "trending-up" : "trending-down"}
              size={20}
              color={driverScore.delta >= 0 ? Colors.success : Colors.error}
            />
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                fontWeight: "600",
                color: driverScore.delta >= 0 ? Colors.success : Colors.error,
                marginLeft: Spacing.sm,
              }}
            >
              {Math.abs(driverScore.delta)} vs last week
            </Text>
          </View>
        </View>

        {/* What you're doing well */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h3.fontSize,
              fontWeight: Typography.h3.fontWeight,
              color: Colors.textPrimary,
              marginBottom: Spacing.md,
            }}
          >
            {"What you're doing well"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}>
            {driverScore.strengths.map((strength, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                  backgroundColor: Colors.success + "15",
                  borderRadius: BorderRadius.pill,
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    color: Colors.textPrimary,
                    marginLeft: Spacing.sm,
                    fontWeight: "500",
                  }}
                >
                  {strength}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* What to improve */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h3.fontSize,
              fontWeight: Typography.h3.fontWeight,
              color: Colors.textPrimary,
              marginBottom: Spacing.md,
            }}
          >
            What to improve
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}>
            {driverScore.improvements.map((improvement, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                  backgroundColor: Colors.warning + "15",
                  borderRadius: BorderRadius.pill,
                }}
              >
                <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    color: Colors.textPrimary,
                    marginLeft: Spacing.sm,
                    fontWeight: "500",
                  }}
                >
                  {improvement}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Tip Card */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          <View
            style={{
              backgroundColor: Colors.primary + "15",
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              borderLeftWidth: 4,
              borderLeftColor: Colors.primary,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
              <Ionicons name="bulb" size={24} color={Colors.primary} />
              <Text
                style={{
                  fontSize: Typography.h3.fontSize,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                  marginLeft: Spacing.sm,
                }}
              >
                Quick Tip
              </Text>
            </View>
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                color: Colors.textPrimary,
                lineHeight: 24,
              }}
            >
              {driverScore.quickTip}
            </Text>
          </View>
        </View>

        {/* View Details Button */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          <Pressable
            onPress={() => (navigation as any).navigate("ScoreDetails")}
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: Spacing.lg,
              borderRadius: BorderRadius.pill,
              alignItems: "center",
              ...Shadow.subtle,
            }}
          >
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
              }}
            >
              View Details
            </Text>
          </Pressable>
        </View>

        {/* Weekly Summary Card */}
        {weeklySummary && (
          <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
            <View
              style={{
                backgroundColor: Colors.primary + "15",
                borderRadius: BorderRadius.medium,
                padding: Spacing.lg,
                ...Shadow.subtle,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
                <Ionicons name="trophy" size={24} color={Colors.primary} />
                <Text
                  style={{
                    fontSize: Typography.h3.fontSize,
                    fontWeight: "600",
                    color: Colors.textPrimary,
                    marginLeft: Spacing.sm,
                  }}
                >
                  This Week
                </Text>
              </View>

              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  color: Colors.textPrimary,
                  marginBottom: Spacing.md,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Top opportunity: </Text>
                {weeklySummary.topImprovement}
              </Text>

              {/* Streaks */}
              {weeklySummary.streaks.map((streak) => (
                <View
                  key={streak.name}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: streak.active ? Colors.success + "20" : Colors.divider,
                    borderRadius: BorderRadius.small,
                    padding: Spacing.md,
                    marginBottom: Spacing.sm,
                  }}
                >
                  <Ionicons
                    name={streak.active ? "flame" : "flame-outline"}
                    size={20}
                    color={streak.active ? Colors.success : Colors.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: Typography.bodySmall.fontSize,
                      color: Colors.textPrimary,
                      marginLeft: Spacing.sm,
                      flex: 1,
                    }}
                  >
                    {streak.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.label.fontSize,
                      fontWeight: "600",
                      color: streak.active ? Colors.success : Colors.textSecondary,
                    }}
                  >
                    {streak.count} days
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Drive Reviews */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h2.fontSize,
              fontWeight: "600",
              color: Colors.textPrimary,
              marginBottom: Spacing.lg,
            }}
          >
            Drive Reviews
          </Text>

          {reviewableTrips.length === 0 ? (
            <View
              style={{
                backgroundColor: Colors.success + "15",
                borderRadius: BorderRadius.medium,
                padding: Spacing.xxl,
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
                All Clear!
              </Text>
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  color: Colors.textSecondary,
                  marginTop: Spacing.sm,
                  textAlign: "center",
                }}
              >
                {"No issues flagged—great driving! Keep maintaining your excellent performance."}
              </Text>
            </View>
          ) : (
            reviewableTrips.map((trip) => {
              const scoreColor = getScoreColor(trip.score);

              return (
                <Pressable
                  key={trip.id}
                  onPress={() => (navigation as any).navigate("TripsTab", { 
                    screen: "TripDetail", 
                    params: { tripId: trip.id } 
                  })}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.medium,
                    marginBottom: Spacing.lg,
                    overflow: "hidden",
                    ...Shadow.subtle,
                  }}
                >
                  {/* Thumbnail */}
                  <View
                    style={{
                      height: 100,
                      backgroundColor: Colors.surfaceSecondary,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="videocam-outline" size={40} color={Colors.textTertiary} />
                    <Text
                      style={{
                        fontSize: Typography.caption.fontSize,
                        color: Colors.textTertiary,
                        marginTop: Spacing.xs,
                      }}
                    >
                      Dashcam + Map
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={{ padding: Spacing.lg }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm }}>
                      <Text
                        style={{
                          fontSize: Typography.body.fontSize,
                          color: Colors.textSecondary,
                        }}
                      >
                        {format(trip.date, "MMM d")} • {trip.startTime} - {trip.endTime}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: Spacing.md,
                          paddingVertical: Spacing.xs,
                          backgroundColor: scoreColor + "20",
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

                    {/* Event chips */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.md }}>
                      {trip.events.map((event) => (
                        <View
                          key={event.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: Spacing.md,
                            paddingVertical: Spacing.xs,
                            backgroundColor: Colors.warning + "15",
                            borderRadius: BorderRadius.pill,
                          }}
                        >
                          <Ionicons name={getEventIcon(event.type)} size={14} color={Colors.warning} />
                          <Text
                            style={{
                              fontSize: Typography.caption.fontSize,
                              color: Colors.warning,
                              marginLeft: Spacing.xs,
                              fontWeight: "600",
                            }}
                          >
                            {getEventLabel(event.type)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* CTA */}
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text
                        style={{
                          fontSize: Typography.bodySmall.fontSize,
                          color: Colors.primary,
                          fontWeight: "600",
                        }}
                      >
                        Open Review
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
