/**
 * Location Permission Modal
 *
 * Beautiful, user-friendly modal for requesting location permissions
 * Explains why permissions are needed and guides users through the process
 */

import React, { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, Platform, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../utils/theme";
import { backgroundLocationService } from "../services/background-location.service";

interface LocationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
  requireBackground?: boolean;
}

export default function LocationPermissionModal({
  visible,
  onClose,
  onPermissionGranted,
  requireBackground = true,
}: LocationPermissionModalProps) {
  const [step, setStep] = useState<"intro" | "foreground" | "background" | "settings">("intro");
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermissions = async () => {
    setIsRequesting(true);

    try {
      const permissions = await backgroundLocationService.requestPermissions();

      if (permissions.foreground) {
        // Foreground permission granted - enough for testing
        onPermissionGranted();
        onClose();
      } else {
        // Permissions denied, show settings option
        setStep("settings");
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
      setStep("settings");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const renderIntro = () => (
    <>
      <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: Colors.primary + "20",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: Spacing.lg,
          }}
        >
          <Ionicons name="location" size={50} color={Colors.primary} />
        </View>
        <Text
          style={{
            fontSize: Typography.h1.fontSize,
            fontWeight: Typography.h1.fontWeight,
            color: Colors.textPrimary,
            marginBottom: Spacing.sm,
            textAlign: "center",
          }}
        >
          Enable Location Access
        </Text>
        <Text
          style={{
            fontSize: Typography.body.fontSize,
            color: Colors.textSecondary,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          Calybr needs your location to track your drives and calculate your DriveScore
        </Text>
      </View>

      <View style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
        <FeatureItem
          icon="car"
          title="Automatic Trip Detection"
          description="Automatically detects when you start and stop driving"
        />
        <FeatureItem
          icon="analytics"
          title="Drive Score Calculation"
          description="Analyzes your driving behavior to help you improve"
        />
        <FeatureItem
          icon="shield-checkmark"
          title="Your Privacy Matters"
          description="Your location data is only used for trip tracking and never shared"
        />
      </View>

      <Pressable
        onPress={handleRequestPermissions}
        disabled={isRequesting}
        style={{
          backgroundColor: Colors.primary,
          paddingVertical: Spacing.lg,
          borderRadius: BorderRadius.pill,
          alignItems: "center",
          marginBottom: Spacing.md,
          ...Shadow.subtle,
          opacity: isRequesting ? 0.7 : 1,
        }}
      >
        <Text
          style={{
            fontSize: Typography.body.fontSize,
            fontWeight: "600",
            color: Colors.textPrimary,
          }}
        >
          {isRequesting ? "Requesting..." : "Continue"}
        </Text>
      </Pressable>

      <Pressable
        onPress={onClose}
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
          Not Now
        </Text>
      </Pressable>
    </>
  );

  const renderBackgroundExplanation = () => (
    <>
      <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: Colors.primary + "20",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: Spacing.lg,
          }}
        >
          <Ionicons name="infinite" size={50} color={Colors.primary} />
        </View>
        <Text
          style={{
            fontSize: Typography.h1.fontSize,
            fontWeight: Typography.h1.fontWeight,
            color: Colors.textPrimary,
            marginBottom: Spacing.sm,
            textAlign: "center",
          }}
        >
          {Platform.OS === "ios" ? 'Enable "Always Allow"' : "Allow All the Time"}
        </Text>
        <Text
          style={{
            fontSize: Typography.body.fontSize,
            color: Colors.textSecondary,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          For automatic trip tracking, Calybr needs to access your location even when the app is closed
        </Text>
      </View>

      <View
        style={{
          backgroundColor: Colors.warning + "20",
          borderRadius: BorderRadius.medium,
          padding: Spacing.lg,
          marginBottom: Spacing.xl,
          borderWidth: 1,
          borderColor: Colors.warning,
        }}
      >
        <Text
          style={{
            fontSize: Typography.bodySmall.fontSize,
            color: Colors.textPrimary,
            lineHeight: 20,
            marginBottom: Spacing.sm,
          }}
        >
          <Text style={{ fontWeight: "600" }}>
            {Platform.OS === "ios" ? 'Select "Always Allow"' : 'Select "Allow all the time"'}
          </Text>
        </Text>
        <Text
          style={{
            fontSize: Typography.bodySmall.fontSize,
            color: Colors.textSecondary,
            lineHeight: 20,
          }}
        >
          Without this permission, Calybr can only track trips when the app is open
        </Text>
      </View>

      <Pressable
        onPress={handleRequestPermissions}
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
            fontWeight: "600",
            color: Colors.textPrimary,
          }}
        >
          Grant Permission
        </Text>
      </Pressable>

      <Pressable
        onPress={onClose}
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
          Skip for Now
        </Text>
      </Pressable>
    </>
  );

  const renderSettings = () => (
    <>
      <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: "#FF453A20",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: Spacing.lg,
          }}
        >
          <Ionicons name="settings" size={50} color="#FF453A" />
        </View>
        <Text
          style={{
            fontSize: Typography.h1.fontSize,
            fontWeight: Typography.h1.fontWeight,
            color: Colors.textPrimary,
            marginBottom: Spacing.sm,
            textAlign: "center",
          }}
        >
          Enable in Settings
        </Text>
        <Text
          style={{
            fontSize: Typography.body.fontSize,
            color: Colors.textSecondary,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          Location permission was denied. Please enable it in your device settings to use Calybr
        </Text>
      </View>

      <View
        style={{
          backgroundColor: Colors.surface,
          borderRadius: BorderRadius.medium,
          padding: Spacing.lg,
          marginBottom: Spacing.xl,
        }}
      >
        <Text
          style={{
            fontSize: Typography.bodySmall.fontSize,
            fontWeight: "600",
            color: Colors.textPrimary,
            marginBottom: Spacing.sm,
          }}
        >
          How to enable:
        </Text>
        <Text
          style={{
            fontSize: Typography.bodySmall.fontSize,
            color: Colors.textSecondary,
            lineHeight: 20,
          }}
        >
          {Platform.OS === "ios"
            ? '1. Open Settings\n2. Find Calybr\n3. Tap Location\n4. Select "Always"'
            : '1. Open Settings\n2. Find Calybr\n3. Tap Permissions\n4. Tap Location\n5. Select "Allow all the time"'}
        </Text>
      </View>

      <Pressable
        onPress={handleOpenSettings}
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
            fontWeight: "600",
            color: Colors.textPrimary,
          }}
        >
          Open Settings
        </Text>
      </Pressable>

      <Pressable
        onPress={onClose}
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
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: Colors.background,
            borderTopLeftRadius: BorderRadius.large,
            borderTopRightRadius: BorderRadius.large,
            paddingHorizontal: Spacing.xl,
            paddingTop: Spacing.xl,
            paddingBottom: Platform.OS === "ios" ? Spacing.xxl : Spacing.xl,
            maxHeight: "80%",
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.lg }}>
            {step === "intro" && renderIntro()}
            {step === "background" && renderBackgroundExplanation()}
            {step === "settings" && renderSettings()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View style={{ flexDirection: "row", gap: Spacing.md }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: Colors.primary + "20",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: Typography.body.fontSize,
            fontWeight: "600",
            color: Colors.textPrimary,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: Typography.bodySmall.fontSize,
            color: Colors.textSecondary,
            lineHeight: 18,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}
