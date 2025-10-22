/**
 * Background Location Test Screen
 *
 * Simple, intuitive screen for testing trip detection
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../utils/theme";
import { backgroundLocationService } from "../services/background-location.service";
import { autoTripDetection } from "../services/auto-trip-detection.service";
import { useUser, useActiveAutoTrip } from "../state/driveStore";
import LocationPermissionModal from "../components/LocationPermissionModal";

export default function BackgroundLocationTestScreen() {
  const user = useUser();
  const activeAutoTrip = useActiveAutoTrip();

  const [permissionStatus, setPermissionStatus] = useState({
    foreground: "undetermined" as Location.PermissionStatus,
    background: "undetermined" as Location.PermissionStatus,
  });
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "driving" | "stopping" | "complete">("idle");

  useEffect(() => {
    checkPermissions();
    setupAutoTripListener();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  const checkPermissions = async () => {
    const status = await backgroundLocationService.getPermissionStatus();
    setPermissionStatus(status);
  };

  const setupAutoTripListener = () => {
    const unsubStart = autoTripDetection.onTripStart((trip) => {
      addLog("🚗 Trip Started!");
      Alert.alert("Trip Started!", "Automatic trip detection is working!");
    });

    const unsubEnd = autoTripDetection.onTripEnd((trip) => {
      const distance = (trip.distance / 1000).toFixed(2);
      const duration = (trip.duration / 60).toFixed(1);
      addLog(`🏁 Trip Ended! ${distance}km in ${duration}min`);
      Alert.alert("Trip Complete!", `Distance: ${distance}km\nDuration: ${duration}min`);
      setTestStatus("complete");
      setIsTesting(false);
    });

    return () => {
      unsubStart();
      unsubEnd();
    };
  };

  const handleRequestPermissions = async () => {
    setShowPermissionModal(true);
  };

  const runFullTest = async () => {
    if (permissionStatus.foreground !== "granted") {
      Alert.alert("Permission Required", "Please grant location permission first.");
      setShowPermissionModal(true);
      return;
    }

    setIsTesting(true);
    setTestStatus("driving");
    setLogs([]);
    addLog("🧪 Starting test sequence...");

    try {
      // Get current location first
      addLog("📍 Getting your location...");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      addLog(`✅ Location: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);

      // Simulate driving
      addLog("🚗 Simulating driving at 25 km/h...");
      for (let i = 0; i < 10; i++) {
        const speed = 25 + Math.random() * 5;
        addLog(`   Speed: ${speed.toFixed(1)} km/h`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Simulate stopping
      setTestStatus("stopping");
      addLog("🛑 Simulating stop...");
      for (let i = 0; i < 5; i++) {
        const speed = Math.random() * 2;
        addLog(`   Speed: ${speed.toFixed(1)} km/h`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setTestStatus("complete");
      addLog("✅ Test sequence complete!");
      Alert.alert("Test Complete!", "Check the logs above for details.");
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      Alert.alert("Test Failed", error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const hasPermission = permissionStatus.foreground === "granted";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg }}>
        {/* Header */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h1.fontSize,
              fontWeight: Typography.h1.fontWeight,
              color: Colors.textPrimary,
              marginBottom: Spacing.xs,
            }}
          >
            Trip Detection Test
          </Text>
          <Text
            style={{
              fontSize: Typography.body.fontSize,
              color: Colors.textSecondary,
            }}
          >
            Test automatic trip tracking
          </Text>
        </View>

        {/* Permission Card */}
        <View
          style={{
            backgroundColor: hasPermission ? Colors.success + "10" : Colors.warning + "10",
            borderRadius: BorderRadius.medium,
            padding: Spacing.lg,
            marginBottom: Spacing.lg,
            borderWidth: 2,
            borderColor: hasPermission ? Colors.success : Colors.warning,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
            <Ionicons
              name={hasPermission ? "checkmark-circle" : "alert-circle"}
              size={24}
              color={hasPermission ? Colors.success : Colors.warning}
              style={{ marginRight: Spacing.sm }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: Typography.body.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
              }}
              numberOfLines={2}
            >
              {hasPermission ? "✅ Location Permission Granted" : "⚠️ Location Permission Required"}
            </Text>
          </View>

          {!hasPermission && (
            <>
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: Colors.textSecondary,
                  marginBottom: Spacing.md,
                }}
              >
                Grant location access to test trip detection
              </Text>
              <Pressable
                onPress={handleRequestPermissions}
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: Spacing.md,
                  borderRadius: BorderRadius.medium,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "600",
                    color: Colors.textPrimary,
                  }}
                >
                  Grant Permission
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Test Button */}
        {hasPermission && (
          <Pressable
            onPress={runFullTest}
            disabled={isTesting}
            style={{
              backgroundColor: isTesting ? Colors.textTertiary : Colors.primary,
              paddingVertical: Spacing.xl,
              borderRadius: BorderRadius.medium,
              alignItems: "center",
              marginBottom: Spacing.lg,
              ...Shadow.medium,
            }}
          >
            <Ionicons
              name={isTesting ? "hourglass-outline" : "play-circle"}
              size={32}
              color={Colors.textPrimary}
              style={{ marginBottom: Spacing.sm }}
            />
            <Text
              style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginBottom: Spacing.xs,
              }}
            >
              {isTesting ? "Testing..." : "Run Test"}
            </Text>
            <Text
              style={{
                fontSize: Typography.bodySmall.fontSize,
                color: Colors.textSecondary,
              }}
            >
              {isTesting ? "Please wait..." : "Test trip detection automatically"}
            </Text>
          </Pressable>
        )}

        {/* Test Status */}
        {isTesting && (
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              marginBottom: Spacing.lg,
              ...Shadow.subtle,
            }}
          >
            <Text
              style={{
                fontSize: Typography.label.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginBottom: Spacing.md,
              }}
            >
              Test Progress
            </Text>

            <View style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={testStatus === "driving" || testStatus === "stopping" || testStatus === "complete" ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={testStatus === "driving" || testStatus === "stopping" || testStatus === "complete" ? Colors.success : Colors.textTertiary}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={{ flex: 1, fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>
                  Simulating Driving
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={testStatus === "stopping" || testStatus === "complete" ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={testStatus === "stopping" || testStatus === "complete" ? Colors.success : Colors.textTertiary}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={{ flex: 1, fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>
                  Simulating Stop
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={testStatus === "complete" ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={testStatus === "complete" ? Colors.success : Colors.textTertiary}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={{ flex: 1, fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>
                  Complete
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Trip Indicator */}
        {activeAutoTrip && (
          <View
            style={{
              backgroundColor: Colors.success + "20",
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              marginBottom: Spacing.lg,
              borderWidth: 2,
              borderColor: Colors.success,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
              <Ionicons
                name="car-sport"
                size={24}
                color={Colors.success}
                style={{ marginRight: Spacing.sm }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: Typography.body.fontSize,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                }}
                numberOfLines={1}
              >
                🚗 Trip in Progress
              </Text>
            </View>
            <Text
              style={{
                fontSize: Typography.bodySmall.fontSize,
                color: Colors.textSecondary,
              }}
              numberOfLines={3}
            >
              Distance: {((activeAutoTrip.distance || 0) / 1000).toFixed(2)} km
              {"\n"}
              Duration: {Math.floor((activeAutoTrip.duration || 0) / 60)} min
            </Text>
          </View>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              marginBottom: Spacing.lg,
              ...Shadow.subtle,
            }}
          >
            <Text
              style={{
                fontSize: Typography.label.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginBottom: Spacing.md,
              }}
            >
              Test Logs
            </Text>
            <ScrollView
              style={{
                backgroundColor: Colors.background,
                borderRadius: BorderRadius.small,
                padding: Spacing.md,
                maxHeight: 300,
              }}
              nestedScrollEnabled
            >
              {logs.map((log, index) => (
                <Text
                  key={index}
                  style={{
                    fontSize: Typography.caption.fontSize,
                    color: Colors.textSecondary,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    marginBottom: 4,
                  }}
                  numberOfLines={3}
                >
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Instructions */}
        <View
          style={{
            backgroundColor: Colors.primary + "10",
            borderRadius: BorderRadius.medium,
            padding: Spacing.lg,
            marginBottom: Spacing.xxl,
          }}
        >
          <Text
            style={{
              fontSize: Typography.label.fontSize,
              fontWeight: "600",
              color: Colors.textPrimary,
              marginBottom: Spacing.sm,
            }}
          >
            📖 How It Works
          </Text>
          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textSecondary,
              lineHeight: 20,
            }}
          >
            1. Grant location permission{"\n"}
            2. Tap "Run Test" button{"\n"}
            3. Watch the test simulate driving and stopping{"\n"}
            4. Check the logs for detailed information{"\n\n"}
            The test will automatically detect trip start and end!
          </Text>
        </View>
      </ScrollView>

      <LocationPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onPermissionGranted={() => {
          setShowPermissionModal(false);
          checkPermissions();
        }}
        requireBackground={false}
      />
    </SafeAreaView>
  );
}
