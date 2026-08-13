/**
 * Piezas de interfaz compartidas por las dos apps.
 *
 * Reglas del manual aplicadas aquí:
 *  · Coral = forma (iconos, barras, puntos). El texto encima va en tinta, nunca
 *    en blanco pequeño: blanco sobre coral solo llega a 3.7:1.
 *  · Ningún estado se comunica solo con color: todos llevan icono además del texto.
 *  · Área táctil mínima de 44 × 44 px en cualquier control.
 *  · Cuerpo de texto desde 16 px.
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Info,
  MinusCircle,
  type LucideIcon,
} from "lucide-react-native";
import { TOQUE_MIN, colors, font, radius } from "./theme";

/* ------------------------------------------------------------------ Contenedor */

export function Screen({
  children,
  scroll = true,
  bg = colors.bg,
}: {
  children: ReactNode;
  scroll?: boolean;
  bg?: string;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>{children}</ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/* ---------------------------------------------------------------- Tipografía */

export function Titulo({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[font.h1, style]}>{children}</Text>;
}
export function Subtitulo({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[font.h2, style]}>{children}</Text>;
}
export function Cuerpo({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[font.body, style]}>{children}</Text>;
}
export function Sutil({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[font.muted, style]}>{children}</Text>;
}
export function Etiqueta({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[font.etiqueta, style]}>{children}</Text>;
}

/* --------------------------------------------------------------- Superficies */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Bloque destacado en lavanda. Índigo sobre lavanda mide 9.6:1 (AAA). */
export function CardLavanda({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, styles.cardLavanda, style]}>{children}</View>;
}

/** Panel de marca: índigo plano con contenido en blanco. */
export function PanelIndigo({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panelIndigo, style]}>{children}</View>;
}

/* ------------------------------------------------------------------- Botones */

type BtnProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Blanco sobre índigo · 11.4:1 AAA. */
export function PrimaryButton({ title, onPress, disabled, icon, style }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: pressed ? colors.tinta : colors.indigo, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {icon}
      <Text style={styles.btnTextoClaro}>{title}</Text>
    </Pressable>
  );
}

/** Índigo sobre blanco · 11.4:1 AAA. */
export function GhostButton({ title, onPress, disabled, icon, style }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        styles.btnFantasma,
        { backgroundColor: pressed ? colors.lavanda : colors.surface, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {icon}
      <Text style={styles.btnTextoIndigo}>{title}</Text>
    </Pressable>
  );
}

/**
 * Acción crítica. El coral es el borde y el icono; el texto va en tinta
 * (15.1:1 AAA). Nunca texto blanco pequeño sobre coral.
 */
