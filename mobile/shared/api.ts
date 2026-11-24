import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config";

/* ----------------------------------------------------------------- Sesión */

/*
 * Por qué se guardan dos tokens y no uno.
 *
 * El token de acceso dura quince minutos (JWT_ACCESS_TTL en el backend). Antes
 * solo se guardaba ése, así que bastaba cerrar la app un rato para que al
 * volver /auth/me respondiera 401 y la app pidiera correo y contraseña otra
 * vez. Para quien usa lector de pantalla, volver a escribirlos es lo más caro
 * de toda la app. El backend ya entregaba un token de renovación de treinta
 * días: ahora se guarda y se usa para pedir un acceso nuevo sin molestar.
 *
 * La hora de vencimiento se guarda en la hora del teléfono (instante de
 * recepción + duración del token) y no se compara con el `exp` del JWT: si el
 * reloj del teléfono va adelantado, comparar con `exp` haría creer que todo
 * token está vencido y se renovaría en cada petición.
 */
const TOKEN_KEY = "miparner_token";
const REFRESH_KEY = "miparner_refresh";
const EXPIRA_KEY = "miparner_token_expira";
/** Última copia conocida del usuario: permite abrir la app sin red. */
const USUARIO_KEY = "miparner_usuario";

/** Se renueva un poco antes de que venza, para no perder una petición en vuelo. */
const MARGEN_RENOVACION_MS = 60_000;

let memToken: string | null = null;
let memRefresh: string | null = null;
/** Instante (reloj del teléfono, ms) en que vence `memToken`; null = desconocido. */
let memExpira: number | null = null;
let carga: Promise<void> | null = null;

/**
 * Sube cada vez que empieza o termina una sesión.
 *
 * Una renovación que sale antes de cerrar sesión puede volver después: sin
 * este contador escribiría tokens nuevos sobre una sesión ya cerrada y la
 * persona "reaparecería" logueada.
 */
let generacion = 0;

function cargarSesion(): Promise<void> {
  if (!carga) {
    carga = AsyncStorage.multiGet([TOKEN_KEY, REFRESH_KEY, EXPIRA_KEY]).then((pares) => {
      const v = Object.fromEntries(pares);
      memToken = v[TOKEN_KEY] ?? null;
      memRefresh = v[REFRESH_KEY] ?? null;
      const expira = Number(v[EXPIRA_KEY]);
      memExpira = Number.isFinite(expira) && expira > 0 ? expira : null;
    });
  }
  return carga;
}

/**
 * Cuánto dura un JWT según sus propios `iat` y `exp`, en milisegundos.
 *
 * Solo se lee la carga útil; la firma la comprueba el servidor. Si no se puede
 * leer, se devuelve null y la renovación queda en manos del 401.
 */
function duracionJwt(token: string): number | null {
  try {
    const atob = (globalThis as { atob?: (s: string) => string }).atob;
    const parte = token.split(".")[1];
    if (!atob || !parte) return null;
    const b64 = parte.replace(/-/g, "+").replace(/_/g, "/");
    const datos = JSON.parse(atob(b64 + "===".slice((b64.length + 3) % 4))) as {
      iat?: number;
      exp?: number;
    };
    if (typeof datos.iat !== "number" || typeof datos.exp !== "number") return null;
    return (datos.exp - datos.iat) * 1000;
  } catch {
    return null;
  }
}

async function guardarTokens(accessToken: string, refreshToken: string) {
  const duracion = duracionJwt(accessToken);
  memToken = accessToken;
  memRefresh = refreshToken;
  memExpira = duracion !== null ? Date.now() + duracion : null;
  carga = Promise.resolve();
  await AsyncStorage.multiSet([
    [TOKEN_KEY, accessToken],
    [REFRESH_KEY, refreshToken],
    [EXPIRA_KEY, memExpira !== null ? String(memExpira) : ""],
  ]);
}

/** Respuesta de /auth/login, /auth/register y /auth/refresh. */
export interface TokensSesion {
  accessToken: string;
  refreshToken: string;
}

/** Guarda la sesión recién abierta (login o registro). */
export async function guardarSesion(t: TokensSesion) {
  generacion++;
  await guardarTokens(t.accessToken, t.refreshToken);
}

/** ¿Hay una sesión guardada en el teléfono (aunque su acceso esté vencido)? */
export async function haySesionGuardada(): Promise<boolean> {
  await cargarSesion();
  return !!(memToken || memRefresh);
}

async function borrarSesionLocal() {
  generacion++;
  memToken = null;
  memRefresh = null;
  memExpira = null;
  carga = Promise.resolve();
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, EXPIRA_KEY, USUARIO_KEY]);
}

