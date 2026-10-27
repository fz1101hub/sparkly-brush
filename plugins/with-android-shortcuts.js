const fs = require("fs");
const path = require("path");
const { AndroidConfig, withAndroidManifest, withDangerousMod, withStringsXml } = require("expo/config-plugins");

// App shortcuts (voce 43): a long press on the icon, or «Hey Google, open…», offers «Start
// brushing», which opens sparklybrush://start and starts the guided timer. Labels come from the
// strings of each language (locales/native/*.json, "android" section).
const SHORTCUTS_XML = (scheme) => `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut
    android:shortcutId="start_brushing"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_brush_short"
    android:shortcutLongLabel="@string/shortcut_brush_long">
    <intent android:action="android.intent.action.VIEW" android:data="${scheme}://start" />
  </shortcut>
</shortcuts>
`;

const DEFAULT_STRINGS = {
  shortcut_brush_short: "Brush teeth",
  shortcut_brush_long: "Start brushing",
};

function addShortcutsMetaData(manifest) {
  const activity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
  const metaData = activity["meta-data"] ?? [];
  if (!metaData.some((item) => item.$?.["android:name"] === "android.app.shortcuts")) {
    metaData.push({ $: { "android:name": "android.app.shortcuts", "android:resource": "@xml/shortcuts" } });
  }
  activity["meta-data"] = metaData;
  return manifest;
}

function withAndroidShortcuts(config) {
  const scheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme;
  config = withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = addShortcutsMetaData(modConfig.modResults);
    return modConfig;
  });
  config = withStringsXml(config, (modConfig) => {
    for (const [name, value] of Object.entries(DEFAULT_STRINGS)) {
      modConfig.modResults = AndroidConfig.Strings.setStringItem(
        [{ $: { name, translatable: "true" }, _: value }],
        modConfig.modResults,
      );
    }
    return modConfig;
  });
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const directory = path.join(modConfig.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml");
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, "shortcuts.xml"), SHORTCUTS_XML(scheme));
      return modConfig;
    },
  ]);
}

module.exports = withAndroidShortcuts;
module.exports.addShortcutsMetaData = addShortcutsMetaData;
module.exports.SHORTCUTS_XML = SHORTCUTS_XML;
