# 🗺️ Calybr Project Map

> **Quick reference guide to find anything in the project**

---

## 📁 Top-Level Structure

```
calybr/
├── 📱 App Code
│   ├── src/              → All application code
│   ├── App.tsx           → App entry point
│   └── index.ts          → Root file
│
├── 🗄️ Backend
│   └── supabase/         → Database, functions, migrations
│
├── 📦 Assets
│   └── assets/           → Images, icons, splash screens
│
├── 📱 Native
│   ├── ios/              → iOS native code
│   └── android/          → Android native code (future)
│
├── 📚 Documentation
│   ├── docs/             → All documentation files
│   ├── README.md         → Project overview
│   └── PROJECT_MAP.md    → This file
│
├── 🔧 Scripts
│   └── scripts/          → Utility scripts
│
├── ⚙️ Configuration
│   ├── package.json      → Dependencies & scripts
│   ├── tsconfig.json     → TypeScript config
│   ├── app.json          → Expo config
│   ├── eas.json          → Build config
│   └── [other configs]   → Babel, ESLint, Metro, Tailwind
│
└── 📦 Dependencies
    └── node_modules/     → Installed packages
```

---

## 🎯 Quick Find Guide

### "I need to..."

#### **Find a Screen**
→ `src/screens/`
- Auth: `SignUpScreen.tsx`, `OnboardingScreen.tsx`, `ProfileScreen.tsx`
- Trips: `TripsScreen.tsx`, `TripDetailScreen.tsx`, `ActiveTripScreen.tsx`
- Drive: `DriveScreen.tsx`
- Score: `ScoreDetailsScreen.tsx`, `HomeScreen.tsx`
- Social: `CoachScreen.tsx`, `RewardsScreen.tsx`

#### **Find Business Logic / API Calls**
→ `src/services/`
- Auth: `auth.service.ts`
- Trips: `trips.service.ts`, `trip-tracker.ts`
- Location: `auto-trip-detection.service.ts`, `background-location.service.ts`
- Scores: `scores.service.ts`
- Social: `leaderboard.service.ts`

#### **Find a UI Component**
→ `src/components/`
- `ScoreGauge.tsx`
- `LocationPermissionModal.tsx`

#### **Find State Management**
→ `src/state/driveStore.ts` (Zustand store)

#### **Find Navigation**
→ `src/navigation/MainNavigator.tsx`

#### **Find AI Integration**
→ `src/api/`
- `anthropic.ts` (Claude)
- `openai.ts` (GPT)
- `grok.ts` (Grok)
- `chat-service.ts` (Unified interface)

#### **Find Types / Interfaces**
→ `src/types/`
- `drive.ts` - Trip, location, drive types
- `ai.ts` - AI service types

#### **Find Utilities**
→ `src/utils/`
- `theme.ts` - Colors, typography, spacing
- `mockData.ts` - Test data
- `cn.ts` - CSS utilities

#### **Find Database Schema**
→ `supabase/migrations/`

#### **Find Backend Functions**
→ `supabase/functions/`
- `ingest-telemetry/` - Process trip data
- `trips-finalize/` - Calculate scores

#### **Find Documentation**
→ `docs/`
- Project organization: `docs/PROJECT_ORGANIZATION.md`
- Backend docs: `docs/backend/`
- Doc index: `docs/README.md`

#### **Find Scripts**
→ `scripts/`
- `generate-test-trip.ts`
- `seed-weights.ts`

---

## 📖 Import Guide

### All exports available from `src/index.ts`:

```typescript
// Screens
import { TripsScreen, SignUpScreen, ProfileScreen } from './src';

// Services
import { signUpWithEmail, getUserTrips, autoTripManager } from './src';

// Components
import { ScoreGauge, LocationPermissionModal } from './src';

// State
import { useUser, useTrips, useDriveStore } from './src';

// Utils
import { Colors, Typography, Spacing } from './src';

// Types
import type { Trip, User, DriverScore } from './src';
```

See `src/index.ts` for complete export list.

---

## 🔍 Search Tips

### By File Name
```bash
# Find any file
find . -name "TripsScreen.tsx"

# Find all services
find src/services -name "*.ts"
```

### By Content
```bash
# Find where something is used
grep -r "useUser" src/

# Find function definition
grep -r "export const getUserTrips" src/
```

### By Feature Domain

| Feature | Screens | Services | Components |
|---------|---------|----------|------------|
| **Auth** | `SignUpScreen`, `OnboardingScreen`, `ProfileScreen`, `SettingsScreen` | `auth.service.ts` | - |
| **Trips** | `TripsScreen`, `TripDetailScreen`, `TripSummaryScreen`, `ActiveTripScreen` | `trips.service.ts`, `trip-tracker.ts` | - |
| **Location** | `DriveScreen`, `BackgroundLocationTestScreen` | `auto-trip-detection.service.ts`, `background-location.service.ts` | `LocationPermissionModal` |
| **Scoring** | `ScoreDetailsScreen`, `HomeScreen` | `scores.service.ts` | `ScoreGauge` |
| **Social** | `CoachScreen`, `RewardsScreen` | `leaderboard.service.ts` | - |
| **AI** | - | `src/api/*` | - |

---

## 📱 App Flow

```
App.tsx
  ↓
Is authenticated?
  ├─ No → SignUpScreen
  └─ Yes → Has completed onboarding?
            ├─ No → OnboardingScreen
            └─ Yes → MainNavigator (Tabs)
                      ├─ TripsTab
                      ├─ CoachTab (Community)
                      ├─ DriveTab
                      ├─ RewardsTab
                      └─ ProfileTab
```

---

## 🗄️ Backend Structure

```
supabase/
├── functions/           # Edge Functions
│   ├── _shared/         # Shared utilities
│   │   ├── score.ts     # Scoring algorithms
│   │   ├── events.ts    # Event detection
│   │   └── features.ts  # Feature extraction
│   ├── ingest-telemetry/  # Process real-time data
│   └── trips-finalize/    # Calculate final scores
│
└── migrations/          # Database schema
    ├── 20251019_001_init_schema.sql
    └── 20251020_002_update_profile_schema.sql
```

---

## 🎨 Design System

All design tokens in `src/utils/theme.ts`:

- **Colors**: Primary, text, status, score colors
- **Typography**: Font sizes, weights, line heights
- **Spacing**: xs (4), sm (8), md (12), lg (16), xl (24), xxl (32)
- **Border Radius**: small (8), medium (12), large (16), pill (24)
- **Shadows**: subtle, medium

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies & npm scripts |
| `app.json` | Expo configuration |
| `eas.json` | EAS Build configuration |
| `tsconfig.json` | TypeScript compiler options |
| `babel.config.js` | Babel transpiler config |
| `eslint.config.js` | Linting rules |
| `metro.config.js` | Metro bundler config |
| `tailwind.config.js` | Tailwind CSS config |

---

## 📚 Further Reading

- [PROJECT_ORGANIZATION.md](./docs/PROJECT_ORGANIZATION.md) - Complete organization guide
- [Backend README](./docs/backend/README.md) - Backend documentation
- [Main README](./README.md) - Project overview

---

**Questions?** Check the docs or ask the team!

**Last Updated**: 2024-10-28

