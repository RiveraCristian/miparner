/**
 * Piezas de interfaz compartidas por las dos apps.
 *
 * Reglas del manual aplicadas aquí:
 *  · Coral = forma (iconos, barras, puntos). El texto encima va en tinta, nunca
 *    en blanco pequeño: blanco sobre coral solo llega a 3.7:1.
 *  · Ningún estado se comunica solo con color: todos llevan icono además del texto.
 *  · Área táctil mínima de 44 × 44 px en cualquier control.
 *  · Cuerpo de texto desde 16 px, en Outfit.
 *  · Las sombras son profundidad de interfaz, muy suaves y teñidas de tinta.
 *    Nunca se aplican al logotipo: el manual lo prohíbe.
 */
import { useEffect, useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import {
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Info,
  MinusCircle,
  type LucideIcon,
} from "lucide-react-native";
import { TOQUE_MIN, colors, elevacion, font, fuente, radius } from "./theme";

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
      {/* La barra de estado toma el color del fondo: sin franja gris arriba. */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** Barra de estado clara y translúcida, para las pantallas con cabecera índigo
 *  a sangre: el índigo sube hasta el borde superior de la pantalla. */
export function BarraSobreIndigo() {
  return <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />;
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

/** Hundimiento al pulsar: reacción física, sin tocar el color de marca. */
function usePulsacion() {
  const escala = useRef(new Animated.Value(1)).current;
  const a = (v: number) =>
    Animated.spring(escala, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return { escala, entra: () => a(0.97), sale: () => a(1) };
}

/** Blanco sobre índigo · 11.4:1 AAA. */
export function PrimaryButton({ title, onPress, disabled, icon, style }: BtnProps) {
  const { escala, entra, sale } = usePulsacion();
  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={entra}
        onPressOut={sale}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
          styles.btn,
          !disabled && elevacion.suave,
          disabled
            ? { backgroundColor: colors.surface2 }
            : { backgroundColor: pressed ? colors.tinta : colors.indigo },
          style,
        ]}
      >
        {icon}
        <Text style={[styles.btnTextoClaro, disabled && { color: colors.ink3 }]}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Índigo sobre blanco · 11.4:1 AAA. */
export function GhostButton({ title, onPress, disabled, icon, style }: BtnProps) {
  const { escala, entra, sale } = usePulsacion();
  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={entra}
        onPressOut={sale}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
          styles.btn,
          styles.btnFantasma,
          { backgroundColor: pressed ? colors.lavanda : colors.surface, opacity: disabled ? 0.6 : 1 },
          style,
        ]}
      >
        {icon}
        <Text style={styles.btnTextoIndigo}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Acción crítica. El coral es el borde y el icono; el texto va en tinta
 * (15.1:1 AAA). Nunca texto blanco pequeño sobre coral.
 */
export function DangerButton({ title, onPress, disabled, icon, style }: BtnProps) {
  const { escala, entra, sale } = usePulsacion();
  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={entra}
        onPressOut={sale}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
          styles.btn,
          styles.btnCritico,
          { backgroundColor: pressed ? colors.coral : colors.coralBg, opacity: disabled ? 0.6 : 1 },
          style,
        ]}
      >
        {icon}
        <Text style={styles.btnTextoTinta}>{title}</Text>
      </Pressable>
    </Animated.View>
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
      <Text style={{ color: e.fg, fontSize: 13, fontFamily: fuente.fuerte }}>{text}</Text>
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
      <Text style={[font.body, { fontFamily: fuente.fuerte }]}>{value}</Text>
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
      style={({ pressed }) => [
        styles.pill,
        active && { backgroundColor: colors.indigo, borderColor: colors.indigo },
        active && elevacion.suave,
        pressed && !active && { backgroundColor: colors.lavanda, borderColor: colors.lav300 },
      ]}
    >
      <Text
        style={{ fontSize: 15, fontFamily: fuente.fuerte, color: active ? colors.white : colors.ink2 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Barra de progreso. El coral funciona aquí porque es forma, no texto.
 * Lleva `accessibilityValue` para no depender de lo visual, y crece con una
 * animación corta en vez de aparecer de golpe.
 */
export function ProgressBar({
  pct,
  color = colors.coral,
  sobreOscuro = false,
}: {
  pct: number;
  color?: string;
  sobreOscuro?: boolean;
}) {
  const v = Math.max(0, Math.min(100, pct));
  const ancho = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ancho, {
      toValue: v,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [v, ancho]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v) }}
      style={[
        styles.progresoPista,
        { backgroundColor: sobreOscuro ? "rgba(255,255,255,0.26)" : colors.surface2 },
      ]}
    >
      <Animated.View
        style={{
          width: ancho.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          height: "100%",
          backgroundColor: color,
          borderRadius: radius.pill,
        }}
      />
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

/** Bloque que late mientras llega el dato. Adelanta la forma de lo que va a
 *  aparecer y evita el salto de layout de un spinner. */
export function Esqueleto({
  alto = 16,
  ancho = "100%",
  radio = radius.sm,
  style,
}: {
  alto?: number;
  ancho?: number | `${number}%`;
  radio?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const brillo = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(brillo, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(brillo, { toValue: 0.45, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    bucle.start();
    return () => bucle.stop();
  }, [brillo]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { height: alto, width: ancho, borderRadius: radio, backgroundColor: colors.surface2, opacity: brillo },
        style,
      ]}
    />
  );
}

/** Esqueleto con forma de tarjeta, para listas. */
export function EsqueletoTarjeta() {
  return (
    <View style={[styles.card, { gap: 12, marginBottom: 14 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Esqueleto alto={46} ancho={46} radio={23} />
        <View style={{ flex: 1, gap: 7 }}>
          <Esqueleto alto={17} ancho="60%" />
          <Esqueleto alto={13} ancho="35%" />
        </View>
      </View>
      <Esqueleto alto={13} ancho="85%" />
      <Esqueleto alto={TOQUE_MIN} radio={radius.md} />
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

/* --------------------------------------------------------------------- Mapa */

/**
 * Mapa provisional, dibujado en vectorial, hasta integrar react-native-maps.
 * Manzanas, parque, avenida y la ruta trazada entre los dos puntos: da la
 * lectura de un mapa sin fingir datos reales. Es decoración: se oculta a los
 * lectores de pantalla y la información del viaje va siempre en texto al lado.
 */
export function MapPlaceholder({ height = 200, children }: { height?: number; children?: ReactNode }) {
  const MANZANAS: [number, number, number, number][] = [
    [8, 10, 92, 54], [112, 10, 86, 54], [210, 10, 100, 54],
    [8, 78, 92, 46], [210, 78, 100, 46],
    [8, 136, 92, 56], [112, 136, 86, 56], [210, 136, 100, 56],
  ];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.mapa, { height }]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
        <Rect x="0" y="0" width="320" height="200" fill={colors.lavanda} />
        {MANZANAS.map(([x, y, w, h], i) => (
          <Rect key={i} x={x} y={y} width={w} height={h} rx="5" fill={colors.surface} opacity={0.62} />
        ))}
        {/* parque */}
        <Rect x="112" y="78" width="86" height="46" rx="6" fill={colors.exitoBg} opacity={0.85} />
        {/* avenida */}
        <Rect x="0" y="126" width="320" height="7" fill={colors.lav300} opacity={0.5} />
        {/* ruta entre origen y destino */}
        <Path
          d="M60 158 L60 129 Q60 122 68 122 L150 122 Q158 122 158 114 L158 44 Q158 37 166 37 L246 37"
          stroke={colors.indigo}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.9}
        />
        <Circle cx="60" cy="158" r="13" fill={colors.indigo} opacity={0.14} />
      </Svg>
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
      style={[
        elevacion.suave,
        {
          position: "absolute",
          left: left as never,
          top: top as never,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: 3,
          borderColor: colors.white,
        },
      ]}
    />
  );
}

/* -------------------------------------------------------------------- Estilos */

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    ...elevacion.suave,
  },
  cardLavanda: { backgroundColor: colors.lavanda, shadowOpacity: 0, elevation: 0 },
  panelIndigo: {
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    padding: 22,
    ...elevacion.media,
  },
  mapa: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.lavanda,
    ...elevacion.suave,
  },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: TOQUE_MIN + 6,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  btnFantasma: { borderColor: colors.indigo },
  btnCritico: { borderColor: colors.coral },
  btnTextoClaro: { color: colors.white, fontFamily: fuente.fuerte, fontSize: 16 },
  btnTextoIndigo: { color: colors.indigo, fontFamily: fuente.fuerte, fontSize: 16 },
  btnTextoTinta: { color: colors.ink, fontFamily: fuente.fuerte, fontSize: 16 },

  estado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
  },

  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    ...elevacion.suave,
  },
  statValor: { fontSize: 26, fontFamily: fuente.fuerte, color: colors.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 13, fontFamily: fuente.normal, color: colors.ink2, marginTop: 2 },

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
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
  },

  progresoPista: { height: 10, borderRadius: radius.pill, overflow: "hidden" },

  vacioIcono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
});
