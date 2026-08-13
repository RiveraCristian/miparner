const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const sharedRoot = path.resolve(__dirname, "../shared");

const config = {
  watchFolders: [sharedRoot, path.resolve(__dirname, "../node_modules")],
  resolver: {
    // Workspace: dependencias hoisteadas a mobile/node_modules + fallback local.
    nodeModulesPaths: [path.resolve(__dirname, "node_modules"), path.resolve(__dirname, "../node_modules")],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
