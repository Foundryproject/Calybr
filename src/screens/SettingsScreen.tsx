import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../utils/theme";
import {
  useUserPreferences,
  useDriveStore,
  useAutoTrackingEnabled,
  useUser,
  useAutoTripDetectionEnabled,
} from "../state/driveStore";
import { tripTracker } from "../services/trip-tracker";
import { autoTripManager } from "../services/auto-trip-manager";
import * as Location from "expo-location";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const preferences = useUserPreferences();
  const updatePreferences = useDriveStore((s) => s.updatePreferences);
  const logout = useDriveStore((s) => s.logout);
  const isAutoTrackingEnabled = useAutoTrackingEnabled();
  const setAutoTrackingEnabled = useDriveStore((s) => s.setAutoTrackingEnabled);
  const isAutoTripDetectionEnabled = useAutoTripDetectionEnabled();
  const setAutoTripDetectionEnabled = useDriveStore((s) => s.setAutoTripDetectionEnabled);
  const user = useUser();
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  // Note: Auto tracking is now handled by autoTripDetection
  // This function is kept for backwards compatibility but redirects to the new system
  const handleAutoTrackingToggle = async (enabled: boolean) => {
    // Redirect to auto trip detection toggle
    await handleAutoTripDetectionToggle(enabled);
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === "granted") {
      setShowPermissionModal(false);
      handleAutoTrackingToggle(true);
    } else {
      Alert.alert(
        "Permission Required",
        "Location permission is required for automatic trip tracking. Please enable it in your device settings.",
        [{ text: "OK" }],
      );
    }
  };

  const handleAutoTripDetectionToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!user?.id) {
        Alert.alert("Error", "You must be logged in to use automatic trip detection");
        return;
      }

      // Check permissions first
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();

      if (foregroundStatus !== "granted" || backgroundStatus !== "granted") {
        setShowPermissionModal(true);
        return;
      }

      // Start auto trip detection
      const success = await autoTripManager.start(user.id);
      if (success) {
        setAutoTripDetectionEnabled(true);
        // Silent success - no alert needed
      } else {
        Alert.alert("Error", "Failed to enable automatic trip detection. Please check permissions.");
      }
    } else {
      // Disable auto trip detection
      await autoTripManager.stop();
      setAutoTripDetectionEnabled(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: Spacing.xl,
            paddingTop: Spacing.xl,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: Spacing.lg,
          }}
        >
          <Pressable onPress={() => navigation.goBack()} style={{ marginRight: Spacing.md }}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Typography.h1.fontSize,
                fontWeight: Typography.h1.fontWeight,
                color: Colors.textPrimary,
              }}
            >
              Settings
            </Text>
          </View>
        </View>

        {/* Auto-Tracking Settings */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md }}>
          <Text
            style={{
              fontSize: Typography.h3.fontSize,
              fontWeight: "600",
              color: Colors.textPrimary,
              marginBottom: Spacing.lg,
            }}
          >
            Trip Tracking
          </Text>

          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              padding: Spacing.lg,
              ...Shadow.subtle,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, marginRight: Spacing.lg }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.xs }}>
                  <Ionicons name="location" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                  <Text
                    style={{
                      fontSize: Typography.body.fontSize,
                      fontWeight: "600",
                      color: Colors.textPrimary,
                    }}
                  >
                    Automatic Trip Tracking
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    color: Colors.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  Automatically detect and record your trips without pressing start
                </Text>
              </View>
              <Switch
                value={isAutoTripDetectionEnabled}
                onValueChange={handleAutoTripDetectionToggle}
                trackColor={{ false: Colors.divider, true: Colors.primary + "80" }}
                thumbColor={isAutoTripDetectionEnabled ? Colors.primary : Colors.surface}
                ios_backgroundColor={Colors.divider}
              />
            </View>
          </View>
        </View>

        {/* General Settings */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h3.fontSize,
              fontWeight: "600",
              color: Colors.textPrimary,
              marginBottom: Spacing.lg,
            }}
          >
            General
          </Text>

          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              overflow: "hidden",
              ...Shadow.subtle,
            }}
          >
            {/* Notifications */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: Spacing.lg,
              }}
            >
              <View style={{ flex: 1, marginRight: Spacing.lg }}>
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "500",
                    color: Colors.textPrimary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  Notifications
                </Text>
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    color: Colors.textSecondary,
                  }}
                >
                  Receive tips and score updates
                </Text>
              </View>
              <Switch
                value={preferences.notificationsEnabled}
                onValueChange={(value) => updatePreferences({ notificationsEnabled: value })}
                trackColor={{ false: Colors.divider, true: Colors.primary + "80" }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Developer Tools */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h3.fontSize,
              fontWeight: "600",
              color: Colors.textPrimary,
              marginBottom: Spacing.lg,
            }}
          >
            Developer Tools
          </Text>

          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              ...Shadow.subtle,
            }}
          >
            <Pressable
              onPress={() => (navigation as any).navigate("BackgroundLocationTest")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: Spacing.lg,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: Colors.primary + "20",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: Spacing.md,
                  }}
                >
                  <Ionicons name="location" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: Typography.body.fontSize,
                      fontWeight: "500",
                      color: Colors.textPrimary,
                      marginBottom: 2,
                    }}
                  >
                    Test Background Location
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.bodySmall.fontSize,
                      color: Colors.textSecondary,
                    }}
                  >
                    Debug location tracking
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* About */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h3.fontSize,
              fontWeight: "600",
              color: Colors.textPrimary,
              marginBottom: Spacing.lg,
            }}
          >
            About
          </Text>

          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.medium,
              ...Shadow.subtle,
            }}
          >
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: Spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: Colors.divider,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  color: Colors.textPrimary,
                }}
              >
                Privacy Policy
              </Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </Pressable>

            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: Spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: Colors.divider,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  color: Colors.textPrimary,
                }}
              >
                Terms of Service
              </Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </Pressable>

            <View style={{ padding: Spacing.lg }}>
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: Colors.textSecondary,
                }}
              >
                Calybr v1.0.0
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
          <Pressable
            onPress={handleLogout}
            style={{
              backgroundColor: Colors.error + "15",
              paddingVertical: Spacing.lg,
              borderRadius: BorderRadius.pill,
              alignItems: "center",
              borderWidth: 1,
              borderColor: Colors.error + "30",
            }}
          >
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                fontWeight: "600",
                color: Colors.error,
              }}
            >
              Log Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Permission Request Modal */}
      <Modal
        visible={showPermissionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: Colors.background,
              borderTopLeftRadius: BorderRadius.large,
              borderTopRightRadius: BorderRadius.large,
              padding: Spacing.xl,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: Colors.primary + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: Spacing.lg,
                }}
              >
                <Ionicons name="location" size={40} color={Colors.primary} />
              </View>
              <Text
                style={{
                  fontSize: Typography.h2.fontSize,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginBottom: Spacing.sm,
                  textAlign: "center",
                }}
              >
                Enable Auto-Tracking
              </Text>
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  color: Colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 24,
                }}
              >
                Calybr needs access to your location to automatically detect and track your drives. This helps calculate
                your DriveScore without you having to manually start each trip.
              </Text>
            </View>

            <View style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: "row", marginBottom: Spacing.md }}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={Colors.success}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textPrimary, flex: 1 }}>
                  Never miss a trip
                </Text>
              </View>
              <View style={{ flexDirection: "row", marginBottom: Spacing.md }}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={Colors.success}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textPrimary, flex: 1 }}>
                  Automatic start and stop
                </Text>
              </View>
              <View style={{ flexDirection: "row", marginBottom: Spacing.md }}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={Colors.success}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={{ fontSize: Typography.body.fontSize, color: Colors.textPrimary, flex: 1 }}>
                  Battery-optimized tracking
                </Text>
              </View>
            </View>

            <Pressable
              onPress={requestLocationPermission}
              style={{
                backgroundColor: Colors.primary,
                paddingVertical: Spacing.lg,
                borderRadius: BorderRadius.pill,
                alignItems: "center",
                marginBottom: Spacing.md,
                ...Shadow.subtle,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                }}
              >
                Enable Location Access
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowPermissionModal(false)}
              style={{
                paddingVertical: Spacing.md,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  color: Colors.textSecondary,
                }}
              >
                Maybe Later
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
