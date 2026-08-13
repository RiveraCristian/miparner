/**
 * Miparner · sistema de diseño móvil
 * Derivado del Manual de Identidad v1.0. Mismos tokens que la web.
 *
 * Reglas que gobiernan esta paleta:
 *  · Los cuatro colores de marca son fijos: no se aclaran, no se oscurecen,
 *    no se mezclan con otros.
 *  · El coral es color de FORMA. Nunca lleva texto pequeño encima ni es el
 *    único indicador de un estado. Para texto de acento se usa índigo o tinta.
 *  · Todo par de color usado aquí está medido; el ratio va anotado al lado.
 */

/** Paleta de marca. Fija. */
export const marca = {
  indigo: "#2E1BA8", // PANTONE 2735 C
  coral: "#E8511F", // PANTONE 1665 C
  tinta: "#1A1720", // PANTONE Neutral Black C
  lavanda: "#EDE9FB", // PANTONE 663 C
} as const;

export const colors = {
  // --- marca ---
  indigo: marca.indigo,
  coral: marca.coral,
  tinta: marca.tinta,
  lavanda: marca.lavanda,

  // --- texto (ratios sobre blanco) ---
  ink: "#1A1720", //  17.7:1  AAA · cuerpo
  ink2: "#3F3A50", //  10.9:1  AAA · secundario
  ink3: "#6B6480", //   5.6:1  AA  · etiquetas y texto sutil
  ink4: "#8A83A0", //   3.6:1      · SOLO iconos y trazos, nunca texto

  // --- superficies y líneas ---
  bg: "#F7F5FD",
  surface: "#FFFFFF",
  surface2: "#EEEBF8",
  line: "#E3DFF2",
  line2: "#EEEBF8",
  white: "#FFFFFF",

  // --- escala lavanda para composiciones sobre índigo ---
  lav200: "#DBD4FF", // 8.1:1 sobre índigo · AAA
  lav300: "#C9BFFF", // 6.7:1 sobre índigo · AA
  lav400: "#B7ADE0",

  // --- estados funcionales ---
  // Único color añadido a la marca: el verde de éxito, tomado del propio manual.
  exito: "#146B3A", //  6.6:1 sobre blanco    · AA
  exitoBg: "#E6F3EB", //  5.8:1 con exito      · AA
  coralBg: "#FBEAE3", // 15.1:1 con ink        · AAA

  // --- alias heredados ---
  // Las pantallas ya escritas usan estos nombres; se mantienen apuntando a la
  // marca para no dejar ningún color fuera de paleta en la app.
  brand: marca.indigo,
  brandStrong: marca.tinta,
  brandSoft: marca.lavanda,
  brandInk: marca.indigo,
  gold: marca.coral, // el acento de forma es el coral
  goldSoft: "#FBEAE3",
  goldInk: "#1A1720", // texto sobre coral tenue: tinta, no coral
  success: "#146B3A",
  successSoft: "#E6F3EB",
  danger: marca.coral, // el crítico es coral como forma
  dangerStrong: "#1A1720", // y tinta como texto
  dangerSoft: "#FBEAE3",
} as const;

export const radius = { sm: 9, md: 12, lg: 16, pill: 999 } as const;
export const spacing = (n: number) => n * 4;

/** Área táctil mínima (WCAG 2.5.5). */
export const TOQUE_MIN = 44;

/**
 * Jerarquía tipográfica del manual: display 600/40, título 600/24,
 * cuerpo 400/16, etiqueta 500/12. Interlineado 1.5 en párrafos, 1.2 en títulos.
 * Outfit acompaña al logotipo; se registra en `fontFamily` para cuando las
 * fuentes estén enlazadas en cada plataforma.
 */
export const FUENTE = "Outfit";

export const font = {
  display: { fontSize: 34, fontWeight: "600" as const, lineHeight: 41, letterSpacing: -0.6, color: colors.ink },
  h1: { fontSize: 26, fontWeight: "600" as const, lineHeight: 32, letterSpacing: -0.4, color: colors.ink },
  h2: { fontSize: 20, fontWeight: "600" as const, lineHeight: 25, letterSpacing: -0.3, color: colors.ink },
  h3: { fontSize: 17, fontWeight: "600" as const, lineHeight: 22, color: colors.ink },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22, color: colors.ink2 },
  tiny: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18, color: colors.ink3 },
  etiqueta: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
    color: colors.ink3,
  },
} as const;
