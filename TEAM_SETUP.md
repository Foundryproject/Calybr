# Calybr Team Development Setup Guide

## Overview
This guide will help all team members set up the development environment for the Calybr app, which supports both iOS and Android platforms.

## Prerequisites

### Required Software
1. **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
2. **Git** - [Download here](https://git-scm.com/)
3. **Expo CLI** - Install globally: `npm install -g @expo/cli`
4. **EAS CLI** - Install globally: `npm install -g eas-cli`

### Platform-Specific Requirements

#### For iOS Development (Mac required)
- **Xcode** (latest version) - Download from Mac App Store
- **iOS Simulator** (comes with Xcode)
- **CocoaPods** - Install with: `sudo gem install cocoapods`

#### For Android Development (All platforms)
- **Android Studio** - [Download here](https://developer.android.com/studio)
- **Android SDK** and **Android Virtual Device (AVD)**

## Getting Started

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd calybr-app
```

### 2. Install Dependencies
```bash
npm install
# or if you prefer yarn
yarn install
```

### 3. Set Up Environment Variables
1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```
2. Fill in your actual API keys and configuration values in `.env`
3. **Never commit the `.env` file to version control**

### 4. Expo Account Setup
1. Create an Expo account at [expo.dev](https://expo.dev)
2. Login to Expo CLI: `expo login`
3. Update the `owner` field in `app.json` with your Expo username

## Development Workflow

### Running the App Locally

#### Option 1: Expo Go (Easiest for testing)
```bash
npm start
# or
expo start
```
- Scan the QR code with your phone's camera (iOS) or Expo Go app (Android)
- **Note**: Some native features may not work in Expo Go

#### Option 2: Development Build (Recommended for full features)
```bash
# Build development client (first time only)
eas build --profile development --platform ios
eas build --profile development --platform android

# Then run normally
npm start
```

### Platform-Specific Commands
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web (for testing UI components)
npm run web
```

## Team Collaboration Features

### 1. Expo Development Builds
- **Shared builds**: All team members can use the same development build
- **Over-the-air updates**: Push code changes without rebuilding
- **Cross-platform testing**: Test on both iOS and Android devices

### 2. EAS Build (Cloud Building)
```bash
# Build for internal testing
eas build --profile preview --platform all

# Build for production
eas build --profile production --platform all
```

### 3. Expo Dev Tools
- **Expo Go**: Quick testing on physical devices
- **Flipper**: Advanced debugging (optional)
- **React Native Debugger**: Enhanced debugging experience

## Testing on Different Devices

### Physical Device Testing
1. **iOS**: Install Expo Go from App Store or use development build
2. **Android**: Install Expo Go from Play Store or use development build
3. **Scan QR code** from the Expo dev server

### Simulator/Emulator Testing
1. **iOS Simulator**: Automatically opens when running `npm run ios`
2. **Android Emulator**: Set up AVD in Android Studio, then run `npm run android`

## Key Features & Architecture

### Tech Stack
- **Framework**: React Native with Expo SDK 53
- **Navigation**: React Navigation v7
- **State Management**: Zustand
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase
- **Maps**: React Native Maps with Google Maps
- **AI Integration**: OpenAI, Anthropic, Grok APIs

### Project Structure
```
src/
├── api/           # API integrations (OpenAI, Anthropic, etc.)
├── components/    # Reusable UI components
├── lib/          # Third-party library configurations
├── navigation/   # Navigation setup
├── screens/      # App screens
├── services/     # Business logic and data services
├── state/        # Zustand stores
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```

## Environment Variables

### Required Variables
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY`: OpenAI API key
- `EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY`: Anthropic API key
- `EXPO_PUBLIC_VIBECODE_GROK_API_KEY`: Grok API key

### Security Notes
- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys regularly

## Troubleshooting

### Common Issues

#### Metro bundler issues
```bash
# Clear Metro cache
npx expo start --clear
```

#### iOS build issues
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..
```

#### Android build issues
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..
```

#### Dependencies issues
```bash
# Reset node_modules
rm -rf node_modules package-lock.json
npm install
```

### Getting Help
1. Check the [Expo Documentation](https://docs.expo.dev/)
2. Search [Expo Forums](https://forums.expo.dev/)
3. Ask team members in your communication channel

## Git Workflow

### Branch Strategy
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add: your feature description"

# Push and create pull request
git push origin feature/your-feature-name
```

### Commit Message Format
- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for updates to existing features
- `Refactor:` for code refactoring
- `Docs:` for documentation changes

## Deployment

### Internal Testing
```bash
# Build for internal distribution
eas build --profile preview --platform all
```

### Production Release
```bash
# Build for app stores
eas build --profile production --platform all

# Submit to app stores
eas submit --platform all
```

## Team Communication

### Best Practices
1. **Test on both platforms** before pushing changes
2. **Update documentation** when adding new features
3. **Use descriptive commit messages**
4. **Create pull requests** for code review
5. **Share build links** with team members for testing

### Sharing Builds
- Use EAS Build to create shareable links
- Test builds on different devices before merging
- Document any platform-specific issues

---

## Quick Start Checklist

- [ ] Install Node.js, Git, Expo CLI, EAS CLI
- [ ] Clone repository and install dependencies
- [ ] Set up environment variables
- [ ] Create Expo account and login
- [ ] Run `npm start` and test on your device
- [ ] Set up iOS Simulator or Android Emulator
- [ ] Create your first feature branch
- [ ] Make a test commit and push

**Need help?** Contact your team members or refer to the troubleshooting section above.
