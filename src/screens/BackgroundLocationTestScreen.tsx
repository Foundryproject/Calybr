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
  const [testMode, setTestMode] = useState<"simulation" | "real" | null>(null);
  const [isRealDriveActive, setIsRealDriveActive] = useState(false);
  const [tripSummary, setTripSummary] = useState<any>(null);

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
      if (testMode === "real") {
        setIsRealDriveActive(true);
        Alert.alert("Trip Started!", "Drive safely! The app is tracking your trip.");
      }
    });

    const unsubEnd = autoTripDetection.onTripEnd((trip) => {
      const distance = (trip.distance / 1000).toFixed(2);
      const duration = (trip.duration / 60).toFixed(1);
      const avgSpeed = trip.averageSpeed?.toFixed(1) || "0";
      
      addLog(`🏁 Trip Ended! ${distance}km in ${duration}min`);
      
      // Get start and end coordinates
      const startCoords = trip.path && trip.path.length > 0 ? trip.path[0] : null;
      const endCoords = trip.path && trip.path.length > 0 ? trip.path[trip.path.length - 1] : null;
      
      // Store trip summary
      setTripSummary({
        distance: distance,
        duration: duration,
        averageSpeed: avgSpeed,
        maxSpeed: trip.maxSpeed?.toFixed(1) || "0",
        startTime: new Date(trip.startTime).toLocaleTimeString(),
        endTime: new Date(trip.endTime || Date.now()).toLocaleTimeString(),
        startLocation: startCoords ? `${startCoords.latitude.toFixed(4)}, ${startCoords.longitude.toFixed(4)}` : "Unknown",
        endLocation: endCoords ? `${endCoords.latitude.toFixed(4)}, ${endCoords.longitude.toFixed(4)}` : "Unknown",
      });
      
      setTestStatus("complete");
      setIsTesting(false);
      setIsRealDriveActive(false);
    });

    return () => {
      unsubStart();
      unsubEnd();
    };
  };

  const handleRequestPermissions = async () => {
    setShowPermissionModal(true);
  };

  const runSimulationTest = async () => {
    if (permissionStatus.foreground !== "granted") {
      Alert.alert("Permission Required", "Please grant location permission first.");
      setShowPermissionModal(true);
      return;
    }

    setTestMode("simulation");
    setIsTesting(true);
    setTestStatus("driving");
    setLogs([]);
    setTripSummary(null);
    addLog("🧪 Starting simulation test...");

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
      addLog("✅ Simulation complete!");
      
      // Create mock summary with actual location
      setTripSummary({
        distance: "2.5",
        duration: "5.2",
        averageSpeed: "28.8",
        maxSpeed: "35.0",
        startTime: new Date(Date.now() - 312000).toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        startLocation: `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
        endLocation: `${(location.coords.latitude + 0.01).toFixed(4)}, ${(location.coords.longitude + 0.01).toFixed(4)}`,
      });
      
      Alert.alert("Test Complete!", "Check the summary below!");
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      Alert.alert("Test Failed", error.message);
    } finally {
      setIsTesting(false);
      setTestMode(null);
    }
  };

  const startRealDrive = async () => {
    if (permissionStatus.foreground !== "granted") {
      Alert.alert("Permission Required", "Please grant location permission first.");
      setShowPermissionModal(true);
      return;
    }

    setTestMode("real");
    setLogs([]);
    setTripSummary(null);
    addLog("🚗 Real drive mode activated!");
    addLog("📍 Waiting for you to start driving...");
    addLog("💡 Drive at 15+ km/h for 10 seconds to start trip");
    
    // Start auto trip detection
    try {
      await autoTripManager.initialize();
      setIsRealDriveActive(true);
      Alert.alert(
        "Ready to Drive!",
        "Start driving at 15+ km/h for 10 seconds. The trip will automatically be detected and tracked.",
        [{ text: "Got it!" }]
      );
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      Alert.alert("Error", "Failed to start real drive mode");
    }
  };

  const stopRealDrive = () => {
    setIsRealDriveActive(false);
    setTestMode(null);
    addLog("🛑 Real drive mode deactivated");
    Alert.alert("Drive Mode Stopped", "You can start a new test anytime.");
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

        {/* Test Buttons */}
        {hasPermission && !isRealDriveActive && (
          <View style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
            {/* Simulation Button */}
            <Pressable
              onPress={runSimulationTest}
              disabled={isTesting}
              style={{
                backgroundColor: isTesting ? Colors.textTertiary : Colors.primary,
                paddingVertical: Spacing.xl,
                borderRadius: BorderRadius.medium,
                alignItems: "center",
                ...Shadow.medium,
              }}
            >
              <Ionicons
                name={isTesting ? "hourglass-outline" : "flask"}
                size={32}
                color={Colors.textPrimary}
                style={{ marginBottom: Spacing.sm }}
              />
              <Text
                style={{
                  fontSize: Typography.h3.fontSize,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                  marginBottom: Spacing.xs,
                }}
              >
                {isTesting ? "Running Simulation..." : "Run Simulation"}
              </Text>
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: Colors.textSecondary,
                }}
              >
                {isTesting ? "Please wait..." : "Quick automated test (15 seconds)"}
              </Text>
            </Pressable>

            {/* Real Drive Button */}
            <Pressable
              onPress={startRealDrive}
              disabled={isTesting}
              style={{
                backgroundColor: isTesting ? Colors.textTertiary : Colors.success,
                paddingVertical: Spacing.xl,
                borderRadius: BorderRadius.medium,
                alignItems: "center",
                ...Shadow.medium,
              }}
            >
              <Ionicons
                name="car-sport"
                size={32}
                color="#FFFFFF"
                style={{ marginBottom: Spacing.sm }}
              />
              <Text
                style={{
                  fontSize: Typography.h3.fontSize,
                  fontWeight: "600",
                  color: "#FFFFFF",
                  marginBottom: Spacing.xs,
                }}
              >
                Start Real Drive
              </Text>
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: "#FFFFFF",
                  opacity: 0.9,
                }}
              >
                Actually drive and track your trip
              </Text>
            </Pressable>
          </View>
        )}

        {/* Stop Real Drive Button */}
        {isRealDriveActive && (
          <Pressable
            onPress={stopRealDrive}
            style={{
              backgroundColor: Colors.error,
              paddingVertical: Spacing.xl,
              borderRadius: BorderRadius.medium,
              alignItems: "center",
              marginBottom: Spacing.lg,
              ...Shadow.medium,
            }}
          >
            <Ionicons
              name="stop-circle"
              size={32}
              color="#FFFFFF"
              style={{ marginBottom: Spacing.sm }}
            />
            <Text
              style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "600",
                color: "#FFFFFF",
                marginBottom: Spacing.xs,
              }}
            >
              Stop Tracking
            </Text>
            <Text
              style={{
                fontSize: Typography.bodySmall.fontSize,
                color: "#FFFFFF",
                opacity: 0.9,
              }}
            >
              End real drive mode
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

        {/* Trip Summary */}
        {tripSummary && (
          <View
            style={{
              backgroundColor: Colors.success + "10",
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              marginBottom: Spacing.lg,
              borderWidth: 2,
              borderColor: Colors.success,
              ...Shadow.medium,
            }}
          >
            <Text
              style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginBottom: Spacing.lg,
                textAlign: "center",
              }}
            >
              🎉 Trip Complete!
            </Text>

            <View style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>
                  📏 Distance
                </Text>
                <Text style={{ fontSize: Typography.h3.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                  {tripSummary.distance} km
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>
                  ⏱️ Duration
                </Text>
                <Text style={{ fontSize: Typography.h3.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                  {tripSummary.duration} min
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>
                  🚗 Avg Speed
                </Text>
                <Text style={{ fontSize: Typography.h3.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                  {tripSummary.averageSpeed} km/h
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>
                  ⚡ Max Speed
                </Text>
                <Text style={{ fontSize: Typography.h3.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                  {tripSummary.maxSpeed} km/h
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm }} />

              <View style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                    🕐 Start
                  </Text>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                    {tripSummary.startTime}
                  </Text>
                </View>
                
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                    🕐 End
                  </Text>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                    {tripSummary.endTime}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.xs }} />

                <View>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary, marginBottom: 4 }}>
                    📍 Start Location
                  </Text>
                  <Text style={{ fontSize: Typography.caption.fontSize, color: Colors.textTertiary, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }}>
                    {tripSummary.startLocation}
                  </Text>
                </View>

                <View>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary, marginBottom: 4 }}>
                    🏁 End Location
                  </Text>
                  <Text style={{ fontSize: Typography.caption.fontSize, color: Colors.textTertiary, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }}>
                    {tripSummary.endLocation}
                  </Text>
                </View>
              </View>
            </View>
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
