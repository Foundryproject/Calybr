export default () => ({
  expo: {
    name: "Calybr",
    slug: "calybr",
    scheme: "calybr",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.calybr.app",
      config: {
        googleMapsApiKey: process.env.MAPS_API_KEY || "AIzaSyB1DjZ-zMEe-MvDk-82Um6dghYuAGoOoyI",
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Calybr tracks your drives automatically to calculate your DriveScore and help you become a safer driver.",
        NSLocationWhenInUseUsageDescription:
          "Calybr needs your location to track your trips and provide driving insights.",
        NSMotionUsageDescription: "Calybr uses motion data to automatically detect when you start and stop driving.",
        UIBackgroundModes: ["location"],
      },
    },
    android: {
      edgeToEdgeEnabled: true,
      package: "com.calybr.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
        backgroundColor: "#ffffff",
      },
      config: {
        googleMaps: {
          apiKey: process.env.MAPS_API_KEY || "AIzaSyB1DjZ-zMEe-MvDk-82Um6dghYuAGoOoyI",
        },
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "ACTIVITY_RECOGNITION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "POST_NOTIFICATIONS",
      ],
    },
    plugins: [
      "expo-asset",
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "15.1",
            useFrameworks: "dynamic",
          },
        },
      ],
      "expo-font",
      "expo-mail-composer",
      "expo-secure-store",
      "expo-sqlite",
      "expo-video",
      "expo-web-browser",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Calybr tracks your drives automatically to calculate your DriveScore and help you become a safer driver.",
          locationWhenInUsePermission: "Calybr needs your location to track your trips and provide driving insights.",
          locationAlwaysPermission: "Allow Calybr to track your trips even when the app is closed or not in use.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
    ],
    extra: {
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      MAPS_API_KEY: process.env.MAPS_API_KEY,
      eas: {
        projectId: "a3720364-4b02-4f5e-b806-66837bf29ff0",
      },
    },
  },
});
