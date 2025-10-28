# 📂 Calybr Project Structure

> Clean, organized, and easy to navigate!

---

## 🗂️ Root Level (What You See First)

```
calybr/
│
├── 📱 CORE APP FILES
│   ├── App.tsx                    Main app entry point
│   ├── index.ts                   Root file
│   └── package.json               Dependencies & scripts
│
├── 📚 DOCUMENTATION (All in one place!)
│   ├── README.md                  📖 Start here - Project overview
│   ├── PROJECT_MAP.md             🗺️  Navigation guide (find anything!)
│   ├── ORGANIZATION_SUMMARY.md    📋 What we organized
│   └── STRUCTURE.md               📂 This file
│
├── 📁 ORGANIZED FOLDERS
│   ├── docs/                      📚 All documentation
│   ├── src/                       📱 Application code
│   ├── supabase/                  🗄️  Backend (database, functions)
│   ├── assets/                    🖼️  Images, icons
│   ├── scripts/                   🔧 Utility scripts
│   └── patches/                   🔨 Package patches
│
└── ⚙️ CONFIG FILES (Stay in root - tools need them)
    ├── app.json                   Expo config
    ├── tsconfig.json              TypeScript config
    ├── babel.config.js            Babel config
    ├── eslint.config.js           Linting rules
    ├── metro.config.js            Metro bundler
    ├── tailwind.config.js         Tailwind CSS
    └── .env.example               Environment template
```

---

## 📚 Documentation Folder (`docs/`)

```
docs/
├── README.md                      Documentation hub & index
├── PROJECT_ORGANIZATION.md        Complete organization guide
│
├── backend/                       Backend-specific docs
│   ├── README.md                  Backend overview
│   ├── QUICKSTART.md              Get started in 5 minutes
│   ├── DEPLOYMENT.md              Deploy to production
│   └── PROJECT_STRUCTURE.md       Backend code structure
│
└── frontend/                      Frontend docs (future)
```

**Why this is better:**
- ✅ All docs in one place
- ✅ Clear separation (backend/frontend)
- ✅ Easy to find anything
- ✅ Hub with quick links

---

## 📱 Application Code (`src/`)

```
src/
├── index.ts                       🎯 Centralized exports (use this!)
│
├── screens/                       📱 All app screens
│   ├── Auth                       SignUpScreen, OnboardingScreen, ProfileScreen
│   ├── Trips                      TripsScreen, TripDetailScreen, TripSummaryScreen
│   ├── Drive                      DriveScreen, ActiveTripScreen
│   ├── Score                      HomeScreen, ScoreDetailsScreen
│   └── Social                     CoachScreen, RewardsScreen
│
├── services/                      🔧 Business logic & API calls
│   ├── auth.service.ts            Authentication
│   ├── trips.service.ts           Trip management
│   ├── scores.service.ts          Score calculation
│   ├── auto-trip-detection.service.ts
│   ├── background-location.service.ts
│   └── leaderboard.service.ts
│
├── components/                    🎨 Reusable UI components
│   ├── ScoreGauge.tsx
│   └── LocationPermissionModal.tsx
│
├── navigation/                    🧭 App navigation
│   └── MainNavigator.tsx
│
├── state/                         💾 Global state (Zustand)
│   └── driveStore.ts
│
├── api/                           🤖 AI integrations
│   ├── anthropic.ts               Claude
│   ├── openai.ts                  GPT
│   ├── grok.ts                    Grok
│   └── chat-service.ts            Unified interface
│
├── types/                         📝 TypeScript types
│   ├── ai.ts
│   └── drive.ts
│
├── utils/                         🛠️  Utilities
│   ├── theme.ts                   Colors, typography, spacing
│   ├── mockData.ts                Test data
│   └── cn.ts                      CSS utilities
│
└── lib/                           📦 Third-party setup
    └── supabase.ts                Supabase client
```

**Import everything from `src/index.ts`:**
```typescript
import { TripsScreen, getUserTrips, Colors } from './src';
```

---

## 🗄️ Backend (`supabase/`)

```
supabase/
├── functions/                     Edge Functions (serverless)
│   ├── _shared/                   Shared utilities
│   │   ├── score.ts               Scoring algorithms
│   │   ├── events.ts              Event detection
│   │   ├── features.ts            Feature extraction
│   │   └── providers/             Map & weather APIs
│   ├── ingest-telemetry/          Process real-time trip data
│   └── trips-finalize/            Calculate final scores
│
├── migrations/                    Database schema
│   ├── 20251019_001_init_schema.sql
│   └── 20251020_002_update_profile_schema.sql
│
├── config.toml                    Supabase config
├── examples.http                  API examples
└── (docs moved to docs/backend/)
```

---

## 🔧 Scripts (`scripts/`)

```
scripts/
├── generate-test-trip.ts          Generate test trip data
└── seed-weights.ts                Seed scoring weights
```

**Before:** These were in `supabase/` (wrong!)  
**Now:** Clean separation of concerns ✅

---

## 🎯 Quick Navigation

### "I want to..."

| Goal | Where to go |
|------|-------------|
| **Find my way around** | `PROJECT_MAP.md` |
| **Read documentation** | `docs/README.md` |
| **Understand organization** | `docs/PROJECT_ORGANIZATION.md` |
| **See this structure** | `STRUCTURE.md` (this file) |
| **Import something** | `src/index.ts` |
| **Find a screen** | `src/screens/` |
| **Find business logic** | `src/services/` |
| **Find backend code** | `supabase/functions/` |
| **Run a script** | `scripts/` |

---

## 📊 Before vs After

### ❌ Before: Messy
- Documentation scattered in root AND supabase folders
- Scripts mixed with backend code
- Duplicate env files
- Hard to find anything
- Confusing for new developers

### ✅ After: Clean
- All docs in `docs/` folder
- Scripts in `scripts/` folder
- Single `.env.example`
- Clear structure
- Easy navigation with `PROJECT_MAP.md`
- Centralized exports in `src/index.ts`

---

## 🚀 Key Features

### 1. **Centralized Documentation** (`docs/`)
Every doc in one place, organized by domain

### 2. **Project Map** (`PROJECT_MAP.md`)
Quick reference guide to find anything

### 3. **Centralized Exports** (`src/index.ts`)
Import everything from one place

### 4. **Clear Separation**
- Code in `src/`
- Backend in `supabase/`
- Scripts in `scripts/`
- Docs in `docs/`

### 5. **Easy Navigation**
Multiple ways to find what you need:
- `PROJECT_MAP.md` for quick lookup
- `docs/README.md` for documentation
- `STRUCTURE.md` for folder structure
- `src/index.ts` for imports

---

## 📖 For New Developers

**Start Here:**
1. Read `README.md` (project overview)
2. Use `PROJECT_MAP.md` (find your way)
3. Follow `docs/PROJECT_ORGANIZATION.md` (complete guide)
4. Import from `src/index.ts` (code organization)

**Everything is organized to help you succeed!** 🎯

---

*Last Updated: 2024-10-28*  
*Status: ✅ Clean & Organized*
