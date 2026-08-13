import { Platform } from "react-native";

// URL del backend en desarrollo:
// - Android emulador: 10.0.2.2 apunta al host
// - iOS simulador / web: localhost
// En producción, reemplazar por la URL pública (https / wss).
const HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

/**
 * Puerto del backend. Debe coincidir con `PORT` del backend (backend/.env).
 * Si el 4000 está ocupado por otro proyecto, se levanta el backend en otro
 * puerto y se cambia este número: es el único lugar donde vive.
 */
const PUERTO = 4100;

export const API_URL = `http://${HOST}:${PUERTO}/api/v1`;
export const SOCKET_URL = `http://${HOST}:${PUERTO}`;
