/**
 * Background Location Test Screen
 *
 * Use this screen to test and debug background location tracking
 * Shows real-time status, location updates, and provides controls
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../utils/theme";
import { backgroundLocationService, BACKGROUND_LOCATION_TASK } from "../services/background-location.service";
import { autoTripDetection } from "../services/auto-trip-detection.service";
import { autoTripManager } from "../services/auto-trip-manager";
import { useUser, useActiveAutoTrip, useAutoTripDetectionEnabled } from "../state/driveStore";
import LocationPermissionModal from "../components/LocationPermissionModal";

export default function BackgroundLocationTestScreen() {
  const user = useUser();
  const activeAutoTrip = useActiveAutoTrip();
  const isAutoTripDetectionEnabled = useAutoTripDetectionEnabled();

  const [permissionStatus, setPermissionStatus] = useState({
    foreground: "undetermined" as Location.PermissionStatus,
    background: "undetermined" as Location.PermissionStatus,
  });
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<Location.LocationObject | null>(null);
  const [locationCount, setLocationCount] = useState(0);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [tripDetectionState, setTripDetectionState] = useState("idle");
  const [simulatedSpeed, setSimulatedSpeed] = useState(0);

  useEffect(() => {
    checkStatus();
    setupLocationListener();
    setupAutoTripListener();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  const checkStatus = async () => {
    const status = await backgroundLocationService.getPermissionStatus();
    setPermissionStatus(status);

    const tracking = await backgroundLocationService.isTrackingActive();
    setIsTracking(tracking);

    addLog(`Status checked: Tracking=${tracking}, FG=${status.foreground}, BG=${status.background}`);
  };

  const setupLocationListener = () => {
    const unsubscribe = backgroundLocationService.onLocationUpdate((locations) => {
      if (locations && locations.length > 0) {
        const loc = locations[locations.length - 1];
        setLastLocation(loc);
        setLocationCount((prev) => prev + locations.length);

        const speed = (loc.coords.speed || 0) * 3.6;
        addLog(
          `📍 Location received: ${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}, ${speed.toFixed(1)} km/h`,
        );
      }
    });

    return unsubscribe;
  };

  const setupAutoTripListener = () => {
    const unsubStart = autoTripDetection.onTripStart((trip) => {
      addLog(`🚗 TRIP STARTED! ID: ${trip.id}`);
    });

    const unsubUpdate = autoTripDetection.onTripUpdate((trip) => {
      const distance = (trip.distance / 1000).toFixed(2);
      const duration = (trip.duration / 60).toFixed(1);
      addLog(`📊 Trip update: ${distance}km, ${duration}min, ${trip.averageSpeed.toFixed(1)} km/h avg`);
    });

    const unsubEnd = autoTripDetection.onTripEnd((trip) => {
      const distance = (trip.distance / 1000).toFixed(2);
      const duration = (trip.duration / 60).toFixed(1);
      addLog(`🏁 TRIP ENDED! Distance: ${distance}km, Duration: ${duration}min`);
    });

    // Update state periodically
    const interval = setInterval(() => {
      const state = autoTripDetection.getState();
      setTripDetectionState(state.state);
    }, 1000);

    return () => {
      unsubStart();
      unsubUpdate();
      unsubEnd();
      clearInterval(interval);
    };
  };

  const handleRequestPermissions = async () => {
    setShowPermissionModal(true);
  };

  const handleStartTracking = async () => {
    addLog("🚀 Starting background tracking...");

    const success = await backgroundLocationService.startBackgroundTracking();

    if (success) {
      setIsTracking(true);
      addLog("✅ Background tracking started successfully");
      Alert.alert(
        "Tracking Started!",
        Platform.OS === "ios"
          ? "Now minimize the app or lock your screen. You should see a blue bar when tracking."
          : "Now minimize the app or lock your screen. You should see a notification.",
      );
    } else {
      addLog("❌ Failed to start tracking");
      Alert.alert("Error", "Failed to start background tracking. Check permissions.");
    }

    await checkStatus();
  };

  const handleStopTracking = async () => {
    addLog("🛑 Stopping background tracking...");

    await backgroundLocationService.stopBackgroundTracking();
    setIsTracking(false);

    addLog("✅ Background tracking stopped");
    await checkStatus();
  };

  const handleTestForeground = async () => {
    addLog("🧪 Testing foreground location...");

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLastLocation(location);
      addLog(`✅ Foreground location: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
    } catch (error: any) {
      addLog(`❌ Foreground test failed: ${error.message}`);
    }
  };

  const handleCheckTaskStatus = async () => {
    try {
      const isDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

      addLog(`Task defined: ${isDefined}, Task registered: ${isRegistered}`);

      Alert.alert("Task Status", `Task Defined: ${isDefined}\nTask Registered: ${isRegistered}`);
    } catch (error: any) {
      addLog(`❌ Task check failed: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setLocationCount(0);
  };

  const handleStartAutoTripDetection = async () => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    addLog("🚀 Starting auto trip detection...");
    const success = await autoTripManager.start(user.id);

    if (success) {
      addLog("✅ Auto trip detection started");
      Alert.alert(
        "Auto Trip Detection Started",
        "Drive at 15+ km/h for 10 seconds to trigger a trip. Stop for 2+ minutes to end it.",
      );
    } else {
      addLog("❌ Failed to start auto trip detection");
      Alert.alert("Error", "Failed to start. Check permissions.");
    }
  };

  const handleStopAutoTripDetection = async () => {
    addLog("🛑 Stopping auto trip detection...");
    await autoTripManager.stop();
    addLog("✅ Auto trip detection stopped");
  };

  const handleSimulateDriving = async () => {
    addLog("🧪 Simulating driving (20 km/h for 15 seconds)...");

    // Simulate 15 seconds of driving at 20 km/h
    for (let i = 0; i < 15; i++) {
      const currentSpeed = 20 + Math.random() * 5;
      setSimulatedSpeed(currentSpeed);

      if (lastLocation) {
        // Create simulated location with speed
        const simLoc = {
          ...lastLocation,
          coords: {
            ...lastLocation.coords,
            speed: currentSpeed / 3.6, // Convert to m/s
            latitude: lastLocation.coords.latitude + 0.0001 * i,
            longitude: lastLocation.coords.longitude + 0.0001 * i,
          },
          timestamp: Date.now(),
        };

        setLastLocation(simLoc);
        addLog(`🏎️ Simulated: ${currentSpeed.toFixed(1)} km/h`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setSimulatedSpeed(0);
    addLog("✅ Simulation complete");
  };

  const handleSimulateStopped = async () => {
    addLog("🧪 Simulating stopped (< 5 km/h for 30 seconds)...");

    for (let i = 0; i < 30; i++) {
      const currentSpeed = Math.random() * 3;
      setSimulatedSpeed(currentSpeed);

      if (lastLocation) {
        const simLoc = {
          ...lastLocation,
          coords: {
            ...lastLocation.coords,
            speed: currentSpeed / 3.6,
          },
          timestamp: Date.now(),
        };

        setLastLocation(simLoc);
        addLog(`🛑 Simulated stopped: ${currentSpeed.toFixed(1)} km/h`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setSimulatedSpeed(0);
    addLog("✅ Stop simulation complete");
  };

  const handleCheckAutoTripStatus = () => {
    const status = autoTripManager.getStatus();
    const state = autoTripDetection.getState();

    addLog(`📊 Auto Trip Status:`);
    addLog(`  - Enabled: ${status.isEnabled}`);
    addLog(`  - State: ${status.state}`);
    addLog(`  - Active Trip: ${status.activeTrip ? "Yes" : "No"}`);
    addLog(`  - Current Trip: ${state.currentTrip ? "Yes" : "No"}`);

    Alert.alert(
      "Auto Trip Detection Status",
      `Enabled: ${status.isEnabled}\nState: ${status.state}\nActive Trip: ${status.activeTrip ? "Yes" : "No"}`,
    );
  };

  const getStatusColor = (status: Location.PermissionStatus) => {
    if (status === "granted") return "#34C759";
    if (status === "denied") return "#FF453A";
    return "#FF9F0A";
  };

  const getStatusIcon = (status: Location.PermissionStatus) => {
    if (status === "granted") return "checkmark-circle";
    if (status === "denied") return "close-circle";
    return "help-circle";
  };

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
            Background Location Test
          </Text>
          <Text
            style={{
              fontSize: Typography.body.fontSize,
              color: Colors.textSecondary,
            }}
          >
            Test and debug background tracking
          </Text>
        </View>

        {/* Permission Status */}
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
            Permission Status
          </Text>

          <View style={{ gap: Spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>Foreground</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                <Ionicons
                  name={getStatusIcon(permissionStatus.foreground)}
                  size={20}
                  color={getStatusColor(permissionStatus.foreground)}
                />
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    color: getStatusColor(permissionStatus.foreground),
                    fontWeight: "600",
                  }}
                >
                  {permissionStatus.foreground}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>Background</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                <Ionicons
                  name={getStatusIcon(permissionStatus.background)}
                  size={20}
                  color={getStatusColor(permissionStatus.background)}
                />
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    color: getStatusColor(permissionStatus.background),
                    fontWeight: "600",
                  }}
                >
                  {permissionStatus.background}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleRequestPermissions}
            style={{
              backgroundColor: Colors.primary + "20",
              paddingVertical: Spacing.md,
              borderRadius: BorderRadius.medium,
              alignItems: "center",
              marginTop: Spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                fontWeight: "600",
                color: Colors.primary,
              }}
            >
              Request Permissions
            </Text>
          </Pressable>

          {Platform.OS === "ios" && permissionStatus.foreground === "granted" && permissionStatus.background !== "granted" && (
            <View
              style={{
                backgroundColor: Colors.warning + "10",
                padding: Spacing.md,
                borderRadius: BorderRadius.medium,
                marginTop: Spacing.md,
                borderLeftWidth: 3,
                borderLeftColor: Colors.warning,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: Colors.textSecondary,
                  lineHeight: 18,
                }}
              >
                ℹ️ <Text style={{ fontWeight: "600" }}>Expo Go Limitation:</Text> "Always Allow" isn't available in Expo Go.{"\n\n"}
                ✅ <Text style={{ fontWeight: "600" }}>You can still test!</Text> Use the simulation buttons below to test trip detection with foreground permission only.
              </Text>
            </View>
          )}
        </View>

        {/* Tracking Status */}
        <View
          style={{
            backgroundColor: isTracking ? "#34C75920" : Colors.surface,
            borderRadius: BorderRadius.medium,
            padding: Spacing.lg,
            marginBottom: Spacing.lg,
            ...Shadow.subtle,
            borderWidth: 2,
            borderColor: isTracking ? "#34C759" : Colors.divider,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: Spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: Typography.label.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
              }}
            >
              Tracking Status
            </Text>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: isTracking ? "#34C759" : Colors.textTertiary,
              }}
            />
          </View>

          <Text
            style={{
              fontSize: Typography.h2.fontSize,
              fontWeight: "700",
              color: isTracking ? "#34C759" : Colors.textSecondary,
              marginBottom: Spacing.xs,
            }}
          >
            {isTracking ? "ACTIVE" : "STOPPED"}
          </Text>

          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textSecondary,
              marginBottom: Spacing.md,
            }}
          >
            Locations received: {locationCount}
          </Text>

          {isTracking ? (
            <Pressable
              onPress={handleStopTracking}
              style={{
                backgroundColor: "#FF453A",
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.medium,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                Stop Tracking
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStartTracking}
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
                Start Background Tracking
              </Text>
            </Pressable>
          )}
        </View>

        {/* Last Location */}
        {lastLocation && (
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
              Last Location
            </Text>

            <View style={{ gap: Spacing.xs }}>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                Lat: {lastLocation.coords.latitude.toFixed(6)}
              </Text>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                Lon: {lastLocation.coords.longitude.toFixed(6)}
              </Text>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                Speed: {((lastLocation.coords.speed || 0) * 3.6).toFixed(1)} km/h
              </Text>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                Accuracy: {lastLocation.coords.accuracy?.toFixed(1)}m
              </Text>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                Time: {new Date(lastLocation.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}

        {/* Auto Trip Detection Status */}
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
            Auto Trip Detection
          </Text>

          <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>Status:</Text>
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: isAutoTripDetectionEnabled ? "#34C759" : Colors.textSecondary,
                  fontWeight: "600",
                }}
              >
                {isAutoTripDetectionEnabled ? "ENABLED" : "DISABLED"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>State:</Text>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textPrimary, fontWeight: "600" }}>
                {tripDetectionState.toUpperCase()}
              </Text>
            </View>
            {activeAutoTrip && (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                    Distance:
                  </Text>
                  <Text
                    style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textPrimary, fontWeight: "600" }}
                  >
                    {(activeAutoTrip.distance / 1000).toFixed(2)} km
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textSecondary }}>
                    Duration:
                  </Text>
                  <Text
                    style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.textPrimary, fontWeight: "600" }}
                  >
                    {(activeAutoTrip.duration / 60).toFixed(1)} min
                  </Text>
                </View>
              </>
            )}
          </View>

          {isAutoTripDetectionEnabled ? (
            <Pressable
              onPress={handleStopAutoTripDetection}
              style={{
                backgroundColor: "#FF453A",
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.medium,
                alignItems: "center",
                marginBottom: Spacing.sm,
              }}
            >
              <Text style={{ fontSize: Typography.body.fontSize, fontWeight: "600", color: "#FFFFFF" }}>
                Stop Auto Trip Detection
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStartAutoTripDetection}
              style={{
                backgroundColor: Colors.primary,
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.medium,
                alignItems: "center",
                marginBottom: Spacing.sm,
              }}
            >
              <Text style={{ fontSize: Typography.body.fontSize, fontWeight: "600", color: Colors.textPrimary }}>
                Start Auto Trip Detection
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleCheckAutoTripStatus}
            style={{
              backgroundColor: Colors.primary + "20",
              paddingVertical: Spacing.md,
              borderRadius: BorderRadius.medium,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: Typography.body.fontSize, fontWeight: "600", color: Colors.primary }}>
              Check Full Status
            </Text>
          </Pressable>
        </View>

        {/* Simulation Tools */}
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
            🧪 Trip Simulation
          </Text>

          <View style={{ gap: Spacing.sm }}>
            <Pressable
              onPress={handleSimulateDriving}
              style={{
                backgroundColor: "#34C759",
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.medium,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: Typography.body.fontSize, fontWeight: "600", color: "#FFFFFF" }}>
                Simulate Driving (20 km/h)
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSimulateStopped}
              style={{
                backgroundColor: "#FF9F0A",
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.medium,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: Typography.body.fontSize, fontWeight: "600", color: "#FFFFFF" }}>
                Simulate Stopped (&lt; 5 km/h)
              </Text>
            </Pressable>
          </View>

          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textSecondary,
              marginTop: Spacing.md,
              fontStyle: "italic",
            }}
          >
            Note: These simulate speed values. For real testing, drive or walk outside.
          </Text>
        </View>

        {/* Test Actions */}
        <View style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
          <Pressable
            onPress={handleTestForeground}
            style={{
              backgroundColor: Colors.surface,
              paddingVertical: Spacing.md,
              borderRadius: BorderRadius.medium,
              alignItems: "center",
              ...Shadow.subtle,
            }}
          >
            <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>
              Test Foreground Location
            </Text>
          </Pressable>

          <Pressable
            onPress={handleCheckTaskStatus}
            style={{
              backgroundColor: Colors.surface,
              paddingVertical: Spacing.md,
              borderRadius: BorderRadius.medium,
              alignItems: "center",
              ...Shadow.subtle,
            }}
          >
            <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>Check Task Status</Text>
          </Pressable>

          <Pressable
            onPress={checkStatus}
            style={{
              backgroundColor: Colors.surface,
              paddingVertical: Spacing.md,
              borderRadius: BorderRadius.medium,
              alignItems: "center",
              ...Shadow.subtle,
            }}
          >
            <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textPrimary }}>Refresh Status</Text>
          </Pressable>
        </View>

        {/* Logs */}
        <View
          style={{
            backgroundColor: "#1C1C1E",
            borderRadius: BorderRadius.medium,
            padding: Spacing.lg,
            marginBottom: Spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: Spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: Typography.label.fontSize,
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              Event Log ({logs.length})
            </Text>
            <Pressable onPress={clearLogs}>
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: Colors.primary }}>Clear</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
            {logs.length === 0 ? (
              <Text style={{ fontSize: Typography.bodySmall.fontSize, color: "#8E8E93", fontStyle: "italic" }}>
                No events yet...
              </Text>
            ) : (
              logs.map((log, index) => (
                <Text
                  key={index}
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    color: "#FFFFFF",
                    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    marginBottom: Spacing.xs,
                  }}
                >
                  {log}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {/* Instructions */}
        <View
          style={{
            backgroundColor: Colors.primary + "20",
            borderRadius: BorderRadius.medium,
            padding: Spacing.lg,
            marginBottom: Spacing.xl,
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
            📱 Testing Instructions
          </Text>
          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textSecondary,
              lineHeight: 20,
            }}
          >
            📍 BACKGROUND LOCATION TEST:{"\n"}
            1. Grant all permissions{"\n"}
            2. Start background tracking{"\n"}
            3. Minimize app → check notification{"\n"}
            4. Walk/drive → check location count{"\n"}
            {"\n"}
            🚗 AUTO TRIP DETECTION TEST:{"\n"}
            1. Start Auto Trip Detection{"\n"}
            2. Drive at 15+ km/h for 10+ seconds{"\n"}
            3. Watch state change to "DRIVING"{"\n"}
            4. Stop for 2+ minutes{"\n"}
            5. Trip should save automatically{"\n"}
            {"\n"}
            🧪 Or use "Simulate" buttons for quick testing
          </Text>
        </View>
      </ScrollView>

      <LocationPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onPermissionGranted={() => {
          setShowPermissionModal(false);
          checkStatus();
          addLog("✅ Permissions granted");
        }}
        requireBackground={true}
      />
    </SafeAreaView>
  );
}
