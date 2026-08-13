/**
 * Logotipo Miparner para React Native.
 *
 * Mismos trazados que la web (`paths.ts`), extraídos del arte del manual.
 * El ojo del globo es un calado: en react-native-svg el relleno por defecto es
 * "nonzero", así que queda transparente y toma el color del fondo, como exige
 * el manual. No se dibuja un círculo encima.
 *
 * Sobre índigo, coral o tinta el logotipo va SIEMPRE en blanco: en color, uno
 * de los dos globos desaparecería contra el fondo.
 */
import Svg, { Path } from "react-native-svg";
import {
  D_GLOBO_CORAL,
  D_GLOBO_INDIGO,
  D_NOMBRE,
  D_REGISTRO,
  MARCA,
  RATIO_ISOTIPO,
  RATIO_LOGO,
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

interface Props {
  /** Alto en px. El ancho se deriva de la proporción del arte. */
  alto?: number;
  version?: VersionLogo;
  /** Descripción para lectores de pantalla. Vacía si el nombre ya está al lado. */
  alt?: string;
}

/** Logotipo completo: símbolo + nombre. Mínimo 140 px de ancho. */
export function Logo({ alto = 34, version = "color", alt = "", sinRegistro = false }: Props & { sinRegistro?: boolean }) {
  const c = relleno(version);
  return (
    <Svg
      width={alto * RATIO_LOGO}
      height={alto}
      viewBox={caja(VB_LOGO)}
      accessible={!!alt}
      accessibilityRole="image"
      accessibilityLabel={alt || undefined}
      importantForAccessibility={alt ? "yes" : "no-hide-descendants"}
    >
      <Path fill={c.indigo} d={D_GLOBO_INDIGO} />
      <Path fill={c.coral} d={D_GLOBO_CORAL} />
      <Path fill={c.nombre} d={D_NOMBRE} />
      {sinRegistro ? null : <Path fill={c.nombre} d={D_REGISTRO} />}
    </Svg>
  );
}

/** Isotipo: los dos globos. Solo cuando el nombre ya está presente. Mínimo 24 px. */
export function Isotipo({ alto = 28, version = "color", alt = "" }: Props) {
  const c = relleno(version);
  return (
    <Svg
      width={alto * RATIO_ISOTIPO}
      height={alto}
      viewBox={caja(VB_ISOTIPO)}
      accessible={!!alt}
      accessibilityRole="image"
      accessibilityLabel={alt || undefined}
      importantForAccessibility={alt ? "yes" : "no-hide-descendants"}
    >
      <Path fill={c.indigo} d={D_GLOBO_INDIGO} />
      <Path fill={c.coral} d={D_GLOBO_CORAL} />
    </Svg>
  );
}
