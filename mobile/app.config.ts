import { ExpoConfig, ConfigContext } from "expo/config";

// Fail the build fast if the Android Google Maps key is missing in any EAS
// build. Without it, react-native-maps with PROVIDER_GOOGLE will crash on
// first MapView render — i.e. on launch for a logged-in user whose first
// screen is the home map. We'd rather break the build than ship a
// silently-broken APK.
//
// We intentionally do NOT fail in Expo Go or `expo start` local dev (where
// the key may legitimately be unset). Any EAS build — including the
// development profile — requires the key, because PROVIDER_GOOGLE crashes
// without it regardless of build profile.
function assertAndroidMapsKey(): void {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
  const isAndroidBuild = process.env.EAS_BUILD_PLATFORM === "android";
  const isProdLike =
    process.env.NODE_ENV === "production" ||
    process.env.EAS_BUILD === "true" ||
    process.env.EAS_BUILD_PROFILE === "preview" ||
    process.env.EAS_BUILD_PROFILE === "production";
  if (isAndroidBuild && isProdLike && (!key || key.trim() === "")) {
    throw new Error(
      "[app.config] EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY is not set. " +
        "Android builds will crash on first MapView render without it. " +
        "Set it in your EAS build profile or .env before building."
    );
  }
}

assertAndroidMapsKey();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "YourDrive",
  slug: "your-drive",
  version: "1.0.2",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "yourdrive",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    backgroundColor: "#16142A",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "rw.yourdrive.app",
    // Manually bump before each production build. autoIncrement was disabled
    // in eas.json because it never flowed through to CFBundleVersion: this
    // `ios` block fully replaces the one in app.json, so app.json's
    // buildNumber is shadowed and Expo defaults to "1".
    buildNumber: "19",
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        "YourDrive needs your location to find rides near you.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "YourDrive needs your location to track your ride in real-time.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#16142A",
    },
    package: "rw.yourdrive.app",
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
    ],
  },
  plugins: [
    ["expo-router", { root: "src/app" }],
    "expo-secure-store",
    "expo-localization",
    "expo-font",
    "expo-notifications",
    // RN 0.81 + new architecture defaults to RCT_USE_RN_DEP=1, which links
    // the prebuilt ReactNativeDependencies.xcframework. EAS device builds
    // link against it but don't embed it, so the app aborts at launch with
    // "Library not loaded: ReactNativeDependencies". Building RN from
    // source skips that flow entirely (Podfile reads
    // ios.buildReactNativeFromSource and clears the env flags). Tradeoff:
    // slightly longer iOS pod install + first build, no behavioural change.
    ["expo-build-properties", { ios: { buildReactNativeFromSource: true } }],
  ],
  experiments: {
    typedRoutes: true,
  },
});
