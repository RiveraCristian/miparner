/**
 * Logotipo Miparner · reglas del Manual de Identidad v1.0
 *
 * Versiones (sección 06): color sobre blanco o lavanda, blanco sobre tinta o
 * índigo, y negro para una sola tinta. Sobre coral o índigo un globo desaparece,
 * así que ahí va siempre la versión en blanco.
 *
 * Tamaños mínimos (sección 03): logotipo 140 px de ancho, isotipo 24 px.
 * Bajo 120 px el ® puede eliminarse por legibilidad (`sinRegistro`).
 * A 16 px se usa un solo globo, no los dos (`Globo`).
 *
 * Texto alternativo (1.1.1): si el nombre ya está en texto al lado, `alt=""`.
 * Nunca «logo» ni «imagen».
 */
import {
  D_GLOBO_CORAL,
  D_GLOBO_INDIGO,
  D_NOMBRE,
  D_REGISTRO,
  MARCA,
  RATIO_GLOBO,
  RATIO_ISOTIPO,
  RATIO_LOGO,
  VB_GLOBO,
  VB_ISOTIPO,
  VB_LOGO,
} from "./paths";

export type VersionLogo = "color" | "blanco" | "negro";

const relleno = (v: VersionLogo) =>
  v === "blanco"
    ? { indigo: "#FFFFFF", coral: "#FFFFFF", nombre: "#FFFFFF" }
    : v === "negro"
      ? { indigo: MARCA.tinta, coral: MARCA.tinta, nombre: MARCA.tinta }
      : { indigo: MARCA.indigo, coral: MARCA.coral, nombre: MARCA.tinta };

const caja = (v: { x: number; y: number; w: number; h: number }) =>
  `${v.x} ${v.y} ${v.w} ${v.h}`;

interface Base {
  /** Alto en px. El ancho se deriva de la proporción del arte. */
  alto?: number;
  version?: VersionLogo;
  /** Texto alternativo. Cadena vacía si el nombre ya está en texto al lado. */
  alt?: string;
  className?: string;
}

/** Logotipo completo: símbolo + nombre. Versión principal de la marca. */
export function Logo({
  alto = 40,
  version = "color",
  alt = "",
  sinRegistro = false,
  className,
}: Base & { sinRegistro?: boolean }) {
  const c = relleno(version);
  return (
    <svg
      viewBox={caja(VB_LOGO)}
      height={alto}
      width={alto * RATIO_LOGO}
      className={className}
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      focusable="false"
    >
      {alt ? <title>{alt}</title> : null}
      <path fill={c.indigo} d={D_GLOBO_INDIGO} />
      <path fill={c.coral} d={D_GLOBO_CORAL} />
      <path fill={c.nombre} d={D_NOMBRE} />
      {sinRegistro ? null : <path fill={c.nombre} d={D_REGISTRO} />}
    </svg>
  );
}

/** Isotipo: los dos globos. Solo cuando el nombre ya está presente. */
export function Isotipo({ alto = 32, version = "color", alt = "", className }: Base) {
  const c = relleno(version);
  return (
    <svg
      viewBox={caja(VB_ISOTIPO)}
      height={alto}
      width={alto * RATIO_ISOTIPO}
      className={className}
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      focusable="false"
    >
      {alt ? <title>{alt}</title> : null}
      <path fill={c.indigo} d={D_GLOBO_INDIGO} />
      <path fill={c.coral} d={D_GLOBO_CORAL} />
    </svg>
  );
}

/** Un solo globo. La versión de 16 px: dos puntas juntas se vuelven una mancha. */
export function Globo({ alto = 16, version = "color", alt = "", className }: Base) {
  const c = relleno(version);
  return (
    <svg
      viewBox={caja(VB_GLOBO)}
      height={alto}
      width={alto * RATIO_GLOBO}
      className={className}
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      focusable="false"
    >
      {alt ? <title>{alt}</title> : null}
      <path fill={c.indigo} d={D_GLOBO_INDIGO} />
    </svg>
  );
}
