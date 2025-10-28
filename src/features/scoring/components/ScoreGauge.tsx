import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { Colors, Typography } from "../../../utils/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface ColorRange {
  to: number;
  color: string;
}

interface ScoreGaugeProps {
  value: number;
  min?: number;
  max?: number;
  ranges?: ColorRange[];
  labels?: string[];
  thickness?: number; // percentage of radius
  gap?: number; // degrees between segments
  startAngle?: number;
  endAngle?: number;
  ariaLabel?: string;
}

export default function ScoreGauge({
  value,
  min = 0,
  max = 1000,
  ranges = [
    { to: 200, color: "#D84A3A" },
    { to: 400, color: "#F28C38" },
    { to: 600, color: "#F2C94C" },
    { to: 800, color: "#7AC142" },
    { to: 1000, color: "#1E9E63" },
  ],
  labels = ["Poor", "Fair", "OK", "Good", "Excellent"],
  thickness = 14,
  gap = 3,
  startAngle = 135,
  endAngle = 405,
  ariaLabel = "Score gauge",
}: ScoreGaugeProps) {
  const animatedValue = useRef(new Animated.Value(min)).current;
  
  const size = 320;
  const radius = size / 2 - 30;
  const strokeWidth = (radius * thickness) / 100;
  const innerRadius = radius - strokeWidth / 2;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1800,
      useNativeDriver: true,
    }).start();
  }, [value]);

  // Convert degrees to radians
  const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

  // Calculate point on circle
  const polarToCartesian = (angle: number, r: number) => {
    // Normalize angle to 0-360 range
    const normalizedAngle = angle % 360;
    const radians = degreesToRadians(normalizedAngle);
    return {
      x: size / 2 + r * Math.cos(radians),
      y: size / 2 + r * Math.sin(radians),
    };
  };

  // Create arc path
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(startAngle, radius);
    const end = polarToCartesian(endAngle, radius);
    
    // Determine if we need to wrap around and calculate the sweep
    let angleDiff = endAngle - startAngle;
    if (angleDiff < 0) angleDiff += 360;
    
    const largeArcFlag = angleDiff > 180 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Calculate total sweep angle (handle wraparound)
  const totalSweep = startAngle > endAngle ? 360 - startAngle + endAngle : endAngle - startAngle;
  const totalGaps = (ranges.length - 1) * gap;
  const usableAngle = totalSweep - totalGaps;

  // Calculate segments
  const segments = ranges.map((range, index) => {
    const prevTo = index === 0 ? min : ranges[index - 1].to;
    const segmentValue = range.to - prevTo;
    const segmentAngle = (segmentValue / (max - min)) * usableAngle;
    const accumulatedAngle = (prevTo / (max - min)) * usableAngle + index * gap;
    const segmentStart = startAngle + accumulatedAngle;
    const segmentEnd = segmentStart + segmentAngle;

    return {
      start: segmentStart,
      end: segmentEnd,
      color: range.color,
      value: range.to,
      prevValue: prevTo,
      label: labels[index],
    };
  });

  // Get current color based on value
  const getCurrentColor = () => {
    for (let i = 0; i < ranges.length; i++) {
      if (value <= ranges[i].to) {
        return ranges[i].color;
      }
    }
    return ranges[ranges.length - 1].color;
  };

  const currentColor = getCurrentColor();

  // Get current label
  const getCurrentLabel = () => {
    for (let i = 0; i < ranges.length; i++) {
      if (value <= ranges[i].to) {
        return labels[i] || "";
      }
    }
    return labels[labels.length - 1] || "";
  };

  return (
    <View
      style={{ alignItems: "center", justifyContent: "center", width: "100%", paddingHorizontal: 10 }}
      accessible={true}
      accessibilityLabel={`${ariaLabel}: ${value} out of ${max}. ${getCurrentLabel()}`}
    >
      <View style={{ width: size + 40, height: size * 0.8, position: "relative", marginTop: 10, marginBottom: 20 }}>
        <Svg
          width={size + 40}
          height={size * 0.8}
          viewBox={`-20 0 ${size + 40} ${size * 0.8}`}
          style={{ overflow: "visible" }}
        >
          <G>
            {/* Background segments */}
            {segments.map((segment, index) => (
              <Path
                key={`bg-${index}`}
                d={createArcPath(segment.start, segment.end, innerRadius)}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                opacity={0.15}
              />
            ))}

            {/* Animated progress */}
            {segments.map((segment, index) => {
              const arcLength = ((segment.end - segment.start) * Math.PI * innerRadius) / 180;

              return (
                <AnimatedPath
                  key={`progress-${index}`}
                  d={createArcPath(segment.start, segment.end, innerRadius)}
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${arcLength} ${arcLength}`}
                  strokeDashoffset={animatedValue.interpolate({
                    inputRange: [segment.prevValue, segment.value],
                    outputRange: [arcLength, 0],
                    extrapolate: "clamp",
                  })}
                />
              );
            })}
          </G>
        </Svg>

        {/* Center text */}
        <View
          style={{
            position: "absolute",
            top: "45%",
            left: 0,
            right: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 72,
              fontWeight: "700",
              color: currentColor,
              letterSpacing: -2,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textTertiary,
              fontWeight: "500",
              marginTop: -8,
            }}
          >
            / {max}
          </Text>
          <Text
            style={{
              fontSize: Typography.h3.fontSize,
              color: currentColor,
              fontWeight: "600",
              marginTop: 8,
            }}
          >
            {getCurrentLabel()}
          </Text>
        </View>

        {/* Min/Max labels */}
        <View
          style={{
            position: "absolute",
            width: "100%",
            bottom: 10,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 35,
          }}
        >
          <Text
            style={{
              fontSize: Typography.caption.fontSize,
              color: Colors.textTertiary,
              fontWeight: "500",
            }}
          >
            {min}
          </Text>
          <Text
            style={{
              fontSize: Typography.caption.fontSize,
              color: Colors.textTertiary,
              fontWeight: "500",
            }}
          >
            {max}
          </Text>
        </View>
      </View>
    </View>
  );
}
