/**
 * Ubicación del dispositivo · única puerta de entrada al GPS.
 *
 * Todo el seguimiento en vivo pasa por aquí. El proveedor concreto es el
 * `LocationManager` de MapLibre: ya viene con el módulo nativo del mapa (no
 * suma otra dependencia), trae el permiso de Android y filtra por
 * desplazamiento, que es lo que cuida la batería. Cambiarlo por
 * `@react-native-community/geolocation` es reescribir solo este archivo.
 *
 * El GPS es un recurso compartido: varias pantallas pueden estar mirando a la
 * vez (el mapa del inicio y el viaje activo, por ejemplo). Por eso se lleva
 * cuenta de los suscriptores y el sensor se apaga cuando se va el último.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  LocationManager,
  requestAndroidLocationPermissions,
  type Location,
} from "@maplibre/maplibre-react-native";
import { api } from "./api";
import { connectSocket, emitPosition } from "./socket";
import type { LatLng } from "./types";

export interface Posicion extends LatLng {
  /** Radio de incertidumbre en metros, si el dispositivo lo informa. */
  precision: number | null;
  at: number;
}

/* ------------------------------------------------------------- Permisos */

/**
 * Pide el permiso de ubicación. En Android abre el diálogo del sistema; en iOS
 * lo gestiona el propio MapLibre al arrancar el sensor.
 */
export async function pedirPermisoUbicacion(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    return await requestAndroidLocationPermissions();
  } catch {
    return false;
  }
}

/* --------------------------------------------- Sensor compartido (refcount) */

type Oyente = (p: Posicion) => void;

/** Suscriptores vivos y el desplazamiento mínimo que pidió cada uno. */
const oyentes = new Map<Oyente, number>();
let enMarcha = false;

function aPosicion(loc: Location): Posicion {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    precision: loc.coords.accuracy ?? null,
    at: loc.timestamp ?? Date.now(),
  };
}

function alRecibir(loc: Location) {
  const p = aPosicion(loc);
  // Copia de la lista: un oyente puede darse de baja dentro del callback.
  [...oyentes.keys()].forEach((f) => f(p));
}

/** El sensor corre con el filtro más fino que haya pedido alguien. */
function ajustarDesplazamiento() {
  const minimo = Math.min(...oyentes.values());
  if (Number.isFinite(minimo)) LocationManager.setMinDisplacement(minimo);
}

/**
 * Empieza a recibir posiciones. Devuelve la función para dejar de recibirlas.
 *
 * `desplazamientoMinimo` son los metros que hay que moverse para que llegue una
 * lectura nueva: más alto, menos batería.
 */
export function observarUbicacion(oyente: Oyente, desplazamientoMinimo = 10): () => void {
  oyentes.set(oyente, desplazamientoMinimo);

  try {
    if (!enMarcha) {
      LocationManager.addListener(alRecibir);
      LocationManager.start(desplazamientoMinimo);
      enMarcha = true;
    }
    ajustarDesplazamiento();
  } catch (e) {
    // Sin módulo nativo no queda media suscripción colgando.
    oyentes.delete(oyente);
    throw e;
  }

  return () => {
    oyentes.delete(oyente);
    if (oyentes.size === 0) {
      LocationManager.removeListener(alRecibir);
      LocationManager.stop();
      enMarcha = false;
    } else {
      ajustarDesplazamiento();
    }
  };
}

