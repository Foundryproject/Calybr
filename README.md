# Calybr - AI-Powered Safe Driving Coach

Calybr is a mobile application built with React Native and Expo that helps drivers improve their safety through AI-powered coaching, real-time trip tracking, and gamification.

## 🚀 Features

- **Drive Tracking**: Real-time GPS tracking with background location support
- **AI Coaching**: Personalized driving feedback powered by OpenAI and Anthropic
- **Score System**: Comprehensive driving score based on multiple metrics
- **Trip History**: View and analyze past trips with detailed statistics
- **Community Features**: Leaderboards and social engagement
- **Rewards System**: Gamification to encourage safe driving
- **Maps Integration**: Visual trip routes with Google Maps

---

## 📁 Project Structure

```
Calybr/
├── .husky/                      # Git hooks for code quality
│   └── pre-commit              # Runs lint-staged and typecheck before commits
│
├── assets/                      # Static assets
│   └── images/
│       ├── icon.png            # App icon
│       ├── splash-icon.png     # Splash screen
│       ├── android-icon-*.png  # Android adaptive icons
│       └── favicon.png         # Web favicon
│
├── patches/                     # npm package patches
│   ├── expo-asset@11.1.5.patch
│   └── react-native@0.79.2.patch
│
├── src/                         # Source code
│   ├── api/                    # External API integrations
│   │   ├── anthropic.ts       # Anthropic Claude API client
│   │   ├── chat-service.ts    # Unified chat service abstraction
│   │   ├── grok.ts            # Grok AI API client
│   │   ├── image-generation.ts # AI image generation service
│   │   ├── openai.ts          # OpenAI API client
│   │   └── transcribe-audio.ts # Audio transcription service
│   │
│   ├── components/             # Reusable React components
│   │   └── ScoreGauge.tsx     # Circular score display gauge
│   │
│   ├── lib/                    # Core libraries
│   │   └── supabase.ts        # Supabase client configuration
│   │
│   ├── navigation/             # React Navigation setup
│   │   └── MainNavigator.tsx  # Bottom tab + stack navigation
│   │
│   ├── screens/                # App screens
│   │   ├── ActiveTripScreen.tsx     # Real-time trip recording
│   │   ├── CoachScreen.tsx          # AI coaching & community
│   │   ├── DriveScreen.tsx          # Start new trip
│   │   ├── HomeScreen.tsx           # Dashboard (unused)
│   │   ├── OnboardingScreen.tsx     # First-time user flow
│   │   ├── ProfileScreen.tsx        # User profile
│   │   ├── RewardsScreen.tsx        # Achievements & rewards
│   │   ├── ScoreDetailsScreen.tsx   # Detailed score breakdown
│   │   ├── SettingsScreen.tsx       # App settings
│   │   ├── SignUpScreen.tsx         # User registration
│   │   ├── TripDetailScreen.tsx     # Individual trip view
│   │   ├── TripsScreen.tsx          # Trip history list
│   │   └── TripSummaryScreen.tsx    # Post-trip summary
│   │
│   ├── services/               # Business logic services
│   │   ├── auth.service.ts           # Authentication logic
│   │   ├── drive-tracking.service.ts # Real-time location tracking
│   │   ├── leaderboard.service.ts    # Community rankings
│   │   ├── scores.service.ts         # Score calculations
│   │   ├── trip-tracker.ts           # Trip recording logic
│   │   └── trips.service.ts          # Trip CRUD operations
│   │
│   ├── state/                  # State management
│   │   ├── driveStore.ts      # Zustand store for drive state
│   │   └── rootStore.example.ts # Example root store pattern
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── ai.ts              # AI service types
│   │   └── drive.ts           # Drive & trip types
│   │
│   └── utils/                  # Utility functions
│       ├── cn.ts              # Tailwind className utility
│       ├── mockData.ts        # Mock data for development
│       └── theme.ts           # App theme constants
│
├── .env.example                # Environment variables template
├── .gitattributes             # Git line ending configuration
├── .gitignore                 # Git ignore patterns
├── app.config.js              # Expo configuration
├── App.tsx                    # Root app component
├── babel.config.js            # Babel transpiler configuration
├── global.css                 # Global Tailwind CSS styles
├── index.ts                   # App entry point
├── metro.config.js            # Metro bundler configuration
├── nativewind-env.d.ts        # NativeWind type declarations
├── package.json               # Dependencies & scripts
├── supabase-schema.sql        # Database schema
├── supabase-rls-fix.sql       # Row Level Security fixes
├── tailwind.config.js         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

---

## 📄 Key Files Explained

### Configuration Files

| File | Purpose |
|------|---------|
| `app.config.js` | Expo app configuration: name, bundle IDs, permissions, plugins |
| `babel.config.js` | Babel transpiler setup for NativeWind and JSX |
| `metro.config.js` | Metro bundler configuration for React Native |
| `tailwind.config.js` | Tailwind CSS theme and configuration |
| `tsconfig.json` | TypeScript compiler options and paths |
| `.env.example` | Template for environment variables (API keys) |

### Entry Points

| File | Purpose |
|------|---------|
| `index.ts` | App entry point - registers the root component |
| `App.tsx` | Root component with navigation and providers |

### Core Application Files

| File/Folder | Purpose |
|-------------|---------|
| `src/navigation/MainNavigator.tsx` | Bottom tab navigation with 5 tabs and nested stacks |
| `src/screens/` | All app screens (13 total) for different features |
| `src/services/` | Business logic layer (auth, tracking, scoring) |
| `src/api/` | External API integrations (OpenAI, Anthropic, etc.) |
| `src/lib/supabase.ts` | Database client configuration |
| `src/state/driveStore.ts` | Global state management with Zustand |
| `src/utils/theme.ts` | App-wide colors, typography, spacing constants |

### Database Files

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | Complete database schema with tables for users, trips, scores |
| `supabase-rls-fix.sql` | Row Level Security policies for data access control |

---

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo Go app (for testing on device)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Foundryproject/Calybr.git
   cd Calybr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your API keys:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Set up Supabase database**
   - Create a Supabase project at https://supabase.com
   - Run `supabase-schema.sql` in SQL Editor
   - Run `supabase-rls-fix.sql` for security policies

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Open in Expo Go**
   - Scan QR code with Expo Go app
   - App will load on your device

---

## 📱 App Navigation Structure

```
Bottom Tabs:
├── Trips Tab (Home)
│   ├── Trips List
│   ├── Trip Detail
│   ├── Active Trip (recording)
│   └── Trip Summary
│
├── Community Tab
│   └── AI Coach & Leaderboard
│
├── Drive Tab
│   └── Start New Trip
│
├── Rewards Tab
│   └── Achievements & Gamification
│
└── Profile Tab
    ├── Profile
    ├── Settings
    └── Score Details
