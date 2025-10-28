# Calybr - AI-Powered Safe Driving Coach

Calybr is a mobile application built with React Native and Expo that helps drivers improve their safety through AI-powered coaching, **automatic trip detection**, real-time tracking, and gamification.

## 📚 Documentation & Navigation

- **[📖 Project Map](./PROJECT_MAP.md)** - Quick reference to find anything in the project
- **[📂 Project Structure](./STRUCTURE.md)** - Complete folder organization
- **[📋 Organization Guide](./docs/PROJECT_ORGANIZATION.md)** - Code organization & best practices
- **[📚 Documentation Hub](./docs/README.md)** - All documentation in one place
- **[🗄️ Backend Docs](./docs/backend/)** - Database, functions, deployment

---

## 🚀 Key Features

- **🤖 Automatic Trip Detection** - Trips start and stop automatically when you drive (no buttons!)
- **📍 Background Location Tracking** - Works even when app is closed or minimized
- **🏆 AI Coaching** - Personalized driving feedback powered by OpenAI and Anthropic
- **📊 Drive Score System** - Comprehensive scoring based on multiple safety metrics
- **📱 Trip History** - View and analyze past trips with detailed statistics
- **🗺️ Maps Integration** - Visual trip routes with Google Maps
- **👥 Community Features** - Leaderboards and social engagement
- **🎁 Rewards System** - Gamification to encourage safe driving

---

## ⚡ Quick Start

### 1. Installation

```bash
git clone https://github.com/Foundryproject/Calybr.git
cd Calybr
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
EXPO_PUBLIC_ENV=development
```

**Get your Supabase credentials:**

1. Go to https://supabase.com/dashboard
2. Select your project → Settings → API
3. Copy "Project URL" and "anon public" key

### 3. Set Up Database

1. Open Supabase SQL Editor
2. Run the migration: `supabase/migrations/20251020_002_update_profile_schema.sql`
3. Verify tables are created

### 4. Start Development Server

```bash
npm start
```

Scan QR code with Expo Go app (iOS/Android) to test.

---

## 🚗 Automatic Trip Detection

### How It Works

The app automatically detects and records your driving trips:

1. **Trip Starts** - When you drive 15+ km/h for 10+ seconds
2. **Trip Tracks** - Records route, distance, duration, and speed continuously
3. **Trip Stops** - When you've stopped (< 5 km/h) for 2+ minutes
4. **Trip Saves** - Automatically saves to database with no user interaction

### Enable Auto Detection

1. Open app → **Profile Tab** → **Settings** (gear icon)
2. Find **"Automatic Trip Tracking"** toggle
3. Turn it **ON**
4. Grant **"Always Allow"** location permissions
5. Done! Just drive normally, trips record automatically

### Detection Thresholds

| Setting        | Default    | Description                          |
| -------------- | ---------- | ------------------------------------ |
| Start Speed    | 15 km/h    | Minimum speed to start trip (~9 mph) |
| Start Duration | 10 seconds | Must maintain speed this long        |
| Stop Speed     | 5 km/h     | Below this = stopped (~3 mph)        |
| Stop Duration  | 2 minutes  | Stopped this long = trip ends        |
| Min Distance   | 500m       | Trips shorter than this aren't saved |
| Min Duration   | 60 seconds | Trips shorter than this aren't saved |

---

## 🧪 Testing Automatic Trips

### Quick Test (No Driving Needed!)

1. **Open**: Profile → Settings → Developer Tools → "Test Background Location"
2. **Start**: Click "Start Auto Trip Detection"
3. **Simulate**: Click "Simulate Driving (20 km/h)"
   - Watch state change: IDLE → DETECTING → DRIVING
   - See distance/duration increase in real-time
4. **End**: Click "Simulate Stopped (< 5 km/h)"
   - Wait 30 seconds for trip to end
5. **Verify**: Go to Trips tab - your simulated trip appears!

### Real World Test

1. Enable automatic trip tracking in Settings
2. Get in your car and start driving (15+ km/h)
3. Drive for at least 1 km
4. Park and wait 2+ minutes
5. Open app → Trips tab → Your trip is saved!

### Test Screen Features

The **Background Location Test** screen provides:

- ✅ **Real-time Status** - See detection state (IDLE, DETECTING, DRIVING, STOPPED)
- ✅ **Active Trip Monitor** - Distance, duration, speed in real-time
- ✅ **Simulation Tools** - Test without driving (perfect for development)
- ✅ **Event Log** - See every location update and state change
- ✅ **Permission Manager** - Easy permission granting

**Access**: Profile → Settings → Developer Tools → "Test Background Location"

---

## 📱 App Navigation

```
Bottom Tabs:
├── 📊 Trips Tab (Home)
│   ├── Trips List - All recorded trips
│   ├── Trip Detail - Individual trip view
│   ├── Active Trip - Real-time recording
│   └── Trip Summary - Post-trip analysis
│
├── 👥 Community Tab
│   └── AI Coach & Leaderboard
│
├── 🚗 Drive Tab
│   └── Start Manual Trip
│
├── 🎁 Rewards Tab
│   └── Achievements & Gamification
│
└── 👤 Profile Tab
    ├── Profile - User info
    ├── Settings - App configuration
    ├── Score Details - Driving score breakdown
    └── Background Location Test - Developer testing tools
```

