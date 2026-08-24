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
  if (!res.ok) throw new Error(json?.error?.message ?? `Error ${res.status}`);
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
): Promise<T> {
  const token = await loadToken();
  const form = new FormData();
  Object.entries(campos).forEach(([k, v]) => form.append(k, v));
  form.append("archivo", archivo as unknown as Blob);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) throw new Error(json?.error?.message ?? `Error ${res.status}`);
  return json as T;
}
