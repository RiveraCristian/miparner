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

/**
 * Mapa · MapLibre + OpenFreeMap.
 *
 * Estilo vectorial servido gratis por OpenFreeMap (datos de OpenStreetMap):
 * sin clave de API, sin cuota y sin registro. Cambiar de proveedor —MapTiler,
 * Protomaps, un servidor propio— es cambiar esta única URL.
 */
export const MAPA_ESTILO_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Centro por defecto mientras no hay coordenadas: Santiago. */
export const MAPA_CENTRO_DEFECTO = { lat: -33.4372, lng: -70.6506 };
export const MAPA_ZOOM_DEFECTO = 12.5;