```

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run android` | Open in Android device/emulator |
| `npm run ios` | Open in iOS device/simulator |
| `npm run web` | Open in web browser |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run Jest tests |

---

## 🏗️ Tech Stack

### Core
- **React Native** - Mobile framework
- **Expo SDK 54** - Development platform
- **TypeScript** - Type safety

### Navigation & UI
- **React Navigation** - Routing and navigation
- **NativeWind** - Tailwind CSS for React Native
- **React Native Reanimated** - Smooth animations

### Backend & Data
- **Supabase** - Database, auth, and real-time subscriptions
- **Zustand** - State management
- **React Native MMKV** - Fast local storage

### Location & Maps
- **expo-location** - GPS tracking with background support
- **react-native-maps** - Google Maps integration

### AI Services
- **OpenAI API** - GPT-4 for coaching insights
- **Anthropic Claude** - Alternative AI provider
- **Grok AI** - Additional AI integration

### Development Tools
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting
- **patch-package** - NPM package patches
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 🔐 Environment Variables

Required environment variables (see `.env.example`):

```env
SUPABASE_URL=              # Supabase project URL
SUPABASE_ANON_KEY=         # Supabase anonymous key
OPENAI_API_KEY=            # OpenAI API key for AI coaching
MAPS_API_KEY=              # Google Maps API key
```

---

## 🗄️ Database Schema

The app uses Supabase (PostgreSQL) with the following main tables:

- **users** - User profiles and settings
- **trips** - Driving trip records
- **scores** - Trip scoring data
- **achievements** - Gamification achievements
- **leaderboard** - Community rankings

See `supabase-schema.sql` for complete schema.

---

## 📝 Development Notes

### Git Hooks

Pre-commit hook automatically runs:
- `lint-staged` - Formats and lints staged files
- `typecheck` - TypeScript type checking

### Patches

Custom patches are applied to:
- `expo-asset@11.1.5` - Asset loading fixes
- `react-native@0.79.2` - React Native compatibility

### Code Quality

- ESLint configuration with Expo preset
- Prettier for consistent formatting
- TypeScript strict mode enabled

---

## 🚧 Known Limitations

- **Expo Go**: Some features require a custom development build:
  - `react-native-vision-camera` (not supported in Expo Go)
  - Full background location (limited in Expo Go)
  - Some native modules

- **Development Build**: For full functionality, build with:
  ```bash
  npx expo run:android
  # or
  npx expo run:ios
  ```

---

## 📄 License

ISC

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass and code is formatted
5. Submit a pull request

---

## 📞 Support

For issues and questions:
- GitHub Issues: https://github.com/Foundryproject/Calybr/issues
- Repository: https://github.com/Foundryproject/Calybr

---

**Built with ❤️ for safer driving**
