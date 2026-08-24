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

/**
 * Descarga un binario protegido (por ejemplo, el documento de validación de
 * una persona). Una etiqueta <img src> no puede enviar el Bearer token, así
 * que se pide con fetch y se expone como object URL.
 *
 * Quien lo use debe liberar la URL con `URL.revokeObjectURL` al desmontar.
 */
export async function apiBlobUrl(path: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`No se pudo abrir el archivo (${res.status})`);
  return URL.createObjectURL(await res.blob());
}
