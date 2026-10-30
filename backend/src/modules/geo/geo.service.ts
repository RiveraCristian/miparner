/**
 * Búsqueda de direcciones (geocodificación).
 *
 * Usa Photon (photon.komoot.io), geocodificador basado en datos de
 * OpenStreetMap: gratuito, sin clave y con los mismos datos que ya pinta el
 * mapa, así que lo que la persona busca y lo que ve coinciden.
 *
 * Por qué pasa por el backend y no lo llama la app directamente:
 *
 *  · Lo que se busca se cachea. Las direcciones de Santiago se repiten mucho:
 *    el centro de alto rendimiento lo va a buscar mucha gente.
 *  · Cambiar de proveedor —MapTiler, uno propio— es cambiar este archivo.
 */
import { AppError } from "../../lib/http-error";

const PHOTON = "https://photon.komoot.io/api";

/** Bounding box de Chile para acotar resultados: left,bottom,right,top. */
const BBOX_CHILE = "-75.64,-55.98,-66.42,-17.5";

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

/* ---------------------------------------------------------------- Búsqueda */

interface PropiedadesPhoton {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  state?: string;
  country?: string;
  type?: string;
  osm_key?: string;
  osm_value?: string;
}

interface FeaturePhoton {
  geometry: { coordinates: [number, number] };
  properties: PropiedadesPhoton;
}

interface RespuestaPhoton {
  features: FeaturePhoton[];
}

function construirNombre(p: PropiedadesPhoton): string {
  if (p.name) return p.name;
  const partes = [p.street, p.housenumber].filter(Boolean).join(" ");
  return partes || p.city || "Sin nombre";
}

function construirDireccion(p: PropiedadesPhoton): string {
  const partes: string[] = [];
  if (p.name) {
    const calle = [p.street, p.housenumber].filter(Boolean).join(" ");
    if (calle) partes.push(calle);
  }
  if (p.city) partes.push(p.city);
  if (p.state && p.state !== p.city) partes.push(p.state);
  if (p.country) partes.push(p.country);
  return partes.join(", ");
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
    limit: "6",
    // Sin `lang`: Photon solo acepta default/de/en/fr y responde 400 con "es".
    // Por defecto devuelve el nombre local, que en Chile ya está en español.
    bbox: BBOX_CHILE,
  });

  if (cerca) {
    params.set("lat", String(cerca.lat));
    params.set("lon", String(cerca.lng));
  }

  let datos: RespuestaPhoton;
  try {
    const res = await fetch(`${PHOTON}?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Photon respondió ${res.status}`);
    datos = (await res.json()) as RespuestaPhoton;
  } catch (e) {
    console.warn("Búsqueda de direcciones no disponible:", (e as Error).message);
    throw new AppError(
      503,
      "buscador_no_disponible",
      "El buscador de direcciones no responde. Puedes marcar el punto en el mapa.",
    );
  }

  const lugares: Lugar[] = (datos.features ?? [])
    .filter((f) => f.geometry?.coordinates?.length === 2)
    .map((f) => ({
      nombre: construirNombre(f.properties),
      direccion: construirDireccion(f.properties),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      tipo: f.properties.osm_value ?? f.properties.type ?? null,
    }));

  // Caché sencilla: al llenarse, se tira la entrada más antigua.
  if (CACHE.size >= CACHE_MAX) {
    const masVieja = [...CACHE.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (masVieja) CACHE.delete(masVieja[0]);
  }
  CACHE.set(clave, { lugares, at: Date.now() });

  return lugares;
}
