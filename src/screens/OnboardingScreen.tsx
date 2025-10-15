import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../utils/theme";
import { useDriveStore } from "../state/driveStore";
import { initializeMockData } from "../utils/mockData";
import { completeOnboarding as completeOnboardingSupabase } from "../services/auth.service";
import { initializeUserScore } from "../services/scores.service";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// Country codes with flags
const countryCodes = [
  { code: "+1", country: "US", flag: "🇺🇸" },
  { code: "+1", country: "CA", flag: "🇨🇦" },
  { code: "+44", country: "GB", flag: "🇬🇧" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
];

interface OnboardingData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  countryCode: string;
  age: string;
  gender: string;
  carMake: string;
  carModel: string;
  carYear: string;
  licensePlate: string;
  city: string;
  country: string;
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const [formData, setFormData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    countryCode: "+1",
    age: "",
    gender: "",
    carMake: "",
    carModel: "",
    carYear: "",
    licensePlate: "",
    city: "San Francisco",
    country: "USA",
  });

  const completeOnboarding = useDriveStore((s) => s.completeOnboarding);
  const setDriverScore = useDriveStore((s) => s.setDriverScore);
  const addTrip = useDriveStore((s) => s.addTrip);
  const setWeeklySummary = useDriveStore((s) => s.setWeeklySummary);
  const logout = useDriveStore((s) => s.logout);
  const user = useDriveStore((s) => s.user);

  // Pre-populate first and last name from user metadata if available
  useEffect(() => {
    const loadUserMetadata = async () => {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          if (supabaseUser?.user_metadata) {
            const firstName = supabaseUser.user_metadata.first_name || "";
            const lastName = supabaseUser.user_metadata.last_name || "";
            
            if (firstName || lastName) {
              setFormData((prev) => ({
                ...prev,
                firstName,
                lastName,
              }));
            }
          }
        } catch (error) {
          console.warn('Could not load user metadata:', error);
        }
      }
    };

    loadUserMetadata();
  }, []);

  const handleBackToLogin = () => {
    // Log out the user to return to sign up screen
    logout();
  };

  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  };

  const handleNext = () => {
    const currentField = getCurrentField();
    
    // Validation
    if (!currentField.value && currentField.required) {
      setError(currentField.errorMessage || "This field is required");
      return;
    }

    // Special validations
    if (step === 4 && formData.age) {
      const age = Number(formData.age);
      if (isNaN(age) || age < 16 || age > 120) {
        setError("Please enter a valid age between 16 and 120");
        return;
      }
    }

    if (step === 7 && formData.carYear) {
      const year = Number(formData.carYear);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        setError(`Please enter a valid year between 1900 and ${currentYear + 1}`);
        return;
      }
    }

    setError("");
    if (step < 8) {
      animateTransition(() => setStep(step + 1));
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      animateTransition(() => setStep(step - 1));
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Check if Supabase is configured AND we have a user ID
      if (isSupabaseConfigured() && supabase && user?.id) {
        // Verify Supabase session (but don't fail if it's not available)
        try {
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          
          if (supabaseUser) {
            // Save to Supabase
            await completeOnboardingSupabase(supabaseUser.id, {
              phoneNumber: formData.countryCode + formData.phoneNumber,
              age: Number(formData.age),
              gender: formData.gender,
              carMake: formData.carMake,
              carModel: formData.carModel,
              carYear: Number(formData.carYear),
              licensePlate: formData.licensePlate.toUpperCase(),
              city: formData.city,
              country: formData.country,
            });

            // Initialize driver score
            await initializeUserScore();
          } else {
            // No Supabase session, but we have local user - continue anyway
            console.warn('No Supabase session found, using local auth only');
          }
        } catch (supabaseError) {
          // Supabase operations failed, but continue with local state
          console.warn('Supabase operations failed, continuing with local state:', supabaseError);
        }
      }

      // Update local state (works with or without Supabase)
      completeOnboarding({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.countryCode + formData.phoneNumber,
        age: formData.age,
        gender: formData.gender,
        carMake: formData.carMake,
        carModel: formData.carModel,
        carYear: formData.carYear,
        licensePlate: formData.licensePlate.toUpperCase(),
      });

      // Initialize mock data for demo
      initializeMockData(setDriverScore, addTrip, setWeeklySummary);
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding");
      setIsLoading(false);
    }
  };

  const getCurrentField = () => {
    const fields = [
      {
        title: "What's your first name?",
        placeholder: "Enter your first name",
        value: formData.firstName,
        field: "firstName" as keyof OnboardingData,
        keyboardType: "default" as const,
        autoCapitalize: "words" as const,
        required: true,
        errorMessage: "Please enter your first name",
      },
      {
        title: "What's your last name?",
        placeholder: "Enter your last name",
        value: formData.lastName,
        field: "lastName" as keyof OnboardingData,
        keyboardType: "default" as const,
        autoCapitalize: "words" as const,
        required: true,
        errorMessage: "Please enter your last name",
      },
      {
        title: "What's your phone number?",
        placeholder: "Enter your phone number",
        value: formData.phoneNumber,
        field: "phoneNumber" as keyof OnboardingData,
        keyboardType: "phone-pad" as const,
        autoCapitalize: "none" as const,
        required: true,
        errorMessage: "Please enter your phone number",
        isPhone: true,
      },
      {
        title: "How old are you?",
        placeholder: "Enter your age",
        value: formData.age,
        field: "age" as keyof OnboardingData,
        keyboardType: "number-pad" as const,
        autoCapitalize: "none" as const,
        required: true,
        errorMessage: "Please enter your age",
      },
      {
        title: "What's your gender?",
        value: formData.gender,
        field: "gender" as keyof OnboardingData,
        required: true,
        errorMessage: "Please select your gender",
        isGender: true,
      },
      {
        title: "What car do you drive?",
        subtitle: "Make",
        placeholder: "e.g., Toyota, Honda, Ford",
        value: formData.carMake,
        field: "carMake" as keyof OnboardingData,
        keyboardType: "default" as const,
        autoCapitalize: "words" as const,
        required: true,
        errorMessage: "Please enter your car make",
      },
      {
        title: "What's the model?",
        placeholder: "e.g., Camry, Civic, F-150",
        value: formData.carModel,
        field: "carModel" as keyof OnboardingData,
        keyboardType: "default" as const,
        autoCapitalize: "words" as const,
        required: true,
        errorMessage: "Please enter your car model",
      },
      {
        title: "What year is your car?",
        placeholder: "e.g., 2020",
        value: formData.carYear,
        field: "carYear" as keyof OnboardingData,
        keyboardType: "number-pad" as const,
        autoCapitalize: "none" as const,
        required: true,
        errorMessage: "Please enter your car year",
      },
      {
        title: "What's your license plate?",
        placeholder: "Enter your license plate",
        value: formData.licensePlate,
        field: "licensePlate" as keyof OnboardingData,
        keyboardType: "default" as const,
        autoCapitalize: "characters" as const,
        required: true,
        errorMessage: "Please enter your license plate",
      },
    ];
    return fields[step];
  };

  const currentField = getCurrentField();
  const progress = ((step + 1) / 9) * 100;

  const selectedCountry = countryCodes.find((c) => c.code === formData.countryCode) || countryCodes[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Progress Bar */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg }}>
            {/* Back Button - Always show */}
            <Pressable 
              onPress={step > 0 ? handleBack : handleBackToLogin} 
              style={{ marginRight: Spacing.md }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </Pressable>
            
            <View style={{ flex: 1, height: 4, backgroundColor: Colors.divider, borderRadius: 2 }}>
              <View
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: Colors.primary,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        </View>

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: Spacing.xl,
              paddingTop: Spacing.xxl,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Question Title */}
            <Text
              style={{
                fontSize: Typography.h1.fontSize,
                fontWeight: Typography.h1.fontWeight,
                color: Colors.textPrimary,
                marginBottom: currentField.subtitle ? Spacing.sm : Spacing.xxl,
              }}
            >
              {currentField.title}
            </Text>

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

            {currentField.subtitle && (
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  color: Colors.textSecondary,
                  marginBottom: Spacing.xxl,
                }}
              >
                {currentField.subtitle}
              </Text>
            )}

            {/* Gender Options */}
            {currentField.isGender && (
              <View style={{ gap: Spacing.md }}>
                {["Male", "Female", "Other", "Prefer not to say"].map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => updateField("gender", option)}
                    style={{
                      paddingVertical: Spacing.xl,
                      paddingHorizontal: Spacing.lg,
                      backgroundColor:
                        formData.gender === option ? Colors.primary + "20" : Colors.surface,
                      borderRadius: BorderRadius.medium,
                      borderWidth: 2,
                      borderColor: formData.gender === option ? Colors.primary : Colors.divider,
                      ...Shadow.subtle,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.body.fontSize,
                        fontWeight: formData.gender === option ? "600" : "400",
                        color: Colors.textPrimary,
                        textAlign: "center",
                      }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Phone Number with Country Code */}
            {currentField.isPhone && (
              <View>
                <View style={{ flexDirection: "row", gap: Spacing.md }}>
                  <Pressable
                    onPress={() => setShowCountryPicker(!showCountryPicker)}
                    style={{
                      width: 100,
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.medium,
                      paddingHorizontal: Spacing.lg,
                      paddingVertical: Spacing.lg,
                      borderWidth: 1,
                      borderColor: Colors.divider,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{selectedCountry.flag}</Text>
                    <Text
                      style={{
                        fontSize: Typography.body.fontSize,
                        color: Colors.textPrimary,
                      }}
                    >
                      {selectedCountry.code}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                  </Pressable>

                  <TextInput
                    value={currentField.value}
                    onChangeText={(value) => updateField(currentField.field, value)}
                    placeholder={currentField.placeholder}
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType={currentField.keyboardType}
                    autoCapitalize={currentField.autoCapitalize}
                    autoFocus
                    style={{
                      flex: 1,
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

                {/* Country Picker */}
                {showCountryPicker && (
                  <ScrollView
                    style={{
                      maxHeight: 200,
                      marginTop: Spacing.md,
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.medium,
                      borderWidth: 1,
                      borderColor: Colors.divider,
                    }}
                  >
                    {countryCodes.map((country, index) => (
                      <Pressable
                        key={index}
                        onPress={() => {
                          updateField("countryCode", country.code);
                          setShowCountryPicker(false);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: Spacing.lg,
                          borderBottomWidth: index < countryCodes.length - 1 ? 1 : 0,
                          borderBottomColor: Colors.divider,
                        }}
                      >
                        <Text style={{ fontSize: 24, marginRight: Spacing.md }}>
                          {country.flag}
                        </Text>
                        <Text
                          style={{
                            fontSize: Typography.body.fontSize,
                            color: Colors.textPrimary,
                            flex: 1,
                          }}
                        >
                          {country.country}
                        </Text>
                        <Text
                          style={{
                            fontSize: Typography.body.fontSize,
                            color: Colors.textSecondary,
                          }}
                        >
                          {country.code}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Text Input (for non-gender, non-phone questions) */}
            {!currentField.isGender && !currentField.isPhone && (
              <TextInput
                value={currentField.value}
                onChangeText={(value) => updateField(currentField.field, value)}
                placeholder={currentField.placeholder}
                placeholderTextColor={Colors.textTertiary}
                keyboardType={currentField.keyboardType}
                autoCapitalize={currentField.autoCapitalize}
                autoFocus
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.medium,
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.xl,
                  fontSize: Typography.h2.fontSize,
                  color: Colors.textPrimary,
                  borderWidth: 2,
                  borderColor: currentField.value ? Colors.primary : Colors.divider,
                }}
              />
            )}

            <View style={{ flex: 1 }} />

            {/* Next Button */}
            <Pressable
              onPress={handleNext}
              disabled={isLoading}
              style={{
                backgroundColor: Colors.primary,
                paddingVertical: Spacing.xl,
                borderRadius: BorderRadius.pill,
                alignItems: "center",
                marginTop: Spacing.xxl,
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
                {isLoading ? "Loading..." : step === 8 ? "Complete" : "Next"}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
