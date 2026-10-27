import { describe, expect, it } from "vitest";

import { contentLocale, CONTENT_LOCALES, SUPPORTED_LOCALES } from "@/lib/locale-types";
import { pluralCategory, translate } from "@/lib/i18n";
import { addShortcutsMetaData, SHORTCUTS_XML } from "../plugins/with-android-shortcuts";

type Manifest = Parameters<typeof addShortcutsMetaData>[0];

describe("scorciatoie dell'app (voce 43)", () => {
  it("collega una sola volta le scorciatoie all'attività principale", () => {
    const manifest = {
      manifest: {
        application: [{ $: { "android:name": ".MainApplication" }, activity: [{ $: { "android:name": ".MainActivity" }, "intent-filter": [{ action: [{ $: { "android:name": "android.intent.action.MAIN" } }], category: [{ $: { "android:name": "android.intent.category.LAUNCHER" } }] }] }] }],
      },
    } as unknown as Manifest;
    const once = addShortcutsMetaData(manifest);
    const twice = addShortcutsMetaData(once);
    const activity = twice.manifest.application?.[0].activity?.[0] as unknown as { "meta-data": unknown[] };
    expect(activity["meta-data"]).toEqual([{ $: { "android:name": "android.app.shortcuts", "android:resource": "@xml/shortcuts" } }]);
    expect(SHORTCUTS_XML("sparklybrush")).toContain('android:data="sparklybrush://start"');
  });
});

describe("altre lingue (voce 71)", () => {
  it("le lingue nuove leggono i contenuti educativi in inglese", () => {
    expect(SUPPORTED_LOCALES).toEqual(expect.arrayContaining(["pt", "nl", "pl"]));
    expect(contentLocale("pt")).toBe("en");
    expect(contentLocale("de")).toBe("de");
    expect(CONTENT_LOCALES).not.toContain("pl");
  });

  it("il polacco ha tre forme di plurale", () => {
    expect([1, 2, 4, 5, 12, 14, 22, 25, 101].map((count) => pluralCategory("pl", count))).toEqual([
      "one", "few", "few", "many", "many", "many", "few", "many", "many",
    ]);
    expect(translate("pl", "widget.streak", { count: 3 })).toBe("dni z rzędu");
    expect(translate("pl", "widget.streak", { count: 1 })).toBe("dzień z rzędu");
    expect(translate("pt", "widget.streak", { count: 1 })).toBe("dia seguido");
    expect(translate("nl", "widget.streak", { count: 2 })).toBe("dagen op rij");
  });
});
