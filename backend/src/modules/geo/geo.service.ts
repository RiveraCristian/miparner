/**
 * Búsqueda de direcciones (geocodificación).
 *
 * Usa Nominatim, el buscador de OpenStreetMap: gratuito, sin clave y con los
 * mismos datos que ya pinta el mapa, así que lo que la persona busca y lo que
 * ve coinciden.
 *
 * Por qué pasa por el backend y no lo llama la app directamente:
 *
 *  · Nominatim limita a una petición por segundo POR CLIENTE y exige
 *    identificarse. Mil teléfonos escribiendo en el buscador nos dejarían
 *    bloqueados en una tarde; desde aquí hay un solo cliente, con su
 *    identificación y su freno.
 *  · Lo que se busca se cachea. Las direcciones de Santiago se repiten mucho:
 *    el centro de alto rendimiento lo va a buscar mucha gente.
 *  · Cambiar de proveedor —Photon, MapTiler, uno propio— no obliga a publicar
 *    una versión nueva de la app.
 */
import { AppError } from "../../lib/http-error";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * Nominatim exige identificar la aplicación con un contacto real. Omitirlo o
 * falsearlo es motivo de bloqueo, y además sería mentir sobre quién consulta.
 */
const IDENTIFICACION = "Miparner/1.0 (https://miparner.com; contacto@miparner.com)";

/** Chile. Buscar en todo el mundo devolvería ruido inútil. */
const PAIS = "cl";

export interface Lugar {
  nombre: string;
  /** Línea completa tal como la devuelve el buscador. */
  direccion: string;
  lat: number;
  lng: number;
  /** Para distinguir una calle de un edificio o un parque. */
  tipo: string | null;
}

/* ------------------------------------------------------------------ Caché */

interface Entrada {
  lugares: Lugar[];
  at: number;
}

const CACHE = new Map<string, Entrada>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Las direcciones no se mueven.
const CACHE_MAX = 500;

/* ------------------------------------------------- Freno de una por segundo */

let ultimaPeticion = 0;
const MINIMO_ENTRE_PETICIONES_MS = 1100;

async function esperarTurno() {
  const desde = Date.now() - ultimaPeticion;
  if (desde < MINIMO_ENTRE_PETICIONES_MS) {
    await new Promise((r) => setTimeout(r, MINIMO_ENTRE_PETICIONES_MS - desde));
  }
  ultimaPeticion = Date.now();
}

/* ---------------------------------------------------------------- Búsqueda */

interface ResultadoNominatim {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  addresstype?: string;
}

/**
 * Busca una dirección escrita a mano y devuelve candidatos con coordenadas.
 *
 * `cerca` sesga los resultados hacia donde está la persona: escribir "estadio"
 * en Santiago debería proponer primero el de Santiago, no uno de Arica.
 */
export async function buscarDireccion(
  consulta: string,
  cerca?: { lat: number; lng: number },
): Promise<Lugar[]> {
  const q = consulta.trim();
  if (q.length < 3) return [];

  const clave = `${q.toLowerCase()}|${cerca ? `${cerca.lat.toFixed(2)},${cerca.lng.toFixed(2)}` : ""}`;
  const guardado = CACHE.get(clave);
  if (guardado && Date.now() - guardado.at < CACHE_TTL_MS) return guardado.lugares;

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "0",
    limit: "6",
    countrycodes: PAIS,
    "accept-language": "es",
  });

  // Caja de sesgo alrededor de la persona: ~50 km, suficiente para una ciudad.
  if (cerca) {
    const d = 0.45;
    params.set(
      "viewbox",
      [cerca.lng - d, cerca.lat + d, cerca.lng + d, cerca.lat - d].join(","),
    );
    params.set("bounded", "0"); // sesga, pero no descarta lo de fuera
  }

  await esperarTurno();

  let datos: ResultadoNominatim[];
  try {
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: { "User-Agent": IDENTIFICACION, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
    datos = (await res.json()) as ResultadoNominatim[];
  } catch (e) {
    // Que el buscador falle no debe romper la pantalla: la persona siempre
    // puede marcar el punto en el mapa a mano.
    console.warn("Búsqueda de direcciones no disponible:", (e as Error).message);
    throw new AppError(
      503,
      "buscador_no_disponible",
      "El buscador de direcciones no responde. Puedes marcar el punto en el mapa.",
    );
  }

  const lugares: Lugar[] = datos
    .filter((d) => d.lat && d.lon)
    .map((d) => ({
      nombre: d.name?.trim() || (d.display_name ?? "").split(",")[0].trim(),
      direccion: d.display_name ?? "",
      lat: Number(d.lat),
      lng: Number(d.lon),
      tipo: d.addresstype ?? d.type ?? null,
    }));

  // Caché sencilla: al llenarse, se tira la entrada más antigua.
  if (CACHE.size >= CACHE_MAX) {
    const masVieja = [...CACHE.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (masVieja) CACHE.delete(masVieja[0]);
  }
  CACHE.set(clave, { lugares, at: Date.now() });

  return lugares;
}