/** Avisa al servidor que ese token de renovación ya no se usará. Sin esperar. */
function revocarEnServidor(refreshToken: string | null) {
  if (!refreshToken) return;
  // Si no hay red o el backend aún no tiene la ruta, el token vence solo a
  // los treinta días: no vale la pena retener a la persona por esto.
  fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {});
}

/** Cierre de sesión pedido por la persona: borra todo y revoca en el servidor. */
export async function cerrarSesion() {
  await cargarSesion();
  const refresh = memRefresh;
  await borrarSesionLocal();
  revocarEnServidor(refresh);
}

/* Copia del usuario para abrir sin red. */

export async function guardarUsuarioEnCache(datos: unknown) {
  try {
    await AsyncStorage.setItem(USUARIO_KEY, JSON.stringify(datos));
  } catch {
    /* sin copia la app igual funciona: solo no abrirá sin red */
  }
}

export async function leerUsuarioEnCache<T>(): Promise<T | null> {
  try {
    const crudo = await AsyncStorage.getItem(USUARIO_KEY);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

/* Aviso de sesión cerrada por el servidor. */

const oyentesCierre = new Set<() => void>();

/**
 * Se llama cuando el servidor rechaza el token de renovación: la sesión ya no
 * existe (venció, se revocó o la cuenta se desactivó) y hay que volver al
 * acceso. Devuelve la función para dejar de escuchar.
 */
export function alCerrarseLaSesion(fn: () => void): () => void {
  oyentesCierre.add(fn);
  return () => oyentesCierre.delete(fn);
}

const MARCA_SESION_CERRADA = "__miparnerSesionCerrada";

function errorSesionCerrada(): Error {
  const e = errorServidor("Tu sesión terminó. Vuelve a iniciar sesión.");
  (e as Error & Record<string, boolean>)[MARCA_SESION_CERRADA] = true;
  return e;
}

/**
 * ¿El error significa que la sesión ya no existe?
 *
 * Distingue "el servidor dijo que no" de "no hubo red". Solo lo primero
 * justifica mandar a la persona a la pantalla de acceso.
 */
export function esSesionCerrada(e: unknown): boolean {
  return e instanceof Error && (e as Error & Record<string, unknown>)[MARCA_SESION_CERRADA] === true;
}

/* Renovación. */

let renovacionEnCurso: Promise<string> | null = null;

/**
 * Pide un token de acceso nuevo con el de renovación.
 *
 * Una sola renovación a la vez: el backend rota el token de renovación (revoca
 * el usado y entrega otro), así que dos renovaciones en paralelo con el mismo
 * token harían que la segunda fallara y cerrara la sesión. Las peticiones que
 * reciben 401 a la vez comparten la misma promesa.
 *
 * `rechazado` es el token que el servidor acaba de rechazar: si ya hay otro
 * distinto en memoria, alguien lo renovó entretanto y basta con usarlo.
 *
 * Lanza `esSesionCerrada` si el servidor rechaza la renovación; cualquier otro
 * error (sin red, servidor caído) se propaga tal cual y la sesión se conserva.
 */
export async function renovarToken(rechazado?: string | null): Promise<string> {
  await cargarSesion();
  if (rechazado && memToken && memToken !== rechazado) return memToken;
  if (!renovacionEnCurso) {
    renovacionEnCurso = pedirRenovacion().finally(() => {
      renovacionEnCurso = null;
    });
  }
  return renovacionEnCurso;
}

async function pedirRenovacion(): Promise<string> {
  const gen = generacion;
  const refresh = memRefresh;
  if (!refresh) {
    await sesionRechazada();
    throw errorSesionCerrada();
  }

  // Un fallo de red sale de aquí como excepción y no toca la sesión.
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  const json = (await res.json().catch(() => null)) as
    | (Partial<TokensSesion> & { error?: { message?: string } })
    | null;

  // La sesión cambió mientras se renovaba (cerró sesión o entró otra cuenta):
  // estos tokens ya no son de nadie.
  if (gen !== generacion) {
    if (res.ok) revocarEnServidor(json?.refreshToken ?? null);
    if (memToken) return memToken;
    throw errorSesionCerrada();
  }

  // 401: token vencido, revocado o cuenta desactivada. 400: token mal formado.
  if (res.status === 401 || res.status === 400) {
    await sesionRechazada();
    throw errorSesionCerrada();
  }
  if (!res.ok || !json?.accessToken || !json.refreshToken) {
    throw errorServidor(json?.error?.message ?? `Error ${res.status}`);
  }

  await guardarTokens(json.accessToken, json.refreshToken);
  return json.accessToken;
}

async function sesionRechazada() {
  await borrarSesionLocal();
  oyentesCierre.forEach((fn) => fn());
}

/**
 * Token de acceso listo para usar, renovado antes si está por vencer.
 *
 * Es lo que hay que poner en cualquier cabecera Authorization armada a mano
 * (reproductor de audio, socket, subidas). Sin red devuelve el token que haya,
 * aunque esté vencido: el servidor responderá 401 y se reintentará después.
 * Devuelve null solo si no hay sesión.
 */
export async function tokenVigente(): Promise<string | null> {
  await cargarSesion();
  if (!memToken && !memRefresh) return null;
  const vencido = !memToken || (memExpira !== null && Date.now() > memExpira - MARGEN_RENOVACION_MS);
  if (!vencido) return memToken;
  try {
    return await renovarToken(memToken);
  } catch (e) {
    return esSesionCerrada(e) ? null : memToken;
  }
}

/**
 * Compatibilidad: quien lee el token para armar una cabecera a mano recibe
 * ahora uno vigente, sin tener que cambiar su código.
 */
export const loadToken = tokenVigente;

/**
 * Hace una petición autenticada y, si el servidor responde 401, renueva el
 * token una vez y la repite.
 *
 * `hacer` recibe el token y devuelve la respuesta de `fetch`; se puede llamar
 * dos veces, así que no debe consumir nada que no se pueda reenviar.
 *
 * Si tras renovar vuelve a dar 401, se entrega esa respuesta: ya no es un
 * problema de sesión (por ejemplo, "la contraseña actual no es correcta"
 * también responde 401) y la persona debe ver ese mensaje.
 */
export async function conReintento401(
  hacer: (token: string | null) => Promise<Response>,
): Promise<Response> {
  const token = await tokenVigente();
  const res = await hacer(token);
  if (res.status !== 401 || !token) return res;
  // Sin red o sesión cerrada, la excepción sube tal cual.
  const nuevo = await renovarToken(token);
  return hacer(nuevo);
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
  const body = opts.body ? JSON.stringify(opts.body) : undefined;
  const pedir = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  // Las rutas públicas (login, registro) no llevan token ni se reintentan: un
  // 401 ahí es "credenciales inválidas", no una sesión vencida.
  const res = opts.auth === false ? await pedir(null) : await conReintento401(pedir);
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
 *
 * `archivo.uri` debe ser `file://`. En Android, React Native calcula el
 * tamaño de la parte con `InputStream.available()`, que para muchos `content://`
 * (Drive, Google Fotos, descargas en la nube) devuelve 0: la cabecera anuncia
 * menos bytes de los que se mandan y OkHttp aborta la subida con un
 * "Network request failed". Quien elija con el selector de documentos tiene
 * que copiar antes el archivo a la caché (`keepLocalCopy`).
 *
 * Todos los fallos salen con un texto que se puede enseñar tal cual: subir un
 * archivo es justo donde más falla la red del teléfono, y un "Network request
 * failed" en inglés no le dice a la persona qué hacer.
 */
export async function apiUpload<T = unknown>(
  path: string,
  archivo: ArchivoLocal,
  campos: Record<string, string> = {},
  campoArchivo = "archivo",
): Promise<T> {
  const form = new FormData();
  Object.entries(campos).forEach(([k, v]) => form.append(k, v));
  form.append(campoArchivo, archivo as unknown as Blob);

  let res: Response;
  try {
    // Con reintento: si el token caducó durante la subida, se renueva y se
    // reenvía una vez. Reenviar el mismo FormData con un uri file:// es seguro.
    res = await conReintento401((token) =>
      fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      }),
    );
  } catch (e) {
    // "Tu sesión terminó…" ya viene escrito para la persona.
    if (esSesionCerrada(e)) throw e;
    throw errorServidor(
      "No pudimos enviar el archivo. Revisa tu conexión a internet y vuelve a intentarlo.",
    );
  }
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) {
    const mensaje = json?.error?.message;
    if (mensaje) throw errorServidor(mensaje);
    // Sin JSON, la respuesta no la escribió el backend sino el proxy: 413 es
    // el tope de tamaño de Caddy; el resto, el servidor caído o reiniciándose.
    throw errorServidor(
      res.status === 413
        ? "El archivo es demasiado grande. Prueba con una foto desde la galería, que se envía más liviana."
        : "El servidor no respondió como esperábamos. Vuelve a intentarlo en unos minutos.",
    );
  }
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