---

## 🔧 Available Scripts

| Command             | Description                     |
| ------------------- | ------------------------------- |
| `npm start`         | Start Expo development server   |
| `npm run android`   | Open in Android device/emulator |
| `npm run ios`       | Open in iOS simulator           |
| `npm run web`       | Open in web browser             |
| `npm run lint`      | Run ESLint                      |
| `npm run format`    | Format code with Prettier       |
| `npm run typecheck` | Run TypeScript type checking    |
| `npm test`          | Run Jest tests                  |

---

## 🏗️ Tech Stack

### Core Framework

- **React Native** - Mobile framework
- **Expo SDK 54** - Development platform with managed workflow
- **TypeScript** - Type-safe JavaScript

### Navigation & UI

- **React Navigation 7** - Routing with bottom tabs + stack navigators
- **NativeWind** - Tailwind CSS for React Native
- **React Native Reanimated** - Smooth 60fps animations

### Backend & State

- **Supabase** - PostgreSQL database + authentication + real-time
- **Zustand** - Lightweight state management
- **React Native MMKV** - Fast key-value storage

### Location & Maps

- **expo-location** - GPS tracking with foreground/background support
- **expo-task-manager** - Background task execution
- **react-native-maps** - Google Maps integration

### AI Services

- **OpenAI GPT-4** - AI coaching and insights
- **Anthropic Claude** - Alternative AI provider
- **Grok AI** - Additional AI integration

### Development Tools

- **Husky** - Git hooks for code quality
- **lint-staged** - Pre-commit linting
- **ESLint + Prettier** - Code quality and formatting
- **patch-package** - NPM package patches

---

## 📁 Project Structure

```
Calybr/
├── src/
│   ├── api/                        # External API integrations
│   │   ├── anthropic.ts           # Claude AI client
│   │   ├── openai.ts              # OpenAI GPT client
│   │   └── chat-service.ts        # Unified chat interface
│   │
│   ├── components/                 # Reusable React components
│   │   ├── ScoreGauge.tsx         # Circular score display
│   │   └── LocationPermissionModal.tsx  # Permission flow UI
│   │
│   ├── lib/
│   │   └── supabase.ts            # Supabase client config
│   │
│   ├── navigation/
│   │   └── MainNavigator.tsx      # Bottom tab + stack navigation
│   │
│   ├── screens/                    # App screens (14 total)
│   │   ├── ActiveTripScreen.tsx   # Real-time trip recording
│   │   ├── BackgroundLocationTestScreen.tsx  # Testing tools
│   │   ├── CoachScreen.tsx        # AI coaching interface
│   │   ├── DriveScreen.tsx        # Start manual trip
│   │   ├── OnboardingScreen.tsx   # First-time user flow
│   │   ├── ProfileScreen.tsx      # User profile
│   │   ├── RewardsScreen.tsx      # Achievements
│   │   ├── SettingsScreen.tsx     # App settings
│   │   ├── SignUpScreen.tsx       # Authentication
│   │   ├── TripDetailScreen.tsx   # Individual trip view
│   │   ├── TripsScreen.tsx        # Trip history
│   │   └── TripSummaryScreen.tsx  # Post-trip summary
│   │
│   ├── services/                   # Business logic layer
│   │   ├── auth.service.ts              # Authentication
│   │   ├── auto-trip-detection.service.ts  # Automatic trip detection logic
│   │   ├── auto-trip-manager.ts         # Trip detection orchestration
│   │   ├── background-location.service.ts  # Background GPS tracking
│   │   ├── drive-tracking.service.ts    # Real-time location tracking
│   │   ├── trip-database.service.ts     # Trip data persistence
│   │   ├── trip-tracker.ts              # Trip recording logic
│   │   └── trips.service.ts             # Trip CRUD operations
│   │
│   ├── state/
│   │   └── driveStore.ts          # Zustand global state
│   │
│   ├── types/
│   │   ├── ai.ts                  # AI service types
│   │   └── drive.ts               # Drive & trip types
│   │
│   └── utils/
│       ├── theme.ts               # Colors, typography, spacing
│       └── mockData.ts            # Development mock data
│
├── supabase/
│   └── migrations/                 # Database migrations
│       └── 20251020_002_update_profile_schema.sql
│
├── .env.example                    # Environment variables template
├── app.config.js                   # Expo configuration
├── App.tsx                         # Root component
├── package.json                    # Dependencies
└── tsconfig.json                   # TypeScript config
```

---

## 🗄️ Database Schema

Main tables in Supabase (PostgreSQL):

- **`auth.users`** - User authentication (managed by Supabase Auth)
- **`profile`** - User profiles with onboarding data
- **`trip`** - Driving trip records with route, distance, duration
- **`scores`** - Trip scoring data
- **`achievements`** - Gamification achievements
- **`leaderboard`** - Community rankings

**Note**: The `profiles` view maps to the `profile` table for frontend compatibility.

