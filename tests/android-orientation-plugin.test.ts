import { describe, expect, it } from "vitest";

import {
  PROPERTY_NAME,
  addOrientationCompatProperty,
} from "../plugins/with-android-orientation-compat";

type Manifest = Parameters<typeof addOrientationCompatProperty>[0];

function manifestWith(properties?: { $: Record<string, string> }[]): Manifest {
  return {
    manifest: {
      application: [{ $: { "android:name": ".MainApplication" }, property: properties }],
    },
  } as unknown as Manifest;
}

describe("plugin Android per l'orientamento su schermi grandi", () => {
  it("aggiunge una sola volta la proprietà di compatibilità all'application", () => {
    const manifest = addOrientationCompatProperty(manifestWith());
    const properties = manifest.manifest.application?.[0].property ?? [];
    expect(properties).toEqual([{ $: { "android:name": PROPERTY_NAME, "android:value": "true" } }]);

    const again = addOrientationCompatProperty(manifest);
    expect(again.manifest.application?.[0].property).toHaveLength(1);
  });

  it("conserva le proprietà già dichiarate", () => {
    const existing = { $: { "android:name": "android.other", "android:value": "x" } };
    const manifest = addOrientationCompatProperty(manifestWith([existing]));
    expect(manifest.manifest.application?.[0].property).toEqual([
      existing,
      { $: { "android:name": PROPERTY_NAME, "android:value": "true" } },
    ]);
  });
});
