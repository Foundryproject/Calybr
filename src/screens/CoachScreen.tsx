import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { Colors, Typography, Spacing, BorderRadius, Shadow, getScoreColor } from "../utils/theme";
import { useDriverScore, useOnboardingData } from "../state/driveStore";

// Mock community data
const generateMockLeaderboard = (userScore: number, userName: string, scope: "city" | "country") => {
  const names = [
    "Sarah Johnson", "Mike Chen", "Emily Rodriguez", "James Wilson", 
    "Maria Garcia", "David Kim", "Jessica Lee", "Ryan Patel",
    "Amanda Brown", "Chris Taylor", "Nicole Martinez", "Kevin Wong",
    "Tom Anderson", "Lisa Wang", "Alex Cooper", "Sam Miller",
    "Jordan Lee", "Casey Smith", "Morgan Davis", "Taylor White"
  ];
  
  const carMakes = ["Tesla", "Honda", "Toyota", "BMW", "Mercedes", "Audi", "Ford", "Chevrolet"];
  const carModels = ["Model 3", "Civic", "Camry", "3 Series", "C-Class", "A4", "Mustang", "Camaro"];
  const carYears = [2020, 2021, 2022, 2023, 2024];
  
  const multiplier = scope === "city" ? 1 : 2;
  const leaderboard = names.slice(0, 10 * multiplier).map((name, index) => ({
    id: `user-${index}`,
    name,
    score: 970 - (index * 15) + Math.floor(Math.random() * 10),
    rank: index + 1,
    avatar: `https://i.pravatar.cc/150?img=${index + 1}`,
    streak: Math.floor(Math.random() * 45) + 5,
    memberSince: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    totalTrips: Math.floor(Math.random() * 500) + 100,
    car: {
      make: carMakes[index % carMakes.length],
      model: carModels[index % carModels.length],
      year: carYears[Math.floor(Math.random() * carYears.length)],
    },
    isCurrentUser: false,
  }));

  // Insert current user
  const userRank = leaderboard.findIndex(u => u.score < userScore) || leaderboard.length;
  leaderboard.splice(userRank, 0, {
    id: "current-user",
    name: userName,
    score: userScore,
    rank: userRank + 1,
    avatar: "https://i.pravatar.cc/150?img=50",
    streak: 12,
    memberSince: new Date(2024, 0, 15),
    totalTrips: 156,
    car: {
      make: "Tesla",
      model: "Model 3",
      year: 2023,
    },
    isCurrentUser: true,
  });

  // Update ranks
  return leaderboard.map((user, index) => ({ ...user, rank: index + 1 }));
};

const mockChallenges = [
  {
    id: "1",
    title: "Weekend Warrior",
    description: "Complete 5 trips with score above 850 this weekend",
    icon: "trophy-outline",
    progress: 3,
    total: 5,
    reward: "250 points",
    expiresIn: "2 days",
  },
  {
    id: "2",
    title: "Zero Events Week",
    description: "Complete a full week with no driving events",
    icon: "shield-checkmark-outline",
    progress: 4,
    total: 7,
    reward: "500 points",
    expiresIn: "3 days",
  },
  {
    id: "3",
    title: "Night Owl",
    description: "Maintain 900+ score on 3 night drives",
    icon: "moon-outline",
    progress: 1,
    total: 3,
    reward: "150 points",
    expiresIn: "5 days",
  },
];

const mockAchievements = [
  { id: "1", title: "Perfect Week", icon: "star", unlocked: true, color: Colors.primary },
  { id: "2", title: "Speed Demon Tamed", icon: "speedometer", unlocked: true, color: Colors.success },
  { id: "3", title: "100 Trips", icon: "car-sport", unlocked: true, color: Colors.primary },
  { id: "4", title: "Smooth Operator", icon: "checkmark-circle", unlocked: false, color: Colors.textTertiary },
  { id: "5", title: "Night Master", icon: "moon", unlocked: false, color: Colors.textTertiary },
  { id: "6", title: "Road Scholar", icon: "school", unlocked: false, color: Colors.textTertiary },
];

