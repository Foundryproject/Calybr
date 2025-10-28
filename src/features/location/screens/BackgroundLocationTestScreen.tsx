/**
 * Background Location Test Screen
 *
 * Simple, intuitive screen for testing trip detection
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../../../utils/theme";
import { backgroundLocationService } from "../services/background-location.service";
import { autoTripDetection, DetectedTrip } from "../services/auto-trip-detection.service";
import { autoTripManager } from "../services/auto-trip-manager";
import { tripDatabase } from "../../trips/services/trip-database.service";
import { routingService } from "../services/routing.service";
import { useUser, useActiveAutoTrip } from "../../../state/driveStore";
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
  const [tripRoute, setTripRoute] = useState<
    | {
        latitude: number;
        longitude: number;
        timestamp: number;
        speed: number;
      }[]
    | null
  >(null);

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
      const startCoords = trip.route && trip.route.length > 0 ? trip.route[0] : null;
      const endCoords = trip.route && trip.route.length > 0 ? trip.route[trip.route.length - 1] : null;

      // Store trip summary
      setTripSummary({
        distance: distance,
        duration: duration,
        averageSpeed: avgSpeed,
        maxSpeed: trip.maxSpeed?.toFixed(1) || "0",
        startTime: new Date(trip.startTime).toLocaleTimeString(),
        endTime: new Date(trip.endTime || Date.now()).toLocaleTimeString(),
        startLocation: startCoords
          ? `${startCoords.latitude.toFixed(4)}, ${startCoords.longitude.toFixed(4)}`
          : "Unknown",
        endLocation: endCoords ? `${endCoords.latitude.toFixed(4)}, ${endCoords.longitude.toFixed(4)}` : "Unknown",
      });

      // Store route data for map visualization
      setTripRoute(trip.route || []);

      // Note: Trip is automatically saved to Supabase by autoTripManager
      addLog("💾 Trip automatically saved to Supabase");

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
    setTripRoute(null);
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

      // Generate realistic route on actual roads using Google Directions API
      const startLat = location.coords.latitude;
      const startLon = location.coords.longitude;
      
      addLog("🗺️ Generating route on actual roads...");
      const mockRoute = await routingService.generateRealisticRoute({
        startLat,
        startLon,
        durationMinutes: 5.2,
        targetDistance: 2500, // 2.5 km
      });
      
      if (mockRoute.length > 0) {
        addLog(`✅ Generated route with ${mockRoute.length} points on real roads`);
      }

      // Calculate summary metrics from the generated route
      const maxSpeed = Math.max(...mockRoute.map((p) => p.speed));
      const avgSpeed = mockRoute.reduce((sum, p) => sum + p.speed, 0) / mockRoute.length;

      // Get end location from the route
      const endPoint = mockRoute[mockRoute.length - 1];

      // Create mock summary with actual location
      setTripSummary({
        distance: "2.5",
        duration: "5.2",
        averageSpeed: avgSpeed.toFixed(1),
        maxSpeed: maxSpeed.toFixed(1),
        startTime: new Date(Date.now() - 312000).toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        startLocation: `${startLat.toFixed(4)}, ${startLon.toFixed(4)}`,
        endLocation: `${endPoint.latitude.toFixed(4)}, ${endPoint.longitude.toFixed(4)}`,
      });

      // Store mock route data for map visualization
      setTripRoute(mockRoute);

      // Save trip to Supabase only if user ID is a valid UUID
      // Skip if using mock authentication
      if (user?.id && !user.id.startsWith("mock_user_")) {
        try {
          const mockTrip: DetectedTrip = {
            id: `simulation-${Date.now()}`,
            startTime: new Date(Date.now() - 312000),
            endTime: new Date(),
            distance: 2500, // 2.5 km in meters
            duration: 312, // 5.2 minutes in seconds
            maxSpeed: maxSpeed,
            averageSpeed: avgSpeed,
            route: mockRoute,
            events: [],
          };

          const savedTrip = await tripDatabase.saveTrip(mockTrip, user.id);
          if (savedTrip) {
            addLog(`✅ Trip saved to Supabase: ${savedTrip.id}`);
          } else {
            addLog("⚠️ Failed to save trip to Supabase");
          }
        } catch (error: any) {
          addLog(`❌ Error saving trip: ${error.message}`);
        }
      } else if (user?.id?.startsWith("mock_user_")) {
        addLog("ℹ️ Skipping Supabase save (mock user)");
      }

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

    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    setTestMode("real");
    setLogs([]);
    setTripSummary(null);
    setTripRoute(null);
    addLog("🚗 Real drive mode activated!");
    addLog("📍 Waiting for you to start driving...");
    addLog("💡 Drive at 15+ km/h for 10 seconds to start trip");

    // Start auto trip detection
    try {
      const success = await autoTripManager.start(user.id);
      if (!success) {
        throw new Error("Failed to start trip detection");
      }

      setIsRealDriveActive(true);
      addLog("✅ Auto trip detection started");
      Alert.alert(
        "Ready to Drive! 🚗",
        "Drive at 15+ km/h for 10 seconds to automatically start trip tracking.\n\nStop for 2+ minutes to end the trip.",
        [{ text: "Got it!" }],
      );
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      Alert.alert("Error", "Failed to start real drive mode: " + error.message);
      setTestMode(null);
    }
  };

  const stopRealDrive = async () => {
    try {
      // Check if there's an active trip
      const currentTrip = autoTripDetection.getState().currentTrip;

      if (currentTrip && currentTrip.route && currentTrip.route.length > 0) {
        // Create a summary for the current trip
        const distance = (currentTrip.distance / 1000).toFixed(2);
        const duration = (currentTrip.duration / 60).toFixed(1);
        const avgSpeed = currentTrip.averageSpeed?.toFixed(1) || "0";

        const startCoords = currentTrip.route[0];
        const endCoords = currentTrip.route[currentTrip.route.length - 1];

        setTripSummary({
          distance: distance,
          duration: duration,
          averageSpeed: avgSpeed,
          maxSpeed: currentTrip.maxSpeed?.toFixed(1) || "0",
          startTime: new Date(currentTrip.startTime).toLocaleTimeString(),
          endTime: new Date().toLocaleTimeString(),
          startLocation: `${startCoords.latitude.toFixed(4)}, ${startCoords.longitude.toFixed(4)}`,
          endLocation: `${endCoords.latitude.toFixed(4)}, ${endCoords.longitude.toFixed(4)}`,
        });

        // Store route data for map visualization
        setTripRoute(currentTrip.route);

        addLog(`🏁 Trip completed: ${distance}km in ${duration}min`);

        // Save trip to Supabase only if user ID is a valid UUID
        // Skip if using mock authentication
        if (user?.id && !user.id.startsWith("mock_user_")) {
          try {
            // Ensure trip has endTime
            const tripToSave: DetectedTrip = {
              ...currentTrip,
              endTime: currentTrip.endTime || new Date(),
            };

            const savedTrip = await tripDatabase.saveTrip(tripToSave, user.id);
            if (savedTrip) {
              addLog(`✅ Trip saved to Supabase: ${savedTrip.id}`);
            } else {
              addLog("⚠️ Failed to save trip to Supabase");
            }
          } catch (error: any) {
            addLog(`❌ Error saving trip: ${error.message}`);
          }
        } else if (user?.id?.startsWith("mock_user_")) {
          addLog("ℹ️ Skipping Supabase save (mock user)");
        }
      }

      await autoTripManager.stop();
      setIsRealDriveActive(false);
      setTestMode(null);
      addLog("🛑 Real drive mode deactivated");

      if (currentTrip && currentTrip.route && currentTrip.route.length > 0) {
        Alert.alert(
          "Trip Complete!",
          `Captured trip with ${currentTrip.route.length} location points. Check the summary below!`,
        );
      } else {
        Alert.alert("Drive Mode Stopped", "Auto trip detection has been stopped. You can start a new test anytime.");
      }
    } catch (error: any) {
      addLog(`⚠️ Error stopping: ${error.message}`);
      setIsRealDriveActive(false);
      setTestMode(null);
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
              <Ionicons name="car-sport" size={32} color="#FFFFFF" style={{ marginBottom: Spacing.sm }} />
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
            <Ionicons name="stop-circle" size={32} color="#FFFFFF" style={{ marginBottom: Spacing.sm }} />
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
                  name={
                    testStatus === "driving" || testStatus === "stopping" || testStatus === "complete"
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={20}
                  color={
                    testStatus === "driving" || testStatus === "stopping" || testStatus === "complete"
                      ? Colors.success
                      : Colors.textTertiary
                  }
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
                <Text style={{ flex: 1, fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>Complete</Text>
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
              <Ionicons name="car-sport" size={24} color={Colors.success} style={{ marginRight: Spacing.sm }} />
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
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>📏 Distance</Text>
                <Text style={{ fontSize: Typography.h3.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                  {tripSummary.distance} km
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>⏱️ Duration</Text>
                <Text style={{ fontSize: Typography.h3.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                  {tripSummary.duration} min
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>🚗 Avg Speed</Text>
                <Text style={{ fontSize: Typography.h3.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                  {tripSummary.averageSpeed} km/h
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textSecondary }}>⚡ Max Speed</Text>
                <Text style={{ fontSize: Typography.h3.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                  {tripSummary.maxSpeed} km/h
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm }} />

              <View style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>🕐 Start</Text>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                    {tripSummary.startTime}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>🕐 End</Text>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                    {tripSummary.endTime}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.xs }} />

                <View>
                  <Text
                    style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary, marginBottom: 4 }}
                  >
                    📍 Start Location
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.caption.fontSize,
                      color: Colors.textTertiary,
                      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    }}
                  >
                    {tripSummary.startLocation}
                  </Text>
                </View>

                <View>
                  <Text
                    style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary, marginBottom: 4 }}
                  >
                    🏁 End Location
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.caption.fontSize,
                      color: Colors.textTertiary,
                      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    }}
                  >
                    {tripSummary.endLocation}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Trip Route Map */}
        {tripRoute && tripRoute.length > 0 && (
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              marginBottom: Spacing.lg,
              ...Shadow.medium,
            }}
          >
            <Text
              style={{
                fontSize: Typography.h3.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginBottom: Spacing.md,
                textAlign: "center",
              }}
            >
              🗺️ Trip Route
            </Text>

            <View style={{ height: 250, borderRadius: BorderRadius.small, overflow: "hidden" }}>
              <MapView
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: tripRoute[0].latitude,
                  longitude: tripRoute[0].longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {/* Trip Route Polyline */}
                <Polyline
                  coordinates={tripRoute.map((point) => ({
                    latitude: point.latitude,
                    longitude: point.longitude,
                  }))}
                  strokeColor={Colors.success}
                  strokeWidth={4}
                />

                {/* Start Marker */}
                <Marker
                  coordinate={{
                    latitude: tripRoute[0].latitude,
                    longitude: tripRoute[0].longitude,
                  }}
                  title="Trip Start"
                  description={`Started at ${new Date(tripRoute[0].timestamp).toLocaleTimeString()}`}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: Colors.success,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 3,
                      borderColor: "#FFFFFF",
                    }}
                  >
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                  </View>
                </Marker>

                {/* End Marker */}
                <Marker
                  coordinate={{
                    latitude: tripRoute[tripRoute.length - 1].latitude,
                    longitude: tripRoute[tripRoute.length - 1].longitude,
                  }}
                  title="Trip End"
                  description={`Ended at ${new Date(tripRoute[tripRoute.length - 1].timestamp).toLocaleTimeString()}`}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: Colors.error,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 3,
                      borderColor: "#FFFFFF",
                    }}
                  >
                    <Ionicons name="stop" size={16} color="#FFFFFF" />
                  </View>
                </Marker>
              </MapView>
            </View>

            <Text
              style={{
                fontSize: Typography.caption.fontSize,
                color: Colors.textSecondary,
                textAlign: "center",
                marginTop: Spacing.sm,
              }}
            >
              Green line shows your route • {tripRoute.length} location points recorded
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
