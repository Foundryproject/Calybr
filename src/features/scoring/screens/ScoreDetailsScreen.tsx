import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadow, getScoreColor } from "../../../utils/theme";
import { useDriverScore } from "../../../state/driveStore";
import { ScoreMetric } from "../../../types/drive";

export default function ScoreDetailsScreen() {
  const driverScore = useDriverScore();

  if (!driverScore) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const metrics = Object.values(driverScore.metrics);

  const renderMetricCard = (metric: ScoreMetric) => {
    const scoreColor = getScoreColor(metric.score);
    const trendIcon =
      metric.trend === "up"
        ? "trending-up"
        : metric.trend === "down"
        ? "trending-down"
        : "remove-outline";
    const trendColor =
      metric.trend === "up"
        ? Colors.success
        : metric.trend === "down"
        ? Colors.error
        : Colors.textSecondary;

    return (
      <View
        key={metric.name}
        style={{
          backgroundColor: Colors.surface,
          borderRadius: BorderRadius.medium,
          padding: Spacing.lg,
          marginBottom: Spacing.lg,
          ...Shadow.subtle,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: scoreColor + "20",
                justifyContent: "center",
                alignItems: "center",
                marginRight: Spacing.md,
              }}
            >
              <Ionicons name={metric.icon as any} size={20} color={scoreColor} />
            </View>
            <Text
              style={{
                fontSize: Typography.h3.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
              }}
            >
              {metric.name}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "600",
                color: scoreColor,
                marginRight: Spacing.sm,
              }}
            >
              {metric.score}
            </Text>
            <Ionicons name={trendIcon} size={24} color={trendColor} />
          </View>
        </View>

        {/* Percentile */}
        <View style={{ marginBottom: Spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: Spacing.xs,
            }}
          >
            <Text
              style={{
                fontSize: Typography.caption.fontSize,
                color: Colors.textSecondary,
              }}
            >
              {"vs similar drivers"}
            </Text>
            <Text
              style={{
                fontSize: Typography.caption.fontSize,
                color: Colors.textSecondary,
                fontWeight: "600",
              }}
            >
              Top {100 - metric.percentile}%
            </Text>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: Colors.divider,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${metric.percentile}%`,
                height: "100%",
                backgroundColor: scoreColor,
              }}
            />
          </View>
        </View>

        {/* Advice */}
        <View
          style={{
            backgroundColor: Colors.surfaceSecondary,
            borderRadius: BorderRadius.small,
            padding: Spacing.md,
          }}
        >
          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textPrimary,
              lineHeight: 20,
            }}
          >
            {metric.advice}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: Typography.h1.fontSize,
            fontWeight: Typography.h1.fontWeight,
            color: Colors.textPrimary,
            marginBottom: Spacing.xs,
          }}
        >
          Score Breakdown
        </Text>
        <Text
          style={{
            fontSize: Typography.bodySmall.fontSize,
            color: Colors.textSecondary,
            marginBottom: Spacing.xl,
          }}
        >
          Detailed analysis of your driving metrics
        </Text>

        {metrics.map(renderMetricCard)}
      </ScrollView>
    </SafeAreaView>
  );
}
