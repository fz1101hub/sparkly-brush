import { describe, expect, it } from "vitest";

import config from "../app.config";

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

  it("does not enable Expo audio background playback", () => {
    expect(pluginOptions("expo-audio")).toMatchObject({
      enableBackgroundPlayback: false,
      microphonePermission: false,
      recordAudioAndroid: false,
    });
  });
});
