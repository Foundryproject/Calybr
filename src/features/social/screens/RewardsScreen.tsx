import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Dimensions, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../../../utils/theme";

interface Challenge {
  id: string;
  title: string;
  requirement: string;
  emoji?: string;
  imageUrl?: string;
  useStarIcon?: boolean;
  gradient: string[];
  unlocked: boolean;
  progress?: string;
  currentProgress?: number;
  totalProgress?: number;
}

interface PurchasableReward {
  id: string;
  title: string;
  description: string;
  emoji: string;
  gradient: string[];
  points: number;
  inStock: boolean;
}

const mockChallenges: Challenge[] = [
  {
    id: "c1",
    title: "Free Car Wash",
    requirement: "Do 1 trip without using your phone",
    imageUrl: "https://theragcompany.eu/cdn/shop/articles/DSC08500.jpg?v=1715157054&width=3000",
    gradient: ["#3B82F6", "#2563EB"],
    unlocked: false,
    progress: "0/1 trips",
    currentProgress: 0,
    totalProgress: 1,
  },
  {
    id: "c2",
    title: "Get 500 Calybr Points",
    requirement: "Share Calybr with 5 of your friends",
    useStarIcon: true,
    gradient: ["#FFD60A", "#FFD60A"],
    unlocked: false,
    progress: "3/5 friends",
    currentProgress: 3,
    totalProgress: 5,
  },
  {
    id: "c3",
    title: "Oil Change Voucher",
    requirement: "10 trips above 80 score",
    imageUrl: "https://images.pexels.com/photos/13065690/pexels-photo-13065690.jpeg",
    gradient: ["#F59E0B", "#D97706"],
    unlocked: false,
    progress: "6/10 trips",
    currentProgress: 6,
    totalProgress: 10,
  },
  {
    id: "c4",
    title: "$20 UberEats Voucher",
    requirement: "Do not break speed limits for 100 miles",
    imageUrl: "https://cdn.mos.cms.futurecdn.net/5ij5qdSHFzJ2piPRuoTL5F-1200-80.jpg.webp",
    gradient: ["#10B981", "#059669"],
    unlocked: false,
    progress: "67/100 miles",
    currentProgress: 67,
    totalProgress: 100,
  },
  {
    id: "c5",
    title: "Discounted Monthly Insurance",
    requirement: "Maintain 890+ score for 60 days",
    emoji: "🛡️",
    gradient: ["#06B6D4", "#0891B2"],
    unlocked: false,
    progress: "12/60 days",
    currentProgress: 12,
    totalProgress: 60,
  },
  {
    id: "c6",
    title: "Tree Planted in Your Name",
    requirement: "Drive 200 miles minimal idling",
    emoji: "🌳",
    gradient: ["#22C55E", "#16A34A"],
    unlocked: true,
    progress: "200/200 miles",
    currentProgress: 200,
    totalProgress: 200,
  },
];

const mockPurchasableRewards: PurchasableReward[] = [
  {
    id: "pr1",
    title: "$5 Coffee Card",
    description: "Starbucks gift card",
    emoji: "☕",
    gradient: ["#8B4513", "#654321"],
    points: 250,
    inStock: true,
  },
  {
    id: "pr2",
    title: "$10 Gas Card",
    description: "Shell or BP",
    emoji: "⛽",
    gradient: ["#EF4444", "#DC2626"],
    points: 500,
    inStock: true,
  },
  {
    id: "pr3",
    title: "$25 Restaurant Card",
    description: "Choice of restaurant",
    emoji: "🍽️",
    gradient: ["#EC4899", "#DB2777"],
    points: 1250,
    inStock: true,
  },
  {
    id: "pr4",
    title: "Car Accessories",
    description: "Phone mount, charger",
    emoji: "📱",
    gradient: ["#6366F1", "#4F46E5"],
    points: 750,
    inStock: true,
  },
  {
    id: "pr5",
    title: "$50 Amazon Card",
    description: "Amazon gift card",
    emoji: "🎁",
    gradient: ["#F59E0B", "#D97706"],
    points: 2500,
    inStock: true,
  },
  {
    id: "pr6",
    title: "Premium Car Wash",
    description: "Full detail service",
    emoji: "✨",
    gradient: ["#8B5CF6", "#7C3AED"],
    points: 1000,
    inStock: false,
  },
];

const screenWidth = Dimensions.get("window").width;
const cardWidth = (screenWidth - Spacing.xl * 3) / 2;

