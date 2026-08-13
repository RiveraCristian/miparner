// Sistema de diseño compartido (azul). Alineado con el prototipo web.
export const colors = {
  brand: "#1E5AE6",
  brandStrong: "#1544B8",
  brandSoft: "#E7EEFF",
  brandInk: "#0C447C",
  gold: "#E4922A",
  goldSoft: "#FBEED6",
  goldInk: "#8A5410",
  success: "#12A150",
  successSoft: "#E1F5E9",
  danger: "#E5484D",
  dangerStrong: "#C42B2F",
  dangerSoft: "#FCE9E9",
  bg: "#F4F7FD",
  surface: "#FFFFFF",
  surface2: "#F1F5FC",
  ink: "#0C1A33",
  ink2: "#48546C",
  ink3: "#8A93A6",
  line: "#E1E8F4",
  line2: "#EDF1F9",
  white: "#FFFFFF",
};

export const radius = { sm: 10, md: 14, lg: 18, pill: 999 };
export const spacing = (n: number) => n * 4;

export const font = {
  h1: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.4, color: colors.ink },
  h2: { fontSize: 19, fontWeight: "700" as const, letterSpacing: -0.3, color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  muted: { fontSize: 13.5, color: colors.ink2 },
  tiny: { fontSize: 11.5, color: colors.ink3 },
};
