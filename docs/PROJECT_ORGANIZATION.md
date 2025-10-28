# 📁 Calybr Project Organization

> **Complete organizational structure and conventions for the Calybr codebase**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Code Organization Principles](#code-organization-principles)
4. [File Naming Conventions](#file-naming-conventions)
5. [Import/Export Standards](#importexport-standards)
6. [Feature Organization](#feature-organization)
7. [State Management](#state-management)
8. [API & Services](#api--services)
9. [Testing Strategy](#testing-strategy)
10. [Documentation Standards](#documentation-standards)

---

## 🎯 Project Overview

**Calybr** is a React Native + Expo app for driver scoring and trip tracking.

### Tech Stack

- **Frontend**: React Native, Expo SDK 53, TypeScript
- **State**: Zustand
- **Styling**: NativeWind (Tailwind CSS)
- **Navigation**: React Navigation
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: Anthropic Claude, OpenAI, Grok

### Key Features

- 🚗 Automatic trip detection
- 📊 Driver scoring & analytics
- 🏆 Community leaderboards
- 🤖 AI-powered coaching
- 📍 Background location tracking

---

## 📂 Directory Structure

```
calybr/
├── 📱 App Code
│   ├── src/
│   │   ├── index.ts              # Main export index (centralized)
│   │   ├── screens/              # All screen components
│   │   ├── services/             # Business logic & API calls
│   │   ├── components/           # Reusable UI components
│   │   ├── navigation/           # Navigation configuration
│   │   ├── state/                # Global state management
│   │   ├── types/                # TypeScript type definitions
│   │   ├── utils/                # Helper functions & utilities
│   │   ├── lib/                  # External library configurations
│   │   └── api/                  # AI service integrations
│   │
│   ├── App.tsx                   # App entry point
│   └── index.ts                  # Root index file
│
├── 🗄️ Backend
│   └── supabase/
│       ├── functions/            # Edge Functions
│       │   ├── _shared/          # Shared backend utilities
│       │   ├── ingest-telemetry/ # Telemetry processing
│       │   └── trips-finalize/   # Trip scoring & finalization
│       ├── migrations/           # Database schema migrations
│       └── [config files]        # Supabase configuration
│
├── 🧪 Tests
│   └── __tests__/
│       ├── unit/                 # Unit tests
│       └── integration/          # Integration tests
│
├── 📱 Native
│   ├── ios/                      # iOS native code
│   └── android/                  # Android native code (future)
│
├── 📦 Assets
│   └── assets/
│       └── images/               # App icons, splash screens
│
├── ⚙️ Configuration
│   ├── app.json                  # Expo configuration
│   ├── eas.json                  # EAS Build configuration
│   ├── package.json              # Dependencies & scripts
│   ├── tsconfig.json             # TypeScript configuration
│   ├── tailwind.config.js        # Tailwind CSS configuration
│   ├── metro.config.js           # Metro bundler configuration
│   ├── babel.config.js           # Babel configuration
│   └── eslint.config.js          # ESLint rules
│
└── 📚 Documentation
    ├── README.md                 # Project overview
    ├── PROJECT_ORGANIZATION.md   # This file
    └── [other docs]              # Additional documentation
```

---

## 🎨 Code Organization Principles

### 1. **Feature-First Thinking**

Organize code by **what it does**, not **what it is**.

✅ **Good**: Group related functionality together

```
services/
  ├── trips.service.ts          # Trip CRUD operations
  ├── trip-tracker.ts           # Active trip tracking
  └── trip-database.service.ts  # Local storage
```

❌ **Bad**: Separate by technical layer

```
services/
  ├── api.service.ts            # Too generic
  └── database.service.ts       # Too generic
```

### 2. **Single Responsibility**

Each file should have **one clear purpose**.

✅ **Good**:

- `auth.service.ts` - Authentication only
- `scores.service.ts` - Scoring only

❌ **Bad**:

- `utils.ts` - Everything mixed together

### 3. **Dependency Direction**

- **Screens** depend on **Services**
- **Services** depend on **Lib/Utils**
- **Never** create circular dependencies

```
Screens → Services → Lib → External APIs
   ↓         ↓        ↓
Components  State   Utils
```

### 4. **Colocation**

Keep related files close together.

✅ **Good**:

```
screens/
  ├── TripsScreen.tsx
  ├── TripDetailScreen.tsx
  └── TripSummaryScreen.tsx
```

### 5. **Separation of Concerns**

- **Screens**: UI + user interaction
- **Services**: Business logic + API calls
- **Components**: Reusable UI elements
- **State**: Global data management
- **Utils**: Pure helper functions

---

## 📝 File Naming Conventions

### Screens

- **Format**: `PascalCase.tsx`
- **Suffix**: `Screen`
- **Examples**:
  - `TripsScreen.tsx`
  - `ScoreDetailsScreen.tsx`
  - `OnboardingScreen.tsx`

### Services

- **Format**: `kebab-case.service.ts`
- **Suffix**: `.service`
- **Examples**:
  - `auth.service.ts`
  - `trips.service.ts`
  - `background-location.service.ts`

### Components

- **Format**: `PascalCase.tsx`
- **No suffix** (unless clarification needed)
- **Examples**:
  - `ScoreGauge.tsx`
  - `LocationPermissionModal.tsx`

### Utils & Helpers

- **Format**: `kebab-case.ts`
- **Examples**:
  - `theme.ts`
  - `mock-data.ts`

### Types

- **Format**: `kebab-case.ts`
- **Examples**:
  - `drive.ts`
  - `ai.ts`

### Tests

- **Format**: `[filename].test.ts`
- **Examples**:
  - `auth.service.test.ts`
  - `ScoringEngine.test.ts`

---

## 📦 Import/Export Standards

### Export Strategy

#### 1. **Default Exports** (for screens & main components)

```typescript
// TripsScreen.tsx
export default function TripsScreen() { ... }
```

#### 2. **Named Exports** (for services, utilities, hooks)

```typescript
// auth.service.ts
export const signUpWithEmail = async () => { ... };
export const signInWithEmail = async () => { ... };
```

#### 3. **Barrel Exports** (from index.ts)

```typescript
// src/index.ts
export { default as TripsScreen } from "./screens/TripsScreen";
export * from "./services/auth.service";
```

### Import Patterns

#### ✅ **Preferred: From Main Index**

```typescript
import { TripsScreen, signUpWithEmail, Colors } from "../src";
```

#### ✅ **Alternative: Direct Imports**

```typescript
import TripsScreen from "../screens/TripsScreen";
import { signUpWithEmail } from "../services/auth.service";
```

#### ❌ **Avoid: Relative Path Chaos**

```typescript
import TripsScreen from "../../../screens/TripsScreen";
```

### Import Organization

Group imports in this order:

```typescript
// 1. React & React Native
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

// 2. Third-party libraries
import { useNavigation } from "@react-navigation/native";

// 3. Internal imports (from src/index.ts)
import { useUser, Colors, Typography } from "../src";

// 4. Local/relative imports
import LocalComponent from "./LocalComponent";

// 5. Types
import type { Trip, User } from "../types";
```

---

## 🎯 Feature Organization

### Feature Domains

Organize code into these primary domains:

#### 1. **Authentication & Onboarding**

```
├── screens/
│   ├── SignUpScreen.tsx
│   ├── OnboardingScreen.tsx
│   ├── ProfileScreen.tsx
│   └── SettingsScreen.tsx
└── services/
    └── auth.service.ts
```

#### 2. **Trips & Tracking**

```
├── screens/
│   ├── TripsScreen.tsx
│   ├── TripDetailScreen.tsx
│   ├── TripSummaryScreen.tsx
│   └── ActiveTripScreen.tsx
└── services/
    ├── trips.service.ts
    ├── trip-tracker.ts
    └── trip-database.service.ts
```

#### 3. **Location & Auto-Detection**

```
├── screens/
│   ├── DriveScreen.tsx
│   └── BackgroundLocationTestScreen.tsx
├── services/
│   ├── auto-trip-detection.service.ts
│   ├── auto-trip-manager.ts
│   ├── background-location.service.ts
│   └── drive-tracking.service.ts
└── components/
    └── LocationPermissionModal.tsx
```

#### 4. **Scoring & Analytics**

```
├── screens/
│   ├── ScoreDetailsScreen.tsx
│   └── HomeScreen.tsx
├── services/
│   └── scores.service.ts
└── components/
    └── ScoreGauge.tsx
```

#### 5. **Community & Leaderboard**

```
├── screens/
│   ├── CoachScreen.tsx
│   └── RewardsScreen.tsx
└── services/
    └── leaderboard.service.ts
```

#### 6. **AI Services**

```
└── api/
    ├── anthropic.ts
    ├── openai.ts
    ├── grok.ts
    ├── chat-service.ts
    ├── image-generation.ts
    └── transcribe-audio.ts
```

---

## 🧠 State Management

### Zustand Store Organization

**Location**: `src/state/driveStore.ts`

#### Store Structure

```typescript
interface DriveState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;

  // Trip state
  trips: Trip[];
  activeTrip: ActiveTrip | null;

  // Score state
  driverScore: DriverScore | null;

  // Actions
  login: (user: User) => void;
  logout: () => void;
  setActiveTrip: (trip: ActiveTrip) => void;
  addTrip: (trip: Trip) => void;
  // ... etc
}
```

#### Best Practices

- ✅ Keep store flat (no deep nesting)
- ✅ Use selectors for derived state
- ✅ Actions should be simple mutations
- ✅ Business logic belongs in services, not store
- ❌ Don't put non-serializable data in store

---

## 🔌 API & Services

### Service Layer Organization

#### Structure

```typescript
// service-name.service.ts

/**
 * Service description
 */

// 1. Imports
import { supabase } from '../lib/supabase';

// 2. Types (if needed locally)
interface LocalType { ... }

// 3. Helper functions (private)
const helperFunction = () => { ... };

// 4. Public API
export const mainFunction = async () => { ... };
export const anotherFunction = async () => { ... };
```

#### Error Handling

```typescript
export const getUserTrips = async (): Promise<{ data: Trip[] | null; error: any }> => {
  try {
    const { data, error } = await supabase.from("trips").select("*");

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (error) {
    console.error("Error in getUserTrips:", error);
    return { data: null, error };
  }
};
```

---

## 🧪 Testing Strategy

### Test Organization

```
__tests__/
├── unit/                    # Unit tests (isolated)
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   └── trips.service.test.ts
│   └── utils/
│       └── theme.test.ts
└── integration/             # Integration tests
    └── api/
        └── trip-flow.test.ts
```

### Naming Convention

- Test files: `[filename].test.ts`
- Test suites: `describe('ServiceName', () => { ... })`
- Test cases: `it('should do something', () => { ... })`

### What to Test

✅ **Unit Tests**:

- Services (business logic)
- Utils (pure functions)
- State management (actions/selectors)

✅ **Integration Tests**:

- API flows
- Navigation flows
- Complex user journeys

❌ **Don't Test**:

- React Navigation internals
- Third-party libraries
- UI snapshots (unless critical)

---

## 📚 Documentation Standards

### File Headers

```typescript
/**
 * File Name
 *
 * Brief description of what this file does
 *
 * @module ModuleName
 */
```

### Function Documentation

```typescript
/**
 * Get all trips for the current user
 *
 * @returns Promise with trips data or error
 * @throws Never throws - returns error object instead
 *
 * @example
 * const { data, error } = await getUserTrips();
 * if (error) console.error(error);
 */
export const getUserTrips = async () => { ... };
```

### Component Documentation

```typescript
/**
 * Score Gauge Component
 *
 * Displays a circular progress gauge for driver scores
 *
 * @param score - Score value (0-1000)
 * @param size - Gauge diameter in pixels
 *
 * @example
 * <ScoreGauge score={850} size={200} />
 */
export default function ScoreGauge({ score, size }: Props) { ... }
```

---

## ✅ Best Practices Checklist

### Code Quality

- [ ] TypeScript strict mode enabled
- [ ] No `any` types (use `unknown` if needed)
- [ ] All async functions return Promises
- [ ] Error handling in all API calls
- [ ] Loading states for all async operations

### Performance

- [ ] Memoize expensive computations
- [ ] Use `React.memo` for heavy components
- [ ] Optimize FlatList rendering
- [ ] Lazy load screens/components
- [ ] Debounce/throttle user inputs

### Accessibility

- [ ] All touchables have `accessibilityLabel`
- [ ] Proper heading hierarchy
- [ ] Color contrast ratios met
- [ ] Screen reader support

### Security

- [ ] No hardcoded API keys
- [ ] Use SecureStore for sensitive data
- [ ] Validate all user inputs
- [ ] Sanitize data before display

---

## 🔄 Development Workflow

### 1. **Before Starting**

- Pull latest from `main`
- Check project board/issues
- Create feature branch

### 2. **During Development**

- Follow naming conventions
- Write tests alongside code
- Document as you go
- Commit frequently with clear messages

### 3. **Before Committing**

- Run linter (`npm run lint`)
- Run tests (`npm test`)
- Test on device/simulator
- Review your own code

### 4. **Commit Message Format**

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat(trips): add trip deletion functionality
fix(auth): resolve token refresh issue
docs(readme): update installation steps
```

---

## 📊 Code Metrics

### File Size Guidelines

- **Screen**: < 300 lines
- **Service**: < 400 lines
- **Component**: < 200 lines
- **Utility**: < 100 lines

_If file exceeds limit, consider splitting_

### Complexity Guidelines

- **Cyclomatic complexity**: < 10 per function
- **Nesting depth**: < 4 levels
- **Function parameters**: < 5 parameters

---

## 🎓 Resources

### Internal Documentation

- `README.md` - Project setup & overview
- `BACKEND_DELIVERY_SUMMARY.md` - Backend features
- `INTEGRATION_GUIDE.md` - Integration instructions
- `supabase/README.md` - Backend documentation

### External Resources

- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Version**: 1.0.0  
**Last Updated**: 2024-10-28  
**Maintained by**: Calybr Team

---

_This document is a living guide. Update it as the project evolves._