// Helper function to get car image URL
const getCarImageUrl = (make: string, model: string, year: number) => {
  // Using a combination of multiple free car image APIs and CDNs
  const makeModel = `${make} ${model}`.toLowerCase().replace(/\s+/g, '-');
  
  // High-quality car images from various sources
  const carImages: { [key: string]: string } = {
    'tesla-model-3': 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80',
    'honda-civic': 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&q=80',
    'toyota-camry': 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80',
    'bmw-3-series': 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
    'mercedes-c-class': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
    'audi-a4': 'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=800&q=80',
    'ford-mustang': 'https://images.unsplash.com/photo-1584345604476-8ec5f53b6a7f?w=800&q=80',
    'chevrolet-camaro': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
  };
  
  return carImages[makeModel] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80';
};
const calculateLevel = (totalTrips: number) => {
  if (totalTrips < 50) return { level: 1, title: "Rookie" };
  if (totalTrips < 150) return { level: 2, title: "Driver" };
  if (totalTrips < 300) return { level: 3, title: "Pro" };
  if (totalTrips < 500) return { level: 4, title: "Expert" };
  return { level: 5, title: "Master" };
};

// Circular Progress Avatar Component
const CircularProgressAvatar = ({ 
  initial, 
  score, 
  size = 42 
}: { 
  initial: string; 
  score: number; 
  size?: number;
}) => {
  const scoreColor = getScoreColor(score);
  const radius = (size - 6) / 2;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 1000) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.divider}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      {/* Avatar content */}
      <View
        style={{
          position: "absolute",
          top: strokeWidth,
          left: strokeWidth,
          right: strokeWidth,
          bottom: strokeWidth,
          borderRadius: (size - strokeWidth * 2) / 2,
          backgroundColor: Colors.surfaceSecondary,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: size * 0.4, color: Colors.textPrimary, fontWeight: "600" }}>
          {initial}
        </Text>
      </View>
    </View>
  );
};

