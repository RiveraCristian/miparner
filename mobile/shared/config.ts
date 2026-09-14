/**
 * A qué servidor habla la app.
 *
 * La decisión la toma `__DEV__`, que React Native pone en `true` al compilar en
 * depuración y en `false` en release. Así una misma rama sirve para las dos
 * cosas: mientras desarrollas sigues contra tu backend local, y el APK o el
 * bundle que subes a la tienda apunta a producción sin tener que acordarse de
 * cambiar nada. Olvidarlo es justo el error que manda una app a la tienda
 * hablando con `localhost`.
 */
import { Platform } from "react-native";

/** Servidor de producción. Sirve el panel, la API y el tiempo real. */
const PRODUCCION = "https://miparner.com";

/**
 * En desarrollo:
 *  · Android emulador → 10.0.2.2 es la máquina anfitriona vista desde dentro.
 *  · iOS simulador    → localhost.
 */
const HOST_DEV = Platform.OS === "android" ? "10.0.2.2" : "localhost";

/**
 * Puerto del backend en desarrollo. Debe coincidir con `PORT` de backend/.env.
 * Está en 4100 y no en 4000 porque el 4000 suele estar ocupado por otro
 * proyecto; es el único lugar donde vive este número.
 */
const PUERTO_DEV = 4100;

const BASE = __DEV__ ? `http://${HOST_DEV}:${PUERTO_DEV}` : PRODUCCION;

export const API_URL = `${BASE}/api/v1`;
export const SOCKET_URL = BASE;

/** Útil para mostrar en pantallas de diagnóstico a qué servidor se está hablando. */
export const EN_DESARROLLO = __DEV__;