/** Última posición conocida, sin encender el sensor. Útil para arrancar rápido. */
export async function ubicacionActual(): Promise<Posicion | null> {
  try {
    const loc = await LocationManager.getLastKnownLocation();
    return loc ? aPosicion(loc) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ Hooks */

export interface EstadoUbicacion {
  punto: Posicion | null;
  /** null mientras no se ha preguntado; false si la persona lo negó. */
  permiso: boolean | null;
  /** Mensaje listo para mostrar, o cadena vacía. */
  error: string;
}

const SIN_MODULO =
  "El GPS no está disponible en esta compilación. Vuelve a compilar la app para activarlo.";
const SIN_PERMISO =
  "Miparner necesita tu ubicación para el seguimiento. Actívala en los ajustes del teléfono.";

/**
 * Posición del dispositivo en vivo mientras `activo` sea cierto.
 *
 * Pide el permiso la primera vez, arranca con la última posición conocida para
 * no dejar el mapa vacío, y libera el sensor al desmontar.
 */
export function useMiUbicacion(activo: boolean, desplazamientoMinimo = 10): EstadoUbicacion {
  const [punto, setPunto] = useState<Posicion | null>(null);
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    let dejar: (() => void) | undefined;

    (async () => {
      try {
        const ok = await pedirPermisoUbicacion();
        if (!vivo) return;
        setPermiso(ok);
        if (!ok) {
          setError(SIN_PERMISO);
          return;
        }
        setError("");

        const ultima = await ubicacionActual();
        if (vivo && ultima) setPunto(ultima);

        dejar = observarUbicacion((p) => {
          if (vivo) setPunto(p);
        }, desplazamientoMinimo);
      } catch {
        // El módulo nativo no está en el binario: se avisa y se sigue sin GPS.
        if (vivo) setError(SIN_MODULO);
      }
    })();

    return () => {
      vivo = false;
      dejar?.();
    };
  }, [activo, desplazamientoMinimo]);

  return { punto, permiso, error };
}

/* ------------------------------------------------- Compartir la posición */

const R_TIERRA = 6_371_000;

/** Distancia en metros entre dos puntos (haversine). */
export function distanciaM(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TIERRA * Math.asin(Math.sqrt(h));
}

interface OpcionesCompartir {
  activo: boolean;
  /** Metros de movimiento para que llegue una lectura nueva. */
  desplazamientoMinimo?: number;
  /** Cada cuánto se guarda la posición en la base, como máximo. */
  cadenciaPersistirMs?: number;
  /** Metros recorridos que fuerzan un guardado antes de la cadencia. */
  distanciaPersistirM?: number;
}

/**
 * Comparte la posición propia dentro de un acompañamiento.
 *
 * Dos canales, a propósito:
 *  · **Socket** en cada lectura — es lo que mueve el punto en el mapa de la
 *    otra persona, y es efímero: si se pierde, la siguiente lo corrige.
 *  · **REST** cada cierto tiempo o distancia — deja el rastro en `viaje_evento`
 *    para la auditoría y el módulo de seguridad. Va espaciado porque cada
 *    llamada escribe una fila.
 */
export function useCompartirPosicion(
  viajeId: number,
  {
    activo,
    desplazamientoMinimo = 10,
    cadenciaPersistirMs = 30_000,
    distanciaPersistirM = 120,
  }: OpcionesCompartir,
): EstadoUbicacion {
  const estado = useMiUbicacion(activo, desplazamientoMinimo);
  const ultimaGuardada = useRef<{ punto: LatLng; at: number } | null>(null);
  const { punto } = estado;

  // El cierre del efecto de desmontaje se congela en el primer render: la
  // última lectura tiene que viajar por una referencia.
  const ultimaVista = useRef<Posicion | null>(null);
  ultimaVista.current = punto;

  const guardar = useCallback(
    async (p: Posicion) => {
      try {
        await api(`/viajes/${viajeId}/posicion`, { method: "POST", body: { lat: p.lat, lng: p.lng } });
        ultimaGuardada.current = { punto: p, at: Date.now() };
      } catch {
        // Se reintenta con la siguiente lectura: perder un punto no rompe nada.
      }
    },
    [viajeId],
  );

  useEffect(() => {
    if (!activo || !punto) return;

    // Entrega inmediata a la sala del viaje.
    emitPosition(viajeId, punto.lat, punto.lng);

    const previa = ultimaGuardada.current;
    const toca =
      !previa ||
      Date.now() - previa.at >= cadenciaPersistirMs ||
      distanciaM(previa.punto, punto) >= distanciaPersistirM;
    if (toca) void guardar(punto);
  }, [activo, punto, viajeId, cadenciaPersistirMs, distanciaPersistirM, guardar]);

  // Al salir del acompañamiento se guarda el último punto conocido, para que
  // el rastro no termine en la penúltima posición reportada.
  useEffect(() => {
    return () => {
      const p = ultimaVista.current;
      if (p) void guardar(p);
    };
  }, [guardar]);

  return estado;
}

