/**
 * Cuándo quiere la persona el acompañamiento.
 *
 * Antes todo era inmediato, y por eso el voluntario no veía día ni hora: el
 * "cuándo" era siempre ahora. Pero quien entrena tiene horarios, y avisar con
 * un día de antelación es lo que hace que alguien pueda organizarse para
 * acompañarle.
 *
 * Por qué no se usa el selector nativo de fecha del sistema: abre un diálogo
 * modal que en varios lectores de pantalla se navega mal, y obliga a instalar
 * otra dependencia nativa. Esto son botones normales —un día, una hora— que
 * cualquier lector lee sin problema y que se tocan con el dedo gordo.
 *
 * Se ofrecen los próximos días y horas en bloques de media hora, que es como
 * la gente piensa una cita: "el jueves a las nueve y media", no una marca de
 * tiempo.
 */
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarDays, Clock, Zap } from "lucide-react-native";
import { colors, elevacion, font, fuente, radius, TOQUE_MIN } from "./theme";
import { Etiqueta } from "./ui";

/** Null significa "lo antes posible", que es como funcionaba todo antes. */
export type Cuando = Date | null;

interface Props {
  valor: Cuando;
  onCambiar: (v: Cuando) => void;
  /** Cuántos días hacia delante se ofrecen. */
  dias?: number;
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Franja razonable para entrenar. Fuera de ella casi no hay voluntarios. */
const HORA_DESDE = 6;
const HORA_HASTA = 22;

function mismoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function nombreDia(d: Date, hoy: Date) {
  if (mismoDia(d, hoy)) return "Hoy";
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  if (mismoDia(d, manana)) return "Mañana";
  return DIAS_SEMANA[d.getDay()];
}

export function CuandoLoQuiero({ valor, onCambiar, dias = 14 }: Props) {
  const hoy = useMemo(() => new Date(), []);

  const opcionesDia = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < dias; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
    return out;
  }, [hoy, dias]);

  const diaElegido = valor ?? null;

  /** Horas disponibles del día elegido; hoy no se ofrecen horas ya pasadas. */
  const horas = useMemo(() => {
    if (!diaElegido) return [];
    const esHoy = mismoDia(diaElegido, hoy);
    // Margen: nadie puede acompañarte dentro de diez minutos.
    const minimo = new Date(hoy.getTime() + 45 * 60 * 1000);
    const out: Date[] = [];
    for (let h = HORA_DESDE; h <= HORA_HASTA; h++) {
      for (const m of [0, 30]) {
        const t = new Date(diaElegido);
        t.setHours(h, m, 0, 0);
        if (esHoy && t < minimo) continue;
        out.push(t);
      }
    }
    return out;
  }, [diaElegido, hoy]);

  function elegirDia(d: Date) {
    // Conserva la hora si ya había una; si no, propone las 9:00.
    const t = new Date(d);
    if (valor) t.setHours(valor.getHours(), valor.getMinutes(), 0, 0);
    else t.setHours(9, 0, 0, 0);

    // Si eso cae en el pasado (hoy, tarde), se empuja al primer hueco válido.
    const minimo = new Date(Date.now() + 45 * 60 * 1000);
    onCambiar(t < minimo ? minimo : t);
  }

  function elegirHora(t: Date) {
    onCambiar(new Date(t));
  }

  const resumen = valor
    ? `${nombreDia(valor, hoy)} ${valor.getDate()} de ${MESES[valor.getMonth()]}, ` +
      `${String(valor.getHours()).padStart(2, "0")}:${String(valor.getMinutes()).padStart(2, "0")}`
    : "Lo antes posible";

  return (
    <View style={{ gap: 10 }}>
      <Etiqueta>¿Cuándo lo necesitas?</Etiqueta>

      {/* Lo antes posible sigue siendo una opción de primera clase: hay
          urgencias, y obligar a elegir una hora las haría más lentas. */}
      <Pressable
        onPress={() => onCambiar(null)}
        accessibilityRole="radio"
        accessibilityState={{ selected: valor === null }}
        accessibilityLabel="Lo antes posible"
        accessibilityHint="Pide el acompañamiento para ahora mismo"
        style={({ pressed }) => [
          styles.ahora,
          valor === null && styles.ahoraActivo,
          pressed && { backgroundColor: colors.lavanda },
        ]}
      >
        <View style={[styles.icono, { backgroundColor: valor === null ? colors.indigo : colors.lavanda }]}>
          <Zap color={valor === null ? colors.white : colors.indigo} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[font.body, { fontFamily: fuente.fuerte }]}>Lo antes posible</Text>
          <Text style={font.tiny}>Avisamos a los voluntarios cercanos ahora mismo</Text>
        </View>
      </Pressable>

      <View style={styles.separador}>
        <View style={styles.linea} />
        <Text style={font.tiny}>o agenda un día</Text>
        <View style={styles.linea} />
      </View>

      {/* --- Día --- */}
      <View style={{ gap: 7 }}>
        <View style={styles.cabeceraFila}>
          <CalendarDays color={colors.ink3} size={15} />
          <Text style={font.tiny}>Día</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {opcionesDia.map((d) => {
            const activo = !!valor && mismoDia(valor, d);
            const etiqueta = `${nombreDia(d, hoy)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => elegirDia(d)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={etiqueta}
                style={({ pressed }) => [
                  styles.dia,
                  activo && styles.diaActivo,
                  pressed && !activo && { backgroundColor: colors.lavanda },
                ]}
              >
                <Text style={[styles.diaNombre, activo && { color: colors.white }]}>
                  {nombreDia(d, hoy)}
                </Text>
                <Text style={[styles.diaNumero, activo && { color: colors.white }]}>
                  {d.getDate()}
                </Text>
                <Text style={[styles.diaMes, activo && { color: colors.lav200 }]}>
                  {MESES[d.getMonth()]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* --- Hora --- */}
      {valor && (
        <View style={{ gap: 7 }}>
          <View style={styles.cabeceraFila}>
            <Clock color={colors.ink3} size={15} />
            <Text style={font.tiny}>Hora</Text>
          </View>
          {horas.length === 0 ? (
            <Text style={font.muted}>
              Ya no quedan horas disponibles hoy. Elige otro día.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {horas.map((t) => {
                const activo =
                  valor.getHours() === t.getHours() && valor.getMinutes() === t.getMinutes();
                const hh = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
                return (
                  <Pressable
                    key={t.toISOString()}
                    onPress={() => elegirHora(t)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                    accessibilityLabel={`${hh} horas`}
                    style={({ pressed }) => [
                      styles.hora,
                      activo && styles.horaActiva,
                      pressed && !activo && { backgroundColor: colors.lavanda },
                    ]}
                  >
                    <Text
                      style={[
                        { fontSize: 15, fontFamily: fuente.fuerte },
                        { color: activo ? colors.white : colors.ink2 },
                      ]}
                    >
                      {hh}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Lo elegido, siempre en texto: el color de un botón no basta. */}
      <View style={styles.resumen} accessibilityLiveRegion="polite">
        <Text style={[font.body, { fontFamily: fuente.fuerte }]}>{resumen}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ahora: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: TOQUE_MIN + 14,
    padding: 13,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  ahoraActivo: { borderColor: colors.indigo, backgroundColor: colors.lavanda },
  icono: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  separador: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 },
  linea: { flex: 1, height: 1, backgroundColor: colors.line },

  cabeceraFila: { flexDirection: "row", alignItems: "center", gap: 6 },

  dia: {
    minWidth: 62,
    minHeight: TOQUE_MIN + 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  diaActivo: { backgroundColor: colors.indigo, borderColor: colors.indigo, ...elevacion.suave },
  diaNombre: { fontSize: 11, fontFamily: fuente.medio, color: colors.ink3, textTransform: "capitalize" },
  diaNumero: { fontSize: 19, fontFamily: fuente.fuerte, color: colors.ink, lineHeight: 24 },
  diaMes: { fontSize: 11, fontFamily: fuente.normal, color: colors.ink3 },

  hora: {
    minWidth: 68,
    minHeight: TOQUE_MIN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  horaActiva: { backgroundColor: colors.indigo, borderColor: colors.indigo },

  resumen: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
});
