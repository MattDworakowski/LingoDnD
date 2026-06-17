// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Bundle narration audio (lives in content/) as assets.
if (!config.resolver.assetExts.includes("mp3")) {
  config.resolver.assetExts.push("mp3");
}

module.exports = config;
