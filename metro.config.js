const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, "node_modules/react-native-css-interop/.cache"),
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Keep virtual-module patching enabled so production exports can hash the
  // generated CSS; css-interop still writes platform files in production.
  forceWriteFileSystem: false,
});
