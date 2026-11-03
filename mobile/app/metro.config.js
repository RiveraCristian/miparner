const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const sharedRoot = path.resolve(__dirname, "../shared");

// Fuera del vigilado: la salida del build nativo. CMake crea y borra directorios
// temporales dentro de android/app/.cxx, y el watcher de Metro muere al intentar
// vigilar uno que ya desapareció. Además evita rastrear cientos de MB inútiles.
const SALIDA_NATIVA = new RegExp(
  "[\\\\/]android[\\\\/](\\.gradle|\\.cxx|build|app[\\\\/](build|\\.cxx))[\\\\/].*",
);

// Cuantos procesos de transformacion levanta Metro. Por defecto uno por nucleo:
// en un equipo de 16 nucleos son 16 procesos de Node a la vez, y si la memoria
// libre escasea el empaquetado muere con "JavaScript heap out of memory" aunque
// el proyecto sea pequeño (los montones que aparecen en el error son de 18 MB).
// Sin la variable definida no cambia nada; al compilar en un equipo cargado se
// pone METRO_WORKERS=3 y entra sin pelear por la RAM.
const trabajadores = Number(process.env.METRO_WORKERS) || undefined;

const config = {
  ...(trabajadores ? { maxWorkers: trabajadores } : {}),
  watchFolders: [sharedRoot, path.resolve(__dirname, "../node_modules")],
  resolver: {
    // Workspace: dependencias hoisteadas a mobile/node_modules + fallback local.
    nodeModulesPaths: [path.resolve(__dirname, "node_modules"), path.resolve(__dirname, "../node_modules")],
    blockList: SALIDA_NATIVA,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