/* ------------------------------------------ Seguir a la otra persona */

const MAX_PUNTOS_TRAZA = 300;

export interface Seguimiento {
  /** Última posición conocida de esa persona, o null si aún no reporta. */
  punto: Posicion | null;
  /** Recorrido acumulado en esta sesión, para dibujar la línea. */
  traza: LatLng[];
}

/**
 * Sigue en vivo la posición de la otra persona del acompañamiento.
 *
 * El backend emite `position_update` por dos caminos —el socket directo y el
 * endpoint REST que además lo guarda—, así que la misma lectura puede llegar
 * dos veces. Se descarta la repetida comparando con el último punto.
 */
export function usePosicionDe(viajeId: number, usuarioId: number | null | undefined): Seguimiento {
  const [punto, setPunto] = useState<Posicion | null>(null);
  const [traza, setTraza] = useState<LatLng[]>([]);

  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    let socket: Awaited<ReturnType<typeof connectSocket>> | undefined;

    const alLlegar = (d: { rideId: number; usuarioId: number; lat: number; lng: number; at?: string }) => {
      if (!vivo || d.rideId !== viajeId || d.usuarioId !== usuarioId) return;
      const nuevo: Posicion = {
        lat: d.lat,
        lng: d.lng,
        precision: null,
        at: d.at ? Date.parse(d.at) : Date.now(),
      };
      setPunto((previo) => {
        // Misma coordenada que la anterior: es el eco del otro canal.
        if (previo && previo.lat === nuevo.lat && previo.lng === nuevo.lng) return previo;
        setTraza((t) => {
          const siguiente = [...t, { lat: nuevo.lat, lng: nuevo.lng }];
          return siguiente.length > MAX_PUNTOS_TRAZA
            ? siguiente.slice(-MAX_PUNTOS_TRAZA)
            : siguiente;
        });
        return nuevo;
      });
    };

    (async () => {
      socket = await connectSocket();
      if (!vivo) return;
      socket.on("position_update", alLlegar);
    })();

    return () => {
      vivo = false;
      socket?.off("position_update", alLlegar);
    };
  }, [viajeId, usuarioId]);

  return { punto, traza };
}

/* ------------------------------------ Ubicación del voluntario en línea */

/**
 * Mantiene fresca la ubicación del voluntario mientras está en línea.
 *
 * Es lo que alimenta el matchmaking geoespacial (`ST_DWithin` sobre
 * `voluntario_ubicacion`). Va con el filtro flojo y espaciada en el tiempo: no
 * hace falta precisión de metro para decidir a quién se le ofrece una solicitud,
 * y este reporte corre durante horas.
 */
export function usePublicarUbicacionVoluntario(
  activo: boolean,
  { cadenciaMs = 60_000, distanciaM: minima = 200 } = {},
): EstadoUbicacion {
  const estado = useMiUbicacion(activo, 50);
  const ultima = useRef<{ punto: LatLng; at: number } | null>(null);
  const { punto } = estado;

  useEffect(() => {
    if (!activo || !punto) return;
    const previa = ultima.current;
    const toca =
      !previa || Date.now() - previa.at >= cadenciaMs || distanciaM(previa.punto, punto) >= minima;
    if (!toca) return;

    ultima.current = { punto, at: Date.now() };
    void api("/voluntarios/me/ubicacion", {
      method: "PUT",
      body: { lat: punto.lat, lng: punto.lng },
    }).catch(() => {
      // Se reintenta con la siguiente lectura.
      ultima.current = previa;
    });
  }, [activo, punto, cadenciaMs, minima]);

  // Al salir de línea deja de reportarse: la posición guardada envejece sola.
  useEffect(() => {
    if (!activo) ultima.current = null;
  }, [activo]);

  return estado;
}