export function DangerButton({ title, onPress, disabled, icon, style }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        styles.btnCritico,
        { backgroundColor: pressed ? colors.coral : colors.coralBg, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {icon}
      <Text style={styles.btnTextoTinta}>{title}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------- Estados */

export type TipoEstado = "indigo" | "exito" | "critico" | "atencion" | "neutro";

const estilosEstado: Record<TipoEstado, { bg: string; fg: string; forma: string; icono: LucideIcon }> = {
  indigo: { bg: colors.lavanda, fg: colors.indigo, forma: colors.indigo, icono: Info },
  exito: { bg: colors.exitoBg, fg: colors.exito, forma: colors.exito, icono: CheckCircle2 },
  critico: { bg: colors.coralBg, fg: colors.ink, forma: colors.coral, icono: CircleAlert },
  atencion: { bg: colors.coralBg, fg: colors.ink2, forma: colors.coral, icono: CircleDot },
  neutro: { bg: colors.surface2, fg: colors.ink2, forma: colors.ink3, icono: MinusCircle },
};

/** Indicador de estado: siempre icono + texto. El color solo acompaña. */
export function Estado({ text, tipo = "indigo" }: { text: string; tipo?: TipoEstado }) {
  const e = estilosEstado[tipo];
  const Icono = e.icono;
  return (
    <View style={[styles.estado, { backgroundColor: e.bg }]}>
      <Icono size={13} color={e.forma} />
      <Text style={{ color: e.fg, fontSize: 13, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

/** Alias heredado: las pantallas ya escritas llaman a <Badge>. */
const tonoLegado: Record<string, TipoEstado> = {
  brand: "indigo",
  gold: "atencion",
  success: "exito",
  danger: "critico",
  neutral: "neutro",
};
export function Badge({ text, tone = "brand" }: { text: string; tone?: keyof typeof tonoLegado }) {
  return <Estado text={text} tipo={tonoLegado[tone] ?? "indigo"} />;
}

/* ------------------------------------------------------------------ Métricas */

export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValor}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Fila etiqueta / valor. */
export function FilaDato({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fila}>
      <Text style={[font.body, { flex: 1 }]}>{label}</Text>
      <Text style={[font.body, { fontWeight: "600" }]}>{value}</Text>
    </View>
  );
}

/* --------------------------------------------------------------------- Pills */

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.pill, active && { backgroundColor: colors.indigo, borderColor: colors.indigo }]}
    >
      <Text style={{ fontSize: 15, fontWeight: "600", color: active ? colors.white : colors.ink2 }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Barra de progreso. El coral funciona aquí porque es forma, no texto.
 * Lleva `accessibilityValue` para que no dependa solo de lo visual.
 */
export function ProgressBar({ pct, color = colors.coral }: { pct: number; color?: string }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v) }}
      style={{ height: 10, backgroundColor: colors.surface2, borderRadius: radius.pill, overflow: "hidden" }}
    >
      <View style={{ width: `${v}%`, height: "100%", backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

/* ----------------------------------------------------------------- Vacío/carga */

export function Vacio({ icon: Icono, titulo, detalle }: { icon: LucideIcon; titulo: string; detalle?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 20, gap: 8 }}>
      <View style={styles.vacioIcono}>
        <Icono size={24} color={colors.indigo} />
      </View>
      <Text style={[font.h3, { textAlign: "center" }]}>{titulo}</Text>
      {detalle ? <Text style={[font.muted, { textAlign: "center" }]}>{detalle}</Text> : null}
    </View>
  );
}

export function Loading({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <View style={{ padding: 40, alignItems: "center", gap: 12 }} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.indigo} />
      <Text style={font.tiny}>{texto}</Text>
    </View>
  );
}

/**
 * Mapa provisional en tonos de marca, hasta integrar react-native-maps.
 * Es decoración: se oculta a los lectores de pantalla y la información real
 * del viaje va siempre en texto al lado.
 */
export function MapPlaceholder({ height = 200, children }: { height?: number; children?: ReactNode }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        height,
        borderRadius: radius.md,
        overflow: "hidden",
        backgroundColor: colors.lavanda,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <View style={{ position: "absolute", top: "30%", left: -20, right: -20, height: 12, backgroundColor: colors.surface }} />
      <View style={{ position: "absolute", top: "62%", left: -20, right: -20, height: 12, backgroundColor: colors.surface }} />
      <View style={{ position: "absolute", left: "35%", top: -20, bottom: -20, width: 12, backgroundColor: colors.surface }} />
      <View style={{ position: "absolute", left: "70%", top: -20, bottom: -20, width: 8, backgroundColor: colors.lav400 }} />
      {children}
    </View>
  );
}

/** Punto de mapa. Aro blanco para que se lea sobre cualquier fondo. */
export function PuntoMapa({
  left,
  top,
  color = colors.indigo,
  size = 16,
}: {
  left: string;
  top: string;
  color?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: left as never,
        top: top as never,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: colors.white,
      }}
    />
  );
}

/* -------------------------------------------------------------------- Estilos */

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 16,
  },
  cardLavanda: { backgroundColor: colors.lavanda, borderColor: "transparent" },
  panelIndigo: { backgroundColor: colors.indigo, borderRadius: radius.lg, padding: 20 },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: TOQUE_MIN,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  btnFantasma: { borderColor: colors.indigo },
  btnCritico: { borderColor: colors.coral },
  btnTextoClaro: { color: colors.white, fontWeight: "600", fontSize: 16 },
  btnTextoIndigo: { color: colors.indigo, fontWeight: "600", fontSize: 16 },
  btnTextoTinta: { color: colors.ink, fontWeight: "600", fontSize: 16 },

  estado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },

  stat: { flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: 14 },
  statValor: { fontSize: 24, fontWeight: "600", color: colors.ink, letterSpacing: -0.4 },
  statLabel: { fontSize: 13, color: colors.ink2, marginTop: 2 },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },

  pill: {
    minHeight: TOQUE_MIN,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
  },

  vacioIcono: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
});
