// Calybr Theme Configuration

export const Colors = {
  primary: "#FFC44C", // Sunny amber
  primaryLight: "#FFD980",
  primaryDark: "#E6AB2E",
  
  // Surfaces
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceSecondary: "#F9F9F9",
  
  // Text
  textPrimary: "#000000",
  textSecondary: "#666666",
  textTertiary: "#999999",
  
  // Status colors
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  
  // Dividers & borders
  divider: "rgba(0, 0, 0, 0.06)",
  border: "rgba(0, 0, 0, 0.1)",
  
  // Score status colors
  scoreGreat: "#34C759",
  scoreGood: "#FFC44C",
  scoreNeedsFocus: "#FF9500",
  scorePoor: "#FF3B30",
};

export const Typography = {
  // Font family
  fontFamily: {
    regular: "Inter",
    medium: "Inter-Medium",
    semiBold: "Inter-SemiBold",
    bold: "Inter-Bold",
  },
  
  // Font sizes
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "600" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "500" as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodySmall: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 24,
  circle: 9999,
};

export const Shadow = {
  subtle: {
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
};

// Helper to get score color based on value
// Supports both 0-100 scale (for trips) and 0-1000 scale (for overall score)
export const getScoreColor = (score: number): string => {
  // Auto-detect scale based on value
  const isLargeScale = score > 100;
  const normalizedScore = isLargeScale ? score : score * 10;
  
  if (normalizedScore >= 850) return Colors.scoreGreat;
  if (normalizedScore >= 700) return Colors.scoreGood;
  if (normalizedScore >= 500) return Colors.scoreNeedsFocus;
  return Colors.scorePoor;
};

// Helper to get score status text
// Supports both 0-100 scale (for trips) and 0-1000 scale (for overall score)
export const getScoreStatus = (score: number): string => {
  // Auto-detect scale based on value
  const isLargeScale = score > 100;
  const normalizedScore = isLargeScale ? score : score * 10;
  
  if (normalizedScore >= 850) return "Excellent";
  if (normalizedScore >= 700) return "Good";
  if (normalizedScore >= 500) return "Fair";
  return "Needs Work";
};
