import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../../../utils/theme";
import { useDriveStore } from "../../../state/driveStore";
import { signUpWithEmail, signInWithEmail } from "../services/auth.service";
import { isSupabaseConfigured } from "../../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const login = useDriveStore((s) => s.login);

  const handleEmailAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Use mock authentication
      setTimeout(() => {
        login({
          id: "mock_user_" + Date.now(),
          email,
          name: name || email.split("@")[0],
          authProvider: "email",
        });
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      if (isLogin) {
        // Sign in existing user
        const data = await signInWithEmail(email, password);

        if (data?.user) {
          login({
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.first_name || email.split("@")[0],
            authProvider: "email",
          });
        }
      } else {
        // Sign up new user - split name into first and last
        const nameParts = name.trim().split(" ");
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(" ") || "";

        const data = await signUpWithEmail({
          email,
          password,
          firstName,
          lastName,
        });

        if (data?.user) {
          login({
            id: data.user.id,
            email: data.user.email || email,
            name: name,
            authProvider: "email",
          });
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Google OAuth requires a published app with custom URL scheme
    // In Vibecode development environment, use email authentication instead
    setError("Google Sign In requires a published app. Please use email/password to sign up.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: Spacing.xl,
            paddingTop: Spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Brand */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: Colors.primary,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: Spacing.lg,
              }}
            >
              <Ionicons name="speedometer" size={40} color={Colors.textPrimary} />
            </View>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "700",
                color: Colors.textPrimary,
                marginBottom: Spacing.xs,
              }}
            >
              Calybr
            </Text>
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                color: Colors.textSecondary,
                textAlign: "center",
              }}
            >
              Drive smarter, safer, better
            </Text>
          </View>

          {/* Tab Switcher */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: Colors.surfaceSecondary,
              borderRadius: BorderRadius.pill,
              padding: 4,
              marginBottom: Spacing.xl,
            }}
          >
            <Pressable
              onPress={() => setIsLogin(false)}
              style={{
                flex: 1,
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.pill,
                backgroundColor: !isLogin ? Colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  fontWeight: "600",
                  color: !isLogin ? Colors.textPrimary : Colors.textSecondary,
                  textAlign: "center",
                }}
              >
                Sign Up
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsLogin(true)}
              style={{
                flex: 1,
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.pill,
                backgroundColor: isLogin ? Colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  fontWeight: "600",
                  color: isLogin ? Colors.textPrimary : Colors.textSecondary,
                  textAlign: "center",
                }}
              >
                Log In
              </Text>
            </Pressable>
          </View>

          {/* Error Message */}
          {error && (
            <View
              style={{
                backgroundColor: "#FF453A33",
                borderRadius: BorderRadius.medium,
                padding: Spacing.md,
                marginBottom: Spacing.lg,
                borderWidth: 1,
                borderColor: "#FF453A",
              }}
            >
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  color: "#FF453A",
                  textAlign: "center",
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Form Fields */}
          {!isLogin && (
            <View style={{ marginBottom: Spacing.lg }}>
              <Text
                style={{
                  fontSize: Typography.label.fontSize,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                  marginBottom: Spacing.sm,
                }}
              >
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textTertiary}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.medium,
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.lg,
                  fontSize: Typography.body.fontSize,
                  color: Colors.textPrimary,
                  borderWidth: 1,
                  borderColor: Colors.divider,
                }}
              />
            </View>
          )}

          <View style={{ marginBottom: Spacing.lg }}>
            <Text
              style={{
                fontSize: Typography.label.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginBottom: Spacing.sm,
              }}
            >
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.medium,
                paddingHorizontal: Spacing.lg,
                paddingVertical: Spacing.lg,
                fontSize: Typography.body.fontSize,
                color: Colors.textPrimary,
                borderWidth: 1,
                borderColor: Colors.divider,
              }}
            />
          </View>

          <View style={{ marginBottom: Spacing.xl }}>
            <Text
              style={{
                fontSize: Typography.label.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginBottom: Spacing.sm,
              }}
            >
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.medium,
                paddingHorizontal: Spacing.lg,
                paddingVertical: Spacing.lg,
                fontSize: Typography.body.fontSize,
                color: Colors.textPrimary,
                borderWidth: 1,
                borderColor: Colors.divider,
              }}
            />
          </View>

          {/* Email Auth Button */}
          <Pressable
            onPress={handleEmailAuth}
            disabled={isLoading}
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: Spacing.lg,
              borderRadius: BorderRadius.pill,
              alignItems: "center",
              marginBottom: Spacing.lg,
              ...Shadow.subtle,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
              }}
            >
              {isLoading ? "Loading..." : isLogin ? "Log In" : "Create Account"}
            </Text>
          </Pressable>

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: Spacing.xl,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.divider }} />
            <Text
              style={{
                paddingHorizontal: Spacing.lg,
                fontSize: Typography.bodySmall.fontSize,
                color: Colors.textSecondary,
              }}
            >
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.divider }} />
          </View>

          {/* Google Sign In */}
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              backgroundColor: Colors.surface,
              paddingVertical: Spacing.lg,
              borderRadius: BorderRadius.pill,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: Colors.divider,
              ...Shadow.subtle,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <Ionicons name="logo-google" size={24} color={Colors.textPrimary} />
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginLeft: Spacing.md,
              }}
            >
              Google
            </Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          {/* Terms */}
          <Text
            style={{
              fontSize: Typography.caption.fontSize,
              color: Colors.textSecondary,
              textAlign: "center",
              marginTop: Spacing.xl,
              marginBottom: Spacing.lg,
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
