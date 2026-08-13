import { Platform } from "react-native";

// URL del backend en desarrollo:
// - Android emulador: 10.0.2.2 apunta al host
// - iOS simulador / web: localhost
// En producción, reemplazar por la URL pública (https / wss).
const HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_URL = `http://${HOST}:4000/api/v1`;
export const SOCKET_URL = `http://${HOST}:4000`;
