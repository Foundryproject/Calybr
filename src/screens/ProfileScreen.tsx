import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { startOfMonth, endOfMonth } from "date-fns";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../utils/theme";
import { useUser, useOnboardingData, useTrips } from "../state/driveStore";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const user = useUser();
  const onboardingData = useOnboardingData();
  const trips = useTrips();

  // Calculate this month's statistics
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthTrips = trips.filter((trip) => {
      const tripDate = new Date(trip.date);
      return tripDate >= monthStart && tripDate <= monthEnd;
    });

    const totalTrips = thisMonthTrips.length;
    const totalMiles = thisMonthTrips.reduce((sum, trip) => sum + trip.distance, 0);
    
    // Calculate gas based on average fuel efficiency (assume 25 MPG)
    const avgMPG = 25;
    const totalGas = totalMiles / avgMPG;

    return {
      totalTrips,
      totalMiles: totalMiles.toFixed(1),
      totalGas: totalGas.toFixed(1),
    };
  }, [trips]);

  const displayName = onboardingData
    ? `${onboardingData.firstName} ${onboardingData.lastName}`
    : user?.name || "Driver";

  const firstName = onboardingData?.firstName || user?.name?.split(" ")[0] || "Driver";
  
  const carInfo = onboardingData
    ? `${onboardingData.carYear} ${onboardingData.carMake} ${onboardingData.carModel}`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header with Gradient */}
        <LinearGradient
          colors={[Colors.primary, Colors.primary + "E6", Colors.primary + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: Spacing.xxl,
            paddingBottom: 80,
            paddingHorizontal: Spacing.xl,
          }}
        >
          <SafeAreaView edges={["top"]}>
            {/* Settings Button */}
            <View style={{ alignItems: "flex-end", marginBottom: Spacing.lg }}>
              <Pressable
                onPress={() => (navigation as any).navigate("Settings")}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Greeting */}
            <Text
              style={{
                fontSize: Typography.h1.fontSize,
                fontWeight: "700",
                color: "#FFFFFF",
                marginBottom: Spacing.xs,
              }}
            >
              Hello, {firstName}
            </Text>
            <Text
              style={{
                fontSize: Typography.body.fontSize,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Here's your driving profile
            </Text>
          </SafeAreaView>
        </LinearGradient>

        {/* Profile Card - Floating Effect */}
        <View
          style={{
            marginTop: -60,
            paddingHorizontal: Spacing.xl,
            marginBottom: Spacing.xl,
          }}
        >
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.large,
              padding: Spacing.xl,
              ...Shadow.medium,
            }}
          >
            {/* Avatar and Name */}
            <View style={{ alignItems: "center", marginBottom: Spacing.lg }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: Colors.primary + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: Spacing.md,
                  borderWidth: 3,
                  borderColor: Colors.primary + "30",
                }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "700",
                    color: Colors.primary,
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: Typography.h2.fontSize,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginBottom: Spacing.xs,
                }}
              >
                {displayName}
              </Text>

              {user?.email && (
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    color: Colors.textSecondary,
                  }}
                >
                  {user.email}
                </Text>
              )}
            </View>

            {/* Car Info Badge */}
            {carInfo && (
              <View
                style={{
                  backgroundColor: Colors.primary + "10",
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                  borderRadius: BorderRadius.medium,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="car-sport" size={20} color={Colors.primary} />
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    color: Colors.primary,
                    marginLeft: Spacing.sm,
                    fontWeight: "600",
                  }}
                >
                  {carInfo}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* This Month Header */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.xs }}>
            <View
              style={{
                width: 4,
                height: 20,
                backgroundColor: Colors.primary,
                borderRadius: 2,
                marginRight: Spacing.sm,
              }}
            />
            <Text
              style={{
                fontSize: Typography.h2.fontSize,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}
            >
              This Month
            </Text>
          </View>
          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textSecondary,
              marginLeft: Spacing.md + 4,
            }}
          >
            Your driving statistics for {new Date().toLocaleString("default", { month: "long" })}
          </Text>
        </View>

        {/* Stats Cards - Premium Grid */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          {/* Total Trips - Large Card */}
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.large,
              padding: Spacing.xl,
              marginBottom: Spacing.md,
              ...Shadow.medium,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: Spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: Colors.primary + "15",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: Spacing.md,
                    }}
                  >
                    <Ionicons name="car" size={24} color={Colors.primary} />
                  </View>
                  <Text
                    style={{
                      fontSize: Typography.body.fontSize,
                      color: Colors.textSecondary,
                      fontWeight: "500",
                    }}
                  >
                    Total Trips
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 48,
                    fontWeight: "800",
                    color: Colors.textPrimary,
                    letterSpacing: -2,
                  }}
                >
                  {monthlyStats.totalTrips}
                </Text>
              </View>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: Colors.primary + "10",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-up" size={40} color={Colors.primary} />
              </View>
            </View>
          </View>

          {/* Miles and Gas - Side by Side */}
          <View style={{ flexDirection: "row", gap: Spacing.md }}>
            {/* Total Miles */}
            <View
              style={{
                flex: 1,
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.large,
                padding: Spacing.lg,
                ...Shadow.medium,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: Colors.success + "15",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: Spacing.md,
                }}
              >
                <Ionicons name="navigate" size={22} color={Colors.success} />
              </View>
              <Text
                style={{
                  fontSize: Typography.caption.fontSize,
                  color: Colors.textSecondary,
                  marginBottom: Spacing.xs,
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Miles
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginBottom: Spacing.xs,
                }}
              >
                {monthlyStats.totalMiles}
              </Text>
              <View
                style={{
                  height: 3,
                  backgroundColor: Colors.success + "30",
                  borderRadius: 2,
                  width: "60%",
                }}
              />
            </View>

            {/* Total Gas */}
            <View
              style={{
                flex: 1,
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.large,
                padding: Spacing.lg,
                ...Shadow.medium,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: Colors.warning + "15",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: Spacing.md,
                }}
              >
                <Ionicons name="water" size={22} color={Colors.warning} />
              </View>
              <Text
                style={{
                  fontSize: Typography.caption.fontSize,
                  color: Colors.textSecondary,
                  marginBottom: Spacing.xs,
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Gas
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginBottom: Spacing.xs,
                }}
              >
                {monthlyStats.totalGas}
                <Text
                  style={{
                    fontSize: Typography.body.fontSize,
                    fontWeight: "500",
                    color: Colors.textSecondary,
                  }}
                >
                  {" "}
                  gal
                </Text>
              </Text>
              <View
                style={{
                  height: 3,
                  backgroundColor: Colors.warning + "30",
                  borderRadius: 2,
                  width: "60%",
                }}
              />
            </View>
          </View>
        </View>

        {/* Driver Details - If Available */}
        {onboardingData && (onboardingData.phoneNumber || onboardingData.age || onboardingData.licensePlate) && (
          <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
            <Text
              style={{
                fontSize: Typography.h3.fontSize,
                fontWeight: "600",
                color: Colors.textPrimary,
                marginBottom: Spacing.lg,
              }}
            >
              Driver Details
            </Text>

            <View
              style={{
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.large,
                padding: Spacing.lg,
                ...Shadow.subtle,
              }}
            >
              {/* Phone */}
              {onboardingData.phoneNumber && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: Spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.divider,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: Colors.primary + "10",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: Spacing.md,
                    }}
                  >
                    <Ionicons name="call" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: Typography.caption.fontSize,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      Phone Number
                    </Text>
                    <Text
                      style={{
                        fontSize: Typography.body.fontSize,
                        color: Colors.textPrimary,
                        fontWeight: "500",
                      }}
                    >
                      {onboardingData.phoneNumber}
                    </Text>
                  </View>
                </View>
              )}

              {/* Age */}
              {onboardingData.age && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: Spacing.md,
                    borderBottomWidth: onboardingData.licensePlate ? 1 : 0,
                    borderBottomColor: Colors.divider,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: Colors.success + "10",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: Spacing.md,
                    }}
                  >
                    <Ionicons name="calendar" size={18} color={Colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: Typography.caption.fontSize,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      Age
                    </Text>
                    <Text
                      style={{
                        fontSize: Typography.body.fontSize,
                        color: Colors.textPrimary,
                        fontWeight: "500",
                      }}
                    >
                      {onboardingData.age} years old
                    </Text>
                  </View>
                </View>
              )}

              {/* License Plate */}
              {onboardingData.licensePlate && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: Spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: Colors.warning + "10",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: Spacing.md,
                    }}
                  >
                    <Ionicons name="card" size={18} color={Colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: Typography.caption.fontSize,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      License Plate
                    </Text>
                    <Text
                      style={{
                        fontSize: Typography.body.fontSize,
                        color: Colors.textPrimary,
                        fontWeight: "500",
                      }}
                    >
                      {onboardingData.licensePlate}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
