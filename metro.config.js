const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Keep virtual-module patching enabled so production exports can hash the
  // generated CSS; css-interop still writes platform files in production.
  forceWriteFileSystem: false,
});
