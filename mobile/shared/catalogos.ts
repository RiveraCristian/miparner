/**
 * Catálogos que vienen del backend (discapacidad, apoyos, finalidades).
 *
 * No se empaquetan en la app a propósito: si viviesen en dos sitios, un apoyo
 * nuevo obligaría a publicar una versión nueva en las tiendas para que la gente
 * pudiera elegirlo. Viviendo solo en el servidor, basta con desplegar.
 *
 * A cambio hay que sobrevivir a una red mala, así que lo que se descarga queda
 * guardado en el teléfono: la segunda vez la lista aparece al instante y, si no
 * hay conexión, se usa la última copia conocida.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { CatalogoDiscapacidad } from "./types";

const CLAVE_CACHE = "miparner_catalogo_discapacidad";

let enMemoria: CatalogoDiscapacidad | null = null;

/** Descarga el catálogo y lo guarda. Si falla, devuelve la copia guardada. */
export async function cargarCatalogo(): Promise<CatalogoDiscapacidad | null> {
  if (enMemoria) return enMemoria;

  try {
    const fresco = await api<CatalogoDiscapacidad>("/catalogos/discapacidad", { auth: false });
    enMemoria = fresco;
    await AsyncStorage.setItem(CLAVE_CACHE, JSON.stringify(fresco));
    return fresco;
  } catch {
    const guardado = await AsyncStorage.getItem(CLAVE_CACHE);
    if (!guardado) return null;
    try {
      enMemoria = JSON.parse(guardado) as CatalogoDiscapacidad;
      return enMemoria;
    } catch {
      return null;
    }
  }
}

/** El catálogo, con estado de carga para dibujar el formulario. */
export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<CatalogoDiscapacidad | null>(enMemoria);
  const [cargando, setCargando] = useState(!enMemoria);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const c = await cargarCatalogo();
    if (c) {
      setCatalogo(c);
      setError("");
    } else {
      setError("No pudimos cargar las opciones. Revisa tu conexión y vuelve a intentar.");
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!enMemoria) void cargar();
  }, [cargar]);

  return { catalogo, cargando, error, reintentar: cargar };
}

/**
 * Apoyos que corresponde ofrecer según los tipos de discapacidad elegidos.
 *
 * Mostrar los cuarenta y tantos apoyos de golpe agota a cualquiera, y más a
 * quien navega por voz. Se muestran los de sus categorías más los
 * transversales; si no declaró tipo —está en su derecho— se muestran todos,
 * porque adivinar sería peor.
 */
export function apoyosSugeridos(
  catalogo: CatalogoDiscapacidad,
  tiposElegidos: string[],
): { categoria: string; titulo: string; apoyos: CatalogoDiscapacidad["apoyos"] }[] {
  const utiles = tiposElegidos.filter((t) => t !== "prefiero_no_decir");
  const mostrarTodo = utiles.length === 0 || utiles.includes("multiple");

  const categorias = mostrarTodo
    ? [...new Set(catalogo.apoyos.map((a) => a.categoria))]
    : [...utiles, "transversal"];

  const titulo = (clave: string) =>
    clave === "transversal"
      ? "Para cualquier trayecto"
      : (catalogo.tiposDiscapacidad.find((t) => t.clave === clave)?.titulo ?? clave);

  return categorias
    .map((c) => ({
      categoria: c,
      titulo: titulo(c),
      apoyos: catalogo.apoyos.filter((a) => a.categoria === c),
    }))
    .filter((g) => g.apoyos.length > 0);
}
