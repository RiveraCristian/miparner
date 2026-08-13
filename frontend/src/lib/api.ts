const TOKEN_KEY = "miparner_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

interface Opts {
  method?: string;
  body?: unknown;
}

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Error ${res.status}`);
  }
  return json as T;
}
