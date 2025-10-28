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
import { signUpWithEmail, signInWithEmail, signInWithGoogle, isOnboardingCompleted } from "../services/auth.service";
import { isSupabaseConfigured, supabase } from "../../../lib/supabase";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const login = useDriveStore((s) => s.login);
  const completeOnboarding = useDriveStore((s) => s.completeOnboarding);

  // Define handleAuthSuccess - only called after successful OAuth
  const handleAuthSuccess = React.useCallback(async (user: any) => {
    try {
      console.log('handleAuthSuccess called with user:', {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
      });
      
      // Check if onboarding is completed
      console.log('Checking onboarding status...');
      const onboardingComplete = await isOnboardingCompleted();
      console.log('Onboarding complete:', onboardingComplete);
      
      // Get user metadata
      const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '';
      const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
      
      console.log('Extracted names:', { firstName, lastName });
      
      // Log in user
      console.log('Calling login with user data...');
      login({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User',
        authProvider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
      });
      console.log('Login called successfully');

      // If onboarding is complete, skip onboarding screen
      if (onboardingComplete) {
        console.log('Onboarding complete, marking as done...');
        completeOnboarding({
          firstName: firstName,
          lastName: lastName,
          phoneNumber: '',
          age: '',
          gender: '',
          carMake: '',
          carModel: '',
          carYear: '',
          licensePlate: '',
        });
        console.log('Onboarding marked as complete');
      } else {
        console.log('Onboarding NOT complete, user should see onboarding screen');
      }
    } catch (error) {
      console.error('Error handling auth success:', error);
      throw error; // Re-throw to catch in parent
    }
  }, [login, completeOnboarding]);

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
    if (!isSupabaseConfigured()) {
      setError("Google Sign In requires Supabase configuration. Please add your Supabase credentials to .env file.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Get the OAuth URL from Supabase
      const { url } = await signInWithGoogle();
      
      if (url) {
        console.log('Opening OAuth URL:', url);
        
        // Create redirect URI dynamically (handles both Expo Go and standalone)
        const redirectUrl = makeRedirectUri({
          path: 'auth/callback',
        });
        
        console.log('Using redirect URL:', redirectUrl);
        
        // Open the OAuth URL in the browser
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
        
        console.log('WebBrowser result:', result);
        
        if (result.type === 'success' && result.url) {
          // Extract the URL parameters and manually set the session
          const callbackUrl = new URL(result.url);
          
          // Tokens can be in hash (#) or query (?) depending on flow
          const hashParams = new URLSearchParams(callbackUrl.hash.substring(1));
          const queryParams = new URLSearchParams(callbackUrl.search);
          
          const access_token = hashParams.get('access_token') || queryParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');
          
          if (access_token && refresh_token) {
            console.log('Got tokens from callback, setting session...');
            
            try {
              // Set the session manually
              const { data: { session }, error: sessionError } = await supabase!.auth.setSession({
                access_token,
                refresh_token,
              });
              
              if (sessionError) {
                console.error('Session error:', sessionError);
                throw sessionError;
              }
              
              console.log('Session data:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                userId: session?.user?.id,
                email: session?.user?.email,
              });
              
              if (session?.user) {
                console.log('Session set successfully, handling auth...');
                await handleAuthSuccess(session.user);
                console.log('Auth success handled, should be logged in now');
              } else {
                console.error('No user in session after setSession');
                setError('Authentication failed - no user in session');
              }
            } catch (authError: any) {
              console.error('Error during auth flow:', authError);
              setError(authError.message || 'Authentication failed');
            }
          } else {
            console.error('No tokens in callback URL');
            console.error('Callback URL:', result.url);
            setError('Authentication failed - no tokens received');
          }
        } else if (result.type === 'cancel') {
          setError('Sign in was cancelled');
        } else {
          console.log('OAuth result type:', result.type);
        }
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
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
