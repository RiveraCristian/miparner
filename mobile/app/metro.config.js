const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const sharedRoot = path.resolve(__dirname, "../shared");

// Fuera del vigilado: la salida del build nativo. CMake crea y borra directorios
// temporales dentro de android/app/.cxx, y el watcher de Metro muere al intentar
// vigilar uno que ya desapareció. Además evita rastrear cientos de MB inútiles.
const SALIDA_NATIVA = new RegExp(
  "[\\\\/]android[\\\\/](\\.gradle|\\.cxx|build|app[\\\\/](build|\\.cxx))[\\\\/].*",
);

const config = {
  watchFolders: [sharedRoot, path.resolve(__dirname, "../node_modules")],
  resolver: {
    // Workspace: dependencias hoisteadas a mobile/node_modules + fallback local.
    nodeModulesPaths: [path.resolve(__dirname, "node_modules"), path.resolve(__dirname, "../node_modules")],
    blockList: SALIDA_NATIVA,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
