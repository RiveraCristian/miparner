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