export default function RewardsScreen() {
  const [activeTab, setActiveTab] = useState<"challenges" | "rewards">("challenges");
  const totalPoints = 1850; // Mock total points available

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
            Rewards
          </Text>
          <Text
            style={{
              fontSize: Typography.bodySmall.fontSize,
              color: Colors.textSecondary,
              marginBottom: Spacing.xl,
            }}
          >
            Complete challenges and redeem rewards
          </Text>
        </View>

        {/* Calybr Points Card */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          <View
            style={{
              backgroundColor: Colors.primary,
              borderRadius: BorderRadius.large,
              padding: Spacing.xl,
              ...Shadow.medium,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
              <Ionicons name="star" size={24} color={Colors.textPrimary} style={{ marginRight: Spacing.sm }} />
              <Text
                style={{
                  fontSize: Typography.h3.fontSize,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                }}
              >
                Calybr Points
              </Text>
            </View>
            <Text
              style={{
                fontSize: 56,
                fontWeight: "700",
                color: Colors.textPrimary,
                letterSpacing: -1,
              }}
            >
              {totalPoints}
            </Text>
            <Text
              style={{
                fontSize: Typography.bodySmall.fontSize,
                color: Colors.textPrimary,
                opacity: 0.9,
                marginTop: Spacing.xs,
              }}
            >
              {activeTab === "challenges" ? "Complete challenges to earn more" : "Use points to redeem rewards"}
            </Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.pill,
              padding: 4,
              flexDirection: "row",
              ...Shadow.subtle,
            }}
          >
            <Pressable
              onPress={() => setActiveTab("challenges")}
              style={{
                flex: 1,
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.pill,
                backgroundColor: activeTab === "challenges" ? Colors.primary : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  fontWeight: "700",
                  color: activeTab === "challenges" ? Colors.textPrimary : Colors.textSecondary,
                }}
              >
                Challenges
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("rewards")}
              style={{
                flex: 1,
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.pill,
                backgroundColor: activeTab === "rewards" ? Colors.primary : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: Typography.body.fontSize,
                  fontWeight: "700",
                  color: activeTab === "rewards" ? Colors.textPrimary : Colors.textSecondary,
                }}
              >
                Rewards
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content Grid */}
        <View style={{ paddingHorizontal: Spacing.xl }}>
          <Text
            style={{
              fontSize: Typography.h3.fontSize,
              fontWeight: "600",
              color: Colors.textPrimary,
              marginBottom: Spacing.lg,
            }}
          >
            {activeTab === "challenges" ? "Available Challenges" : "Redeem Rewards"}
          </Text>

          {/* Challenges Tab */}
          {activeTab === "challenges" && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: Spacing.md,
              }}
            >
              {mockChallenges.map((challenge) => {
                const progressPercentage = challenge.currentProgress && challenge.totalProgress
                  ? (challenge.currentProgress / challenge.totalProgress) * 100
                  : 0;

                return (
                  <Pressable
                    key={challenge.id}
                    style={{
                      width: cardWidth,
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.large,
                      overflow: "hidden",
                      opacity: challenge.unlocked ? 1 : 0.95,
                      borderWidth: challenge.unlocked ? 2 : 0,
                      borderColor: challenge.unlocked ? Colors.success : "transparent",
                      ...Shadow.medium,
                    }}
                  >
                    {/* Challenge Image/Emoji */}
                    <View
                      style={{
                        height: 120,
                        backgroundColor: challenge.gradient[0],
                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative",
                      }}
                    >
                      {/* Background Image or Gradient */}
                      {challenge.imageUrl ? (
                        <>
                          <Image
                            source={{ uri: challenge.imageUrl }}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              width: "100%",
                              height: "100%",
                            }}
                            resizeMode="cover"
                          />
                          {/* Dark overlay for locked state */}
                          {!challenge.unlocked && (
                            <View
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                              }}
                            />
                          )}
                        </>
                      ) : challenge.useStarIcon ? (
                        <>
                          {/* Yellow background for Calybr Points */}
                          <View
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: challenge.gradient[0],
                            }}
                          />
                        </>
                      ) : (
                        <>
                          {/* Gradient overlay effect */}
                          <View
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: challenge.gradient[1],
                              opacity: 0.3,
                            }}
                          />
                        </>
                      )}
                      
                      {/* Content: Star Icon, Emoji, or Lock Icon */}
                      {challenge.unlocked ? (
                        challenge.useStarIcon ? (
                          <Ionicons name="star" size={64} color="#1C1C1E" style={{ zIndex: 1 }} />
                        ) : challenge.emoji ? (
                          <Text style={{ fontSize: 64, zIndex: 1 }}>{challenge.emoji}</Text>
                        ) : null
                      ) : (
                        challenge.useStarIcon ? (
                          <View
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: 40,
                              backgroundColor: "rgba(28, 28, 30, 0.15)",
                              justifyContent: "center",
                              alignItems: "center",
                              zIndex: 1,
                            }}
                          >
                            <Ionicons name="star" size={48} color="#1C1C1E" style={{ opacity: 0.4 }} />
                          </View>
                        ) : (
                          <View
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 32,
                              backgroundColor: "rgba(255, 255, 255, 0.2)",
                              justifyContent: "center",
                              alignItems: "center",
                              zIndex: 1,
                            }}
                          >
                            <Ionicons name="lock-closed" size={32} color="rgba(255, 255, 255, 0.9)" />
                          </View>
                        )
                      )}

                      {/* Unlocked Badge */}
                      {challenge.unlocked && (
                        <View
                          style={{
                            position: "absolute",
                            top: Spacing.sm,
                            right: Spacing.sm,
                            backgroundColor: Colors.success,
                            paddingVertical: 4,
                            paddingHorizontal: Spacing.sm,
                            borderRadius: BorderRadius.pill,
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: "#FFFFFF",
                            }}
                          >
                            COMPLETED
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Content Section */}
                    <View style={{ padding: Spacing.md }}>
                      {/* Challenge Title */}
                      <Text
                        style={{
                          fontSize: Typography.body.fontSize,
                          fontWeight: "700",
                          color: Colors.textPrimary,
                          marginBottom: Spacing.xs,
                          lineHeight: 20,
                        }}
                      >
                        {challenge.title}
                      </Text>

                      {/* Requirement */}
                      <Text
                        style={{
                          fontSize: Typography.caption.fontSize,
                          color: Colors.textSecondary,
                          marginBottom: Spacing.md,
                          lineHeight: 16,
                          minHeight: 32,
                        }}
                      >
                        {challenge.requirement}
                      </Text>

                      {/* Progress Section */}
                      {challenge.progress && (
                        <View>
                          {/* Progress Bar */}
                          <View
                            style={{
                              height: 6,
                              backgroundColor: Colors.divider,
                              borderRadius: 3,
                              overflow: "hidden",
                              marginBottom: Spacing.xs,
                            }}
                          >
                            <View
                              style={{
                                height: 6,
                                backgroundColor: challenge.unlocked ? Colors.success : challenge.gradient[0],
                                width: `${progressPercentage}%`,
                              }}
                            />
                          </View>
                          
                          {/* Progress Text */}
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: challenge.unlocked ? Colors.success : Colors.textSecondary,
                            }}
                          >
                            {challenge.progress}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Rewards Tab */}
          {activeTab === "rewards" && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: Spacing.md,
              }}
            >
              {mockPurchasableRewards.map((reward) => {
                const canAfford = totalPoints >= reward.points;

                return (
                  <Pressable
                    key={reward.id}
                    style={{
                      width: cardWidth,
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.large,
                      overflow: "hidden",
                      opacity: reward.inStock ? 1 : 0.6,
                      ...Shadow.medium,
                    }}
                  >
                    {/* Reward Image/Emoji */}
                    <View
                      style={{
                        height: 120,
                        backgroundColor: reward.gradient[0],
                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative",
                      }}
                    >
                      {/* Gradient overlay effect */}
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: reward.gradient[1],
                          opacity: 0.3,
                        }}
                      />
                      
                      <Text style={{ fontSize: 64 }}>{reward.emoji}</Text>

                      {/* Out of Stock Badge */}
                      {!reward.inStock && (
                        <View
                          style={{
                            position: "absolute",
                            top: Spacing.sm,
                            right: Spacing.sm,
                            backgroundColor: Colors.error,
                            paddingVertical: 4,
                            paddingHorizontal: Spacing.sm,
                            borderRadius: BorderRadius.pill,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: "#FFFFFF",
                            }}
                          >
                            OUT OF STOCK
                          </Text>
                        </View>
                      )}

                      {/* Points Badge */}
                      <View
                        style={{
                          position: "absolute",
                          top: Spacing.sm,
                          left: Spacing.sm,
                          backgroundColor: "rgba(0, 0, 0, 0.5)",
                          paddingVertical: 4,
                          paddingHorizontal: Spacing.sm,
                          borderRadius: BorderRadius.pill,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="star" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: "#FFFFFF",
                          }}
                        >
                          {reward.points}
                        </Text>
                      </View>
                    </View>

                    {/* Content Section */}
                    <View style={{ padding: Spacing.md }}>
                      {/* Reward Title */}
                      <Text
                        style={{
                          fontSize: Typography.body.fontSize,
                          fontWeight: "700",
                          color: Colors.textPrimary,
                          marginBottom: Spacing.xs,
                          lineHeight: 20,
                        }}
                      >
                        {reward.title}
                      </Text>

                      {/* Description */}
                      <Text
                        style={{
                          fontSize: Typography.caption.fontSize,
                          color: Colors.textSecondary,
                          marginBottom: Spacing.md,
                          lineHeight: 16,
                          minHeight: 32,
                        }}
                      >
                        {reward.description}
                      </Text>

                      {/* Redeem Button */}
                      <Pressable
                        disabled={!canAfford || !reward.inStock}
                        style={{
                          backgroundColor: canAfford && reward.inStock ? Colors.primary : Colors.divider,
                          paddingVertical: Spacing.sm,
                          borderRadius: BorderRadius.pill,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: Typography.caption.fontSize,
                            fontWeight: "700",
                            color: canAfford && reward.inStock ? Colors.textPrimary : Colors.textTertiary,
                          }}
                        >
                          {!reward.inStock ? "Out of Stock" : canAfford ? "Redeem" : `Need ${reward.points - totalPoints} more`}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
