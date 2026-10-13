const { withAndroidManifest } = require("expo/config-plugins");

// Android 16 ignores `android:screenOrientation` on large screens (600 dp and wider) for apps
// targeting API 36. The app is designed for portrait phones, so opt out of that behaviour with
// the compatibility property Google provides for this transition.
const PROPERTY_NAME = "android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY";

function addOrientationCompatProperty(manifest) {
  const application = manifest.manifest.application?.[0];
  if (!application) return manifest;
  const properties = application.property ?? [];
  const alreadyPresent = properties.some(
    (property) => property.$?.["android:name"] === PROPERTY_NAME,
  );
  if (!alreadyPresent) {
    properties.push({ $: { "android:name": PROPERTY_NAME, "android:value": "true" } });
  }
  application.property = properties;
  return manifest;
}

function withAndroidOrientationCompat(config) {
  return withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = addOrientationCompatProperty(modConfig.modResults);
    return modConfig;
  });
}

module.exports = withAndroidOrientationCompat;
module.exports.addOrientationCompatProperty = addOrientationCompatProperty;
module.exports.PROPERTY_NAME = PROPERTY_NAME;
