import { describe, expect, it } from "vitest";

import config from "../app.config";
import nativeEnglish from "../locales/native/en.json";

function pluginOptions(name: string): Record<string, unknown> {
  const plugin = config.plugins?.find(
    (candidate) => Array.isArray(candidate) && candidate[0] === name,
  );

  expect(plugin, `Missing ${name} config plugin`).toBeDefined();
  return (plugin as [string, Record<string, unknown>])[1];
}

describe("native permission configuration", () => {
  it("blocks unscoped BLE location permissions while retaining never-for-location BLE", () => {
    expect(config.android?.blockedPermissions).toEqual(
      expect.arrayContaining([
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ]),
    );

    expect(pluginOptions("react-native-ble-plx")).toMatchObject({
      neverForLocation: true,
    });
  });

  it("describes the Bluetooth permission once, through the BLE plugin, with the English fallback", () => {
    expect(config.ios?.infoPlist).not.toHaveProperty("NSBluetoothAlwaysUsageDescription");
    expect(pluginOptions("react-native-ble-plx").bluetoothAlwaysPermission).toBe(
      nativeEnglish.ios.NSBluetoothAlwaysUsageDescription,
    );
    for (const locale of ["it", "en", "de", "fr", "es"]) {
      expect(config.locales).toHaveProperty(locale, `./locales/native/${locale}.json`);
    }
  });

  it("follows the system colour scheme on both platforms with a matching dark splash", () => {
    expect(config.userInterfaceStyle).toBe("automatic");
    const splash = pluginOptions("expo-splash-screen") as { backgroundColor: string; dark: { backgroundColor: string } };
    expect(splash.dark.backgroundColor).not.toBe(splash.backgroundColor);
  });

  it("keeps portrait on iPad and large Android screens and ships no sitemap route", () => {
    expect(config.orientation).toBe("portrait");
    expect(config.ios?.requireFullScreen).toBe(true);
    expect(config.plugins).toContain("./plugins/with-android-orientation-compat");
    expect(pluginOptions("expo-router")).toMatchObject({ sitemap: false });
  });

  it("lets the backup picker reach iCloud Drive and ships EAS profiles with remote build numbers", async () => {
    expect(config.ios?.usesIcloudStorage).toBe(true);
    expect(pluginOptions("expo-document-picker")).toMatchObject({ iCloudContainerEnvironment: "Production" });
    const eas = (await import("../eas.json")).default as {
      cli: { appVersionSource: string };
      build: Record<string, { autoIncrement?: boolean; distribution?: string }>;
    };
    expect(eas.cli.appVersionSource).toBe("remote");
    expect(eas.build.production.autoIncrement).toBe(true);
    expect(eas.build.preview.distribution).toBe("internal");
  });

  it("lists only plugins whose packages the app uses", () => {
    const names = (config.plugins ?? []).map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
    expect(names).not.toContain("expo-image");
  });

  it("does not enable Expo audio background playback", () => {
    expect(pluginOptions("expo-audio")).toMatchObject({
      enableBackgroundPlayback: false,
      microphonePermission: false,
      recordAudioAndroid: false,
    });
  });
});