See: `supabase/migrations/20251020_002_update_profile_schema.sql`

---

## 🔐 Permissions

### Android

- `ACCESS_FINE_LOCATION` - GPS location
- `ACCESS_COARSE_LOCATION` - Network location
- `ACCESS_BACKGROUND_LOCATION` - Background tracking
- `FOREGROUND_SERVICE` - Background service
- `FOREGROUND_SERVICE_LOCATION` - Location service type
- `POST_NOTIFICATIONS` - Android 13+ notifications
- `ACTIVITY_RECOGNITION` - Movement detection

### iOS

- Location When In Use - Foreground tracking
- Location Always - Background tracking

**Important**: For automatic trip detection to work, users must grant "Always Allow" location permissions.

---

## 🚨 Troubleshooting

### Auto Trip Detection Not Working

**Problem**: Trips aren't being detected automatically

**Solutions**:

1. Check Settings → Automatic Trip Tracking is **ON**
2. Verify location permissions are **"Always Allow"**
3. Test with "Simulate Driving" button first
4. Drive faster (> 15 km/h) and maintain speed for 10+ seconds
5. Check Background Location Test screen for errors

### Background Notification Issues (Android)

**Problem**: Notification is big or won't minimize

**Solutions**:

1. Uninstall and reinstall the app (clears notification channel cache)
2. Or: Long press notification → Settings → Set importance to "Low"
3. Or: Build a development build (not Expo Go) for full control

### Trip Not Saving to Database

**Problem**: Trip ends but doesn't appear in Trips tab

**Solutions**:

1. Verify you're logged in (Profile tab shows your name)
2. Check `.env` file has correct Supabase credentials
3. Ensure trip meets minimums (> 500m distance, > 1 min duration)
4. Check console logs for Supabase errors
5. Verify database migration was run

### Expo Go Limitations

**Problem**: Features don't work in Expo Go

**Note**: Expo Go has limitations for:

- Custom notification priorities/channels
- Some background location features
- Native module customizations

**Solution**: Build a development build for full functionality:

```bash
npx eas-cli build --profile development --platform android
# or
npx expo run:android
```

---

## 🏷️ Environment Variables

Required in `.env` file:

```env
# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google Maps (Required for maps)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key

# AI Services (Optional)
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=your_openai_key
EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY=your_anthropic_key
EXPO_PUBLIC_VIBECODE_GROK_API_KEY=your_grok_key

# Environment
EXPO_PUBLIC_ENV=development
```

---

## 🧪 Development Tips

### Git Hooks

Pre-commit hook automatically runs:

- `lint-staged` - Formats and lints staged files
- `typecheck` - TypeScript type checking

### Testing Auto Trips Without Driving

Use the **Background Location Test** screen:

1. Profile → Settings → Developer Tools → "Test Background Location"
2. Click "Start Auto Trip Detection"
3. Click "Simulate Driving" - generates fake location data with speed
4. Click "Simulate Stopped" - triggers trip end
5. Check event log to see exactly what's happening

### Customizing Detection Thresholds

Edit `src/services/auto-trip-manager.ts` line 50:

```typescript
const started = await autoTripDetection.start({
  startSpeedKmh: 20, // Higher = only detect faster trips
  startDurationMs: 5000, // Lower = detect trips faster
  stopSpeedKmh: 3, // Lower = more sensitive to stops
  stopDurationMs: 300000, // 5 minutes instead of 2
  minTripDistanceM: 1000, // Only save trips > 1km
  minTripDurationS: 120, // Only save trips > 2 minutes
});
```

### Viewing Logs

- **Console**: Check terminal for detailed logs
- **Event Log**: Use Background Location Test screen
- **Supabase**: Dashboard → Table Editor → `trip` table

---

## 📱 Building for Production

### Android

```bash
# Development build (for testing)
npx eas-cli build --profile development --platform android

# Production build
npx eas-cli build --profile production --platform android
```

### iOS

```bash
# Development build
npx eas-cli build --profile development --platform ios

# Production build
npx eas-cli build --profile production --platform ios
```

---

## 🎯 Roadmap / Future Features

- [ ] Intelligent trip detection (learn user patterns)
- [ ] Trip categorization (personal vs business)
- [ ] Offline trip queue and sync
- [ ] Hard braking/speeding alerts
- [ ] Phone usage detection
- [ ] Carpool mode
- [ ] Integration with car OBD-II data
- [ ] Apple CarPlay / Android Auto support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting: `npm run lint`
5. Run type checking: `npm run typecheck`
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

---

## 📄 License

ISC

---

## 📞 Support

- **GitHub Issues**: https://github.com/Foundryproject/Calybr/issues
- **Repository**: https://github.com/Foundryproject/Calybr

---

## 🙏 Acknowledgments

Built with:

- [Expo](https://expo.dev)
- [React Native](https://reactnative.dev)
- [Supabase](https://supabase.com)
- [OpenAI](https://openai.com)
- [Anthropic](https://anthropic.com)

---

**Built with ❤️ for safer driving**

🚗💨 Drive safe, drive smart with Calybr!
