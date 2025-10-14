# Calybr - Smart Driving Coach App (Expo SDK 53)

A React Native app built with Expo that helps users improve their driving skills through AI-powered coaching and real-time trip tracking.

## 🚀 Quickstart
1. Install Node.js 18+ and Git
2. `npm install -g @expo/cli eas-cli`
3. `npm install --legacy-peer-deps`
4. Ask a teammate for env values, then copy `.env.example` to `.env` and fill them
5. Run: `npm start` (scan QR in Expo Go) or install the dev client (see below)

## 📱 Scripts
- `npm start` – Expo Metro server (development)
- `npm run ios` – iOS Simulator (macOS with Xcode required)
- `npm run android` – Android Emulator (Android Studio required)
- `npm run web` – Web browser version
- `npm run clear` – Clear Metro cache
- `npm run type-check` – TypeScript check
- `npm run lint` – ESLint

## 🔧 Dev Client (Full Native Features)
For full access to native modules and APIs:
- **EAS Build (Recommended)**: `eas build --profile development --platform all`
- **Local Build**: `npx expo run:ios` or `npx expo run:android`
- Install via EAS build link (works on any device)

## ☁️ EAS Cloud Builds
- **Login**: `eas login`
- **Development**: `eas build --profile development --platform all`
- **Preview**: `eas build --profile preview --platform all`
- **Production**: `eas build --profile production --platform all`
- Get install links from EAS dashboard

## 🌍 Environment Variables
- Copy `.env.example` to `.env` and fill in your values
- Never commit real secrets to Git
- Use `eas secret:create` for production secrets

## 🛠 Tech Stack
- **Framework**: React Native + Expo SDK 53
- **Language**: TypeScript
- **Navigation**: React Navigation v7
- **State**: Zustand
- **Styling**: NativeWind (Tailwind CSS)
- **Backend**: Supabase
- **AI**: OpenAI, Anthropic, Grok
- **Maps**: React Native Maps + Google Maps

## 👥 Team Development
- **Cross-platform**: One codebase for iOS and Android
- **Cloud builds**: Build iOS apps without Mac
- **Live reload**: Instant updates across all devices
- **Shared builds**: Team members can test via QR codes

## 🏗 Project Structure
```
src/
├── api/           # AI service integrations
├── components/    # Reusable UI components
├── lib/          # Third-party configurations
├── navigation/   # App navigation setup
├── screens/      # App screens
├── services/     # Business logic & data
├── state/        # Global state management
├── types/        # TypeScript definitions
└── utils/        # Helper functions
```

## 🚗 Key Features
- Real-time trip tracking with GPS
- AI-powered driving feedback and coaching
- Gamified scoring system
- Social leaderboards and challenges
- Cross-platform compatibility (iOS + Android)

---

**Ready to start coding?** Follow the quickstart guide above!
