import type { ExpoConfig } from "expo/config";

const rawBundleId = "com.app.sparklybrush";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".")
    .replace(/[^a-zA-Z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase()
    .split(".")
    .map((segment) => {
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "com.app.sparklybrush";
const env = {
  appName: "Sparkly Brush",
  appSlug: "sparkly-brush",
  scheme: "sparklybrush",
  iosBundleId: bundleId,
  androidPackage: bundleId,
};
const e2eBuild = process.env.EXPO_PUBLIC_E2E === "1";

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  // The theme provider follows the system scheme on every platform; "light" would force
  // Android to light while the splash plugin already makes iOS automatic.
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    // Portrait only also on iPad: without full screen, iPadOS multitasking ignores the lock.
    requireFullScreen: true,
    // The backup picker must reach iCloud Drive, where families usually keep the .brushlings file.
    usesIcloudStorage: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
      // NSBluetoothAlwaysUsageDescription comes from the react-native-ble-plx plugin below and
      // is localized through `locales` (InfoPlist.strings) in the five supported languages.
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#EAF4FF",
      foregroundImage: "./assets/images/android-icon-foreground.png",
    },
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    blockedPermissions: [
      // react-native-ble-plx retains scoped sdk-23 location declarations for Android 11
      // and below; block unscoped declarations contributed by its Android AAR.
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ],
    intentFilters: [
      {
        action: "VIEW",
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  locales: {
    it: "./locales/native/it.json",
    en: "./locales/native/en.json",
    de: "./locales/native/de.json",
    fr: "./locales/native/fr.json",
    es: "./locales/native/es.json",
  },
  plugins: [
    // The generated /_sitemap route must not ship: unknown links land on +not-found instead.
    ["expo-router", { sitemap: false }],
    "expo-asset",
    ["expo-document-picker", { iCloudContainerEnvironment: "Production" }],
    "expo-font",
    "./plugins/with-android-orientation-compat",
    [
      "expo-localization",
      {
        supportedLocales: {
          ios: ["it", "en", "de", "fr", "es"],
          android: ["it", "en", "de", "fr", "es"],
        },
      },
    ],
    "expo-sharing",
    "expo-sqlite",
    "expo-status-bar",
    [
      "expo-audio",
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
      },
    ],
    [
      "react-native-ble-plx",
      {
        isBackgroundEnabled: false,
        neverForLocation: true,
        // English fallback; `locales` provides the translated InfoPlist.strings.
        bluetoothAlwaysPermission:
          "Sparkly Brush uses Bluetooth to connect to your Philips Sonicare for Kids toothbrush and record brushing sessions.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 220,
        resizeMode: "contain",
        backgroundColor: "#F7F9FF",
        dark: {
          backgroundColor: "#10162A",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: e2eBuild ? ["x86_64"] : ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
