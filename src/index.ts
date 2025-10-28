/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                          ║
 * ║                        CALYBR - MAIN EXPORT INDEX                        ║
 * ║                                                                          ║
 * ║  Centralized exports for all app modules organized by domain            ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * TABLE OF CONTENTS:
 * ═════════════════
 *
 * 1. SCREENS
 *    ├─ 1.1 Authentication & Onboarding
 *    ├─ 1.2 Trips & Driving
 *    ├─ 1.3 Scoring & Performance
 *    ├─ 1.4 Community & Rewards
 *    └─ 1.5 Developer Tools
 *
 * 2. SERVICES
 *    ├─ 2.1 Authentication
 *    ├─ 2.2 Trip Management
 *    ├─ 2.3 Location & Tracking
 *    ├─ 2.4 Scoring & Analytics
 *    └─ 2.5 Social & Leaderboard
 *
 * 3. COMPONENTS
 *    ├─ 3.1 UI Components
 *    └─ 3.2 Feature Components
 *
 * 4. STATE MANAGEMENT
 *    └─ 4.1 Global State (Zustand)
 *
 * 5. NAVIGATION
 *    └─ 5.1 Main Navigator
 *
 * 6. AI & API SERVICES
 *    ├─ 6.1 AI Providers
 *    └─ 6.2 AI Services
 *
 * 7. TYPES & INTERFACES
 *    ├─ 7.1 AI Types
 *    └─ 7.2 Drive Types
 *
 * 8. UTILITIES
 *    ├─ 8.1 Theme System
 *    ├─ 8.2 Mock Data
 *    └─ 8.3 CSS Utilities
 *
 * 9. DATABASE & BACKEND
 *    └─ 9.1 Supabase Client
 *
 * 10. FEATURE BUNDLES
 *     ├─ 10.1 Auth Bundle
 *     ├─ 10.2 Trips Bundle
 *     ├─ 10.3 Location Bundle
 *     ├─ 10.4 Scoring Bundle
 *     ├─ 10.5 Community Bundle
 *     └─ 10.6 AI Bundle
 *
 * 11. USAGE EXAMPLES
 *
 */

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                             1. SCREENS                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// 1.1 Authentication & Onboarding
// ─────────────────────────────────────────────────────────────────────────────
export { SignUpScreen, OnboardingScreen, ProfileScreen, SettingsScreen } from "./features/auth";

// ─────────────────────────────────────────────────────────────────────────────
// 1.2 Trips & Driving
// ─────────────────────────────────────────────────────────────────────────────
export { TripsScreen, TripDetailScreen, TripSummaryScreen, ActiveTripScreen } from "./features/trips";
export { DriveScreen } from "./features/location";

// ─────────────────────────────────────────────────────────────────────────────
// 1.3 Scoring & Performance
// ─────────────────────────────────────────────────────────────────────────────
export { ScoreDetailsScreen, HomeScreen } from "./features/scoring";

// ─────────────────────────────────────────────────────────────────────────────
// 1.4 Community & Rewards
// ─────────────────────────────────────────────────────────────────────────────
export { CoachScreen, RewardsScreen } from "./features/social";

// ─────────────────────────────────────────────────────────────────────────────
// 1.5 Developer Tools
// ─────────────────────────────────────────────────────────────────────────────
export { BackgroundLocationTestScreen } from "./features/location";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                            2. SERVICES                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Note: Services are exported from their respective feature modules above
// No need to duplicate exports here

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                       4. STATE MANAGEMENT                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// 4.1 Global State (Zustand)
// ─────────────────────────────────────────────────────────────────────────────

export * from "./state/driveStore";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                          5. NAVIGATION                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// 5.1 Main Navigator
// ─────────────────────────────────────────────────────────────────────────────

export { default as MainNavigator } from "./navigation/MainNavigator";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                       6. AI & API SERVICES                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// 6.1 AI Providers
// ─────────────────────────────────────────────────────────────────────────────
export * from "./api/anthropic";
export * from "./api/openai";
export * from "./api/grok";

// ─────────────────────────────────────────────────────────────────────────────
// 6.2 AI Services
// ─────────────────────────────────────────────────────────────────────────────
export * from "./api/chat-service";
export * from "./api/image-generation";
export * from "./api/transcribe-audio";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                      7. TYPES & INTERFACES                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// 7.1 AI Types
// ─────────────────────────────────────────────────────────────────────────────

export * from "./types/ai";

// ─────────────────────────────────────────────────────────────────────────────
// 7.2 Drive Types
// ─────────────────────────────────────────────────────────────────────────────

export * from "./types/drive";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                           8. UTILITIES                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// 8.1 Theme System (Colors, Typography, Spacing)
// ─────────────────────────────────────────────────────────────────────────────

export * from "./utils/theme";

// ─────────────────────────────────────────────────────────────────────────────
// 8.2 Mock Data (Development)
// ─────────────────────────────────────────────────────────────────────────────

export * from "./utils/mockData";

// ─────────────────────────────────────────────────────────────────────────────
// 8.3 CSS Utilities (Tailwind)
// ─────────────────────────────────────────────────────────────────────────────

export { cn } from "./utils/cn";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                      9. DATABASE & BACKEND                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// 9.1 Supabase Client
// ─────────────────────────────────────────────────────────────────────────────

export * from "./lib/supabase";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                       10. FEATURE BUNDLES                                ║
// ║                    (Organized Exports by Domain)                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Note: Feature bundles provide an alternative way to import related modules.
// Individual exports above are still the recommended approach for most use cases.
//
// Example usage:
//   import * as AuthModules from './src';
//   const SignUpScreen = AuthModules.SignUpScreen;
//
// Or use the individual exports:
//   import { SignUpScreen, signUpWithEmail } from './src';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                       11. USAGE EXAMPLES                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ METHOD 1: Individual Imports                                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 *   import { SignUpScreen, useUser, Colors } from './src';
 *   import { TripsScreen, TripDetailScreen } from './src';
 *   import { autoTripManager, backgroundLocationService } from './src';
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ METHOD 2: Feature Bundle Imports                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 *   import { Auth, Trips, Location, Scoring, AI } from './src';
 *
 *   // Access nested exports
 *   const ProfileScreen = Auth.screens.Profile;
 *   const { signUpWithEmail } = Auth.services;
 *   const { autoManager } = Location.services;
 *   const { chat } = AI.services;
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ METHOD 3: Mixed Imports (Best for clarity)                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 *   import {
 *     // Screens
 *     SignUpScreen,
 *     TripsScreen,
 *
 *     // Services
 *     autoTripManager,
 *     backgroundLocationService,
 *
 *     // State
 *     useUser,
 *     useTrips,
 *
 *     // Utils
 *     Colors,
 *     Typography,
 *   } from './src';
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ QUICK REFERENCE                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 *   Auth    → Authentication, Profile, Settings
 *   Trips   → Trip Management, History, Tracking
 *   Location→ GPS, Auto-Detection, Background Services
 *   Scoring → Driver Scores, Analytics
 *   Community→ Leaderboards, Rewards, Social
 *   AI      → Claude, GPT, Grok integrations
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
