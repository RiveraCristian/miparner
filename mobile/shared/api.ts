import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config";

const TOKEN_KEY = "miparner_token";
let memToken: string | null = null;

export async function loadToken(): Promise<string | null> {
  if (memToken) return memToken;
  memToken = await AsyncStorage.getItem(TOKEN_KEY);
  return memToken;
}
export async function setToken(t: string) {
  memToken = t;
  await AsyncStorage.setItem(TOKEN_KEY, t);
}
export async function clearToken() {
  memToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

interface Opts {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

/**
 * Error que viene del servidor y cuyo texto está escrito para la persona.
 *
 * Se marca con una propiedad en vez de con una subclase de `Error`: el
 * `instanceof` de una subclase de `Error` no es fiable según cómo se compile
 * el código, y esto es una comprobación que no puede fallar.
 *
 * Sirve para no enseñar en pantalla el texto de un fallo interno. Un error de
 * programación lleva un mensaje en inglés pensado para quien lo arregla, no
 * para quien usa la aplicación.
 */
const MARCA_SERVIDOR = "__miparnerServidor";

export function errorServidor(mensaje: string): Error {
  const e = new Error(mensaje);
  (e as Error & Record<string, boolean>)[MARCA_SERVIDOR] = true;
  return e;
}

/** ¿El texto de este error se puede enseñar tal cual? */
export function esMensajeParaLaPersona(e: unknown): e is Error {
  return (
    e instanceof Error &&
    (e as Error & Record<string, unknown>)[MARCA_SERVIDOR] === true &&
    !!e.message
  );
}

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const token = opts.auth === false ? null : await loadToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) throw errorServidor(json?.error?.message ?? `Error ${res.status}`);
  return json as T;
}

/** Archivo elegido en el dispositivo, tal como lo entrega el selector nativo. */
export interface ArchivoLocal {
  uri: string;
  name: string;
  type: string;
}

/**
 * Sube un documento (multipart/form-data).
 *
 * No se fija `Content-Type` a mano: `fetch` tiene que poner el boundary del
 * multipart. Solo viaja el Bearer token.
 */
export async function apiUpload<T = unknown>(
  path: string,
  archivo: ArchivoLocal,
  campos: Record<string, string> = {},
  campoArchivo = "archivo",
): Promise<T> {
  const token = await loadToken();
  const form = new FormData();
  Object.entries(campos).forEach(([k, v]) => form.append(k, v));
  form.append(campoArchivo, archivo as unknown as Blob);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) throw errorServidor(json?.error?.message ?? `Error ${res.status}`);
  return json as T;
}

/**
 * Arma la parte `?a=1&b=2` de una URL.
 *
 * Por qué no se usa `URLSearchParams`: React Native no trae la clase del
 * navegador, sino un sustituto propio que solo implementa `append` y
 * `toString`. `set`, `get`, `has` y `delete` existen pero lanzan
 * "URLSearchParams.set is not implemented" en cuanto se llaman. En el
 * emulador con Metro pasa igual, pero el error se veía como un aviso rojo
 * dentro del buscador y era fácil confundirlo con un problema de red.
 *
 * Los valores `undefined` y `null` se omiten, que es lo que se espera al
 * pasar un parámetro opcional.
 */
export function consulta(params: Record<string, string | number | undefined | null>): string {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join("&")}` : "";
}