export default function CoachScreen() {
  const driverScore = useDriverScore();
  const onboardingData = useOnboardingData();
  const [selectedTab, setSelectedTab] = useState<"city" | "country" | "challenges">("city");
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "alltime">("week");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const userName = onboardingData ? `${onboardingData.firstName} ${onboardingData.lastName}` : "You";
  const userScore = driverScore?.overall || 882;
  const leaderboard = generateMockLeaderboard(userScore, userName, selectedTab === "city" ? "city" : "country");

  const openUserProfile = (user: any) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h1.fontSize,
              fontWeight: Typography.h1.fontWeight,
              color: Colors.textPrimary,
              marginBottom: Spacing.xs,
            }}
          >
            Community
          </Text>
          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textSecondary,
            }}
          >
            Compete, challenge, and connect with other drivers
          </Text>
        </View>

        {/* Tab Selector */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: Colors.surfaceSecondary,
              borderRadius: BorderRadius.pill,
              padding: Spacing.xs,
            }}
          >
            <Pressable
              onPress={() => setSelectedTab("city")}
              style={{
                flex: 1,
                paddingVertical: Spacing.md,
                alignItems: "center",
                backgroundColor: selectedTab === "city" ? Colors.primary : "transparent",
                borderRadius: BorderRadius.pill,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  fontWeight: "600",
                  color: selectedTab === "city" ? Colors.textPrimary : Colors.textSecondary,
                }}
              >
                City
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedTab("country")}
              style={{
                flex: 1,
                paddingVertical: Spacing.md,
                alignItems: "center",
                backgroundColor: selectedTab === "country" ? Colors.primary : "transparent",
                borderRadius: BorderRadius.pill,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  fontWeight: "600",
                  color: selectedTab === "country" ? Colors.textPrimary : Colors.textSecondary,
                }}
              >
                Country
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedTab("challenges")}
              style={{
                flex: 1,
                paddingVertical: Spacing.md,
                alignItems: "center",
                backgroundColor: selectedTab === "challenges" ? Colors.primary : "transparent",
                borderRadius: BorderRadius.pill,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.bodySmall.fontSize,
                  fontWeight: "600",
                  color: selectedTab === "challenges" ? Colors.textPrimary : Colors.textSecondary,
                }}
              >
                Challenges
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Leaderboard Tab (City & Country) */}
        {(selectedTab === "city" || selectedTab === "country") && (
          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
            {/* Time Period Selector */}
            <View style={{ flexDirection: "row", marginBottom: Spacing.lg, gap: Spacing.sm }}>
              <Pressable
                onPress={() => setTimePeriod("week")}
                style={{
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.sm,
                  backgroundColor: timePeriod === "week" ? Colors.primary : Colors.surfaceSecondary,
                  borderRadius: BorderRadius.pill,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    fontWeight: "600",
                    color: timePeriod === "week" ? Colors.textPrimary : Colors.textSecondary,
                  }}
                >
                  This Week
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTimePeriod("month")}
                style={{
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.sm,
                  backgroundColor: timePeriod === "month" ? Colors.primary : Colors.surfaceSecondary,
                  borderRadius: BorderRadius.pill,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    fontWeight: "600",
                    color: timePeriod === "month" ? Colors.textPrimary : Colors.textSecondary,
                  }}
                >
                  This Month
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTimePeriod("alltime")}
                style={{
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.sm,
                  backgroundColor: timePeriod === "alltime" ? Colors.primary : Colors.surfaceSecondary,
                  borderRadius: BorderRadius.pill,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.bodySmall.fontSize,
                    fontWeight: "600",
                    color: timePeriod === "alltime" ? Colors.textPrimary : Colors.textSecondary,
                  }}
                >
                  All Time
                </Text>
              </Pressable>
            </View>

            {/* Leaderboard List */}
            {leaderboard.slice(0, 15).map((user) => {
              const scoreColor = getScoreColor(user.score);
              
              return (
                <Pressable
                  key={user.id}
                  onPress={() => openUserProfile(user)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: Spacing.md,
                    marginBottom: Spacing.xs,
                    backgroundColor: user.isCurrentUser ? Colors.primary + "15" : Colors.surface,
                    borderRadius: BorderRadius.medium,
                    borderWidth: user.isCurrentUser ? 2 : 0,
                    borderColor: user.isCurrentUser ? Colors.primary : "transparent",
                    ...Shadow.subtle,
                  }}
                >
                  {/* Rank */}
                  <View style={{ width: 32, alignItems: "center" }}>
                    {user.rank <= 3 ? (
                      <Ionicons
                        name="trophy"
                        size={20}
                        color={user.rank === 1 ? "#FFD700" : user.rank === 2 ? "#C0C0C0" : "#CD7F32"}
                      />
                    ) : (
                      <Text
                        style={{
                          fontSize: Typography.body.fontSize,
                          fontWeight: "600",
                          color: user.isCurrentUser ? Colors.primary : Colors.textSecondary,
                        }}
                      >
                        {user.rank}
                      </Text>
                    )}
                  </View>

                  {/* Avatar with circular progress */}
                  <View style={{ marginLeft: Spacing.sm }}>
                    <CircularProgressAvatar 
                      initial={user.name.charAt(0)} 
                      score={user.score} 
                      size={42} 
                    />
                  </View>

                  {/* User Info */}
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text
                      style={{
                        fontSize: Typography.bodySmall.fontSize,
                        fontWeight: user.isCurrentUser ? "600" : "500",
                        color: Colors.textPrimary,
                      }}
                    >
                      {user.name}
                      {user.isCurrentUser && " (You)"}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                      <Ionicons name="flame" size={12} color={Colors.warning} />
                      <Text
                        style={{
                          fontSize: Typography.caption.fontSize,
                          color: Colors.textSecondary,
                          marginLeft: 4,
                        }}
                      >
                        {user.streak} days
                      </Text>
                    </View>
                  </View>

                  {/* Score */}
                  <View
                    style={{
                      paddingHorizontal: Spacing.md,
                      paddingVertical: Spacing.xs,
                      backgroundColor: scoreColor + "20",
                      borderRadius: BorderRadius.pill,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.bodySmall.fontSize,
                        fontWeight: "700",
                        color: scoreColor,
                      }}
                    >
                      {user.score}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Challenges Tab */}
        {selectedTab === "challenges" && (
          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}>
            {mockChallenges.map((challenge) => (
              <View
                key={challenge.id}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.medium,
                  padding: Spacing.lg,
                  marginBottom: Spacing.lg,
                  ...Shadow.subtle,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.md }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: Colors.primary + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: Spacing.md,
                    }}
                  >
                    <Ionicons name={challenge.icon as any} size={24} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: Typography.h3.fontSize,
                        fontWeight: "600",
                        color: Colors.textPrimary,
                        marginBottom: Spacing.xs,
                      }}
                    >
                      {challenge.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: Typography.bodySmall.fontSize,
                        color: Colors.textSecondary,
                        marginBottom: Spacing.sm,
                      }}
                    >
                      {challenge.description}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="gift-outline" size={16} color={Colors.primary} />
                        <Text
                          style={{
                            fontSize: Typography.caption.fontSize,
                            color: Colors.primary,
                            fontWeight: "600",
                            marginLeft: Spacing.xs,
                          }}
                        >
                          {challenge.reward}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                        <Text
                          style={{
                            fontSize: Typography.caption.fontSize,
                            color: Colors.textSecondary,
                            marginLeft: Spacing.xs,
                          }}
                        >
                          {challenge.expiresIn}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Progress Bar */}
                <View>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: Colors.divider,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${(challenge.progress / challenge.total) * 100}%`,
                        backgroundColor: Colors.primary,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: Typography.caption.fontSize,
                      color: Colors.textSecondary,
                      marginTop: Spacing.xs,
                    }}
                  >
                    {challenge.progress} / {challenge.total} completed
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* User Profile Modal */}
        <Modal
          visible={showUserProfile}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowUserProfile(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View
              style={{
                backgroundColor: Colors.background,
                borderTopLeftRadius: BorderRadius.large,
                borderTopRightRadius: BorderRadius.large,
                paddingTop: Spacing.xl,
                paddingBottom: Spacing.xxl,
                paddingHorizontal: Spacing.xl,
                maxHeight: "80%",
              }}
            >
              {/* Close Button */}
              <Pressable
                onPress={() => setShowUserProfile(false)}
                style={{ position: "absolute", top: Spacing.lg, right: Spacing.lg, zIndex: 10 }}
              >
                <Ionicons name="close-circle" size={32} color={Colors.textSecondary} />
              </Pressable>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedUser && (
                  <>
                    {/* Avatar */}
                    <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
                      <View style={{ marginBottom: Spacing.md }}>
                        <CircularProgressAvatar 
                          initial={selectedUser.name.charAt(0)} 
                          score={selectedUser.score} 
                          size={100} 
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: Typography.h2.fontSize,
                          fontWeight: "700",
                          color: Colors.textPrimary,
                          marginBottom: Spacing.xs,
                        }}
                      >
                        {selectedUser.name}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: Spacing.lg,
                          paddingVertical: Spacing.sm,
                          backgroundColor: getScoreColor(selectedUser.score) + "20",
                          borderRadius: BorderRadius.pill,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: Typography.h3.fontSize,
                            fontWeight: "700",
                            color: getScoreColor(selectedUser.score),
                          }}
                        >
                          Score: {selectedUser.score}
                        </Text>
                      </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={{ flexDirection: "row", marginBottom: Spacing.xl, gap: Spacing.md }}>
                      {/* Member Since */}
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: Colors.surface,
                          borderRadius: BorderRadius.medium,
                          padding: Spacing.lg,
                          alignItems: "center",
                          ...Shadow.subtle,
                        }}
                      >
                        <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
                        <Text
                          style={{
                            fontSize: Typography.h3.fontSize,
                            fontWeight: "700",
                            color: Colors.textPrimary,
                            marginTop: Spacing.sm,
                          }}
                        >
                          {selectedUser.memberSince.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </Text>
                        <Text
                          style={{
                            fontSize: Typography.caption.fontSize,
                            color: Colors.textSecondary,
                            marginTop: Spacing.xs,
                          }}
                        >
                          Member Since
                        </Text>
                      </View>

                      {/* Streak */}
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: Colors.surface,
                          borderRadius: BorderRadius.medium,
                          padding: Spacing.lg,
                          alignItems: "center",
                          ...Shadow.subtle,
                        }}
                      >
                        <Ionicons name="flame" size={24} color={Colors.warning} />
                        <Text
                          style={{
                            fontSize: Typography.h3.fontSize,
                            fontWeight: "700",
                            color: Colors.textPrimary,
                            marginTop: Spacing.sm,
                          }}
                        >
                          {selectedUser.streak}
                        </Text>
                        <Text
                          style={{
                            fontSize: Typography.caption.fontSize,
                            color: Colors.textSecondary,
                            marginTop: Spacing.xs,
                          }}
                        >
                          Day Streak
                        </Text>
                      </View>
                    </View>

                    {/* Car Display */}
                    <View
                      style={{
                        backgroundColor: Colors.surface,
                        borderRadius: BorderRadius.medium,
                        padding: Spacing.lg,
                        marginBottom: Spacing.lg,
                        overflow: "hidden",
                        ...Shadow.subtle,
                      }}
                    >
                      <Image
                        source={{ uri: getCarImageUrl(selectedUser.car.make, selectedUser.car.model, selectedUser.car.year) }}
                        style={{
                          width: "100%",
                          height: 180,
                          borderRadius: BorderRadius.small,
                          backgroundColor: Colors.surfaceSecondary,
                        }}
                        resizeMode="cover"
                      />
                      <Text
                        style={{
                          fontSize: Typography.h3.fontSize,
                          fontWeight: "700",
                          color: Colors.textPrimary,
                          marginTop: Spacing.md,
                          textAlign: "center",
                        }}
                      >
                        {selectedUser.car.year} {selectedUser.car.make} {selectedUser.car.model}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: Spacing.sm,
                        }}
                      >
                        <Ionicons name="car-sport" size={16} color={Colors.textSecondary} />
                        <Text
                          style={{
                            fontSize: Typography.bodySmall.fontSize,
                            color: Colors.textSecondary,
                            marginLeft: Spacing.xs,
                          }}
                        >
                          Primary Vehicle
                        </Text>
                      </View>
                    </View>

                    {/* Level Card */}
                    <View
                      style={{
                        backgroundColor: Colors.primary + "15",
                        borderRadius: BorderRadius.medium,
                        padding: Spacing.lg,
                        marginBottom: Spacing.lg,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View>
                          <Text
                            style={{
                              fontSize: Typography.bodySmall.fontSize,
                              color: Colors.textSecondary,
                              marginBottom: Spacing.xs,
                            }}
                          >
                            Driver Level
                          </Text>
                          <Text
                            style={{
                              fontSize: Typography.h2.fontSize,
                              fontWeight: "700",
                              color: Colors.primary,
                            }}
                          >
                            Level {calculateLevel(selectedUser.totalTrips).level}
                          </Text>
                          <Text
                            style={{
                              fontSize: Typography.body.fontSize,
                              fontWeight: "600",
                              color: Colors.textPrimary,
                              marginTop: Spacing.xs,
                            }}
                          >
                            {calculateLevel(selectedUser.totalTrips).title}
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: Colors.primary,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons name="trophy" size={32} color={Colors.textPrimary} />
                        </View>
                      </View>
                      <Text
                        style={{
                          fontSize: Typography.bodySmall.fontSize,
                          color: Colors.textSecondary,
                          marginTop: Spacing.md,
                        }}
                      >
                        {selectedUser.totalTrips} total trips completed
                      </Text>
                    </View>

                    {/* Achievements */}
                    <View>
                      <Text
                        style={{
                          fontSize: Typography.h3.fontSize,
                          fontWeight: "600",
                          color: Colors.textPrimary,
                          marginBottom: Spacing.md,
                        }}
                      >
                        Achievements
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}>
                        {mockAchievements.slice(0, 3).map((achievement) => (
                          <View
                            key={achievement.id}
                            style={{
                              width: "31%",
                              aspectRatio: 1,
                              backgroundColor: achievement.unlocked ? Colors.surface : Colors.surfaceSecondary,
                              borderRadius: BorderRadius.medium,
                              padding: Spacing.sm,
                              justifyContent: "center",
                              alignItems: "center",
                              opacity: achievement.unlocked ? 1 : 0.5,
                              ...Shadow.subtle,
                            }}
                          >
                            <Ionicons name={achievement.icon as any} size={28} color={achievement.color} />
                            <Text
                              style={{
                                fontSize: 10,
                                color: Colors.textPrimary,
                                textAlign: "center",
                                marginTop: Spacing.xs,
                                fontWeight: achievement.unlocked ? "600" : "400",
                              }}
                            >
                              {achievement.title}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

