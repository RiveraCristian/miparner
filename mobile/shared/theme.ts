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
 * Outfit acompaña al logotipo (manual, sección 05).
 *
 * En Android `fontFamily` se resuelve por el NOMBRE DEL ARCHIVO en
 * `android/app/src/main/assets/fonts/`, no por peso: hay que nombrar la variante
 * exacta. Por eso en toda la app se usa `fuente.*` en vez de `fontWeight`.
 * Las tres estáticas se generan desde la variable con
 * `design/scripts/gen_fuentes.py`, en los tres pesos que define el manual.
 */
export const fuente = {
  /** 400 · cuerpo */
  normal: "Outfit-Regular",
  /** 500 · etiquetas */
  medio: "Outfit-Medium",
  /** 600 · títulos y display */
  fuerte: "Outfit-SemiBold",
} as const;

/** Elevación. Sombras muy suaves, teñidas de tinta, nunca de negro puro.
 *  No aplican al logotipo: el manual prohíbe sombras sobre la marca. */
export const elevacion = {
  /** Tarjetas en reposo. */
  suave: {
    shadowColor: "#1A1720",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  /** Elementos destacados: paneles de marca, tarjeta activa. */
  media: {
    shadowColor: "#1A1720",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  /** Barras fijas y hojas superpuestas. */
  alta: {
    shadowColor: "#1A1720",
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;

export const font = {
  display: { fontSize: 34, fontFamily: fuente.fuerte, lineHeight: 41, letterSpacing: -0.6, color: colors.ink },
  h1: { fontSize: 26, fontFamily: fuente.fuerte, lineHeight: 32, letterSpacing: -0.4, color: colors.ink },
  h2: { fontSize: 20, fontFamily: fuente.fuerte, lineHeight: 25, letterSpacing: -0.3, color: colors.ink },
  h3: { fontSize: 17, fontFamily: fuente.fuerte, lineHeight: 22, color: colors.ink },
  body: { fontSize: 16, fontFamily: fuente.normal, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 15, fontFamily: fuente.normal, lineHeight: 22, color: colors.ink2 },
  tiny: { fontSize: 13, fontFamily: fuente.normal, lineHeight: 18, color: colors.ink3 },
  etiqueta: {
    fontSize: 12,
    fontFamily: fuente.medio,
    lineHeight: 16,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
    color: colors.ink3,
  },
} as const;
