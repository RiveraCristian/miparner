import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Inbox, MapPin, MessageSquare, CalendarClock } from "lucide-react-native";
import { colors, font, fuente, radius } from "../../../../shared/theme";
import { api } from "../../../../shared/api";
import { Card, Estado, EsqueletoTarjeta, PrimaryButton, Screen, Vacio } from "../../../../shared/ui";
import type { SolicitudCercana } from "../../../../shared/types";
import type { RootStackParams } from "../../navigation";

/**
 * Cuándo es, dicho como lo diría una persona.
 *
 * El voluntario decide con esto: "mañana a las 9" se evalúa de un vistazo,
 * una marca de tiempo ISO no. Sin programación, el acompañamiento es para
 * ahora, y eso también hay que decirlo.
 */
function formatearCuando(programado: string | null): { texto: string; urgente: boolean } {
  if (!programado) return { texto: "Lo antes posible", urgente: true };

  const d = new Date(programado);
  const ahora = new Date();
  const hh = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const manana = new Date(ahora);
  manana.setDate(ahora.getDate() + 1);

  if (mismoDia(d, ahora)) {
    const faltan = Math.round((d.getTime() - ahora.getTime()) / 60000);
    // Menos de dos horas es "pronto": merece destacarse.
    return { texto: `Hoy a las ${hh}`, urgente: faltan <= 120 };
  }
  if (mismoDia(d, manana)) return { texto: `Mañana a las ${hh}`, urgente: false };
  return { texto: `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}, ${hh}`, urgente: false };
}

export function SolicitudesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [items, setItems] = useState<SolicitudCercana[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const cargar = useCallback(() => {
    api<SolicitudCercana[]>("/voluntarios/me/solicitudes?radio=8000").then(setItems).catch(() => setItems([]));
  }, []);
  useFocusEffect(useCallback(() => cargar(), [cargar]));

  async function aceptar(id: number) {
    setBusy(id);
    try { await api(`/viajes/${id}/aceptar`, { method: "POST" }); nav.replace("ViajeActivo", { viajeId: id }); }
    catch (e) { Alert.alert("No se pudo aceptar", e instanceof Error ? e.message : ""); }
    finally { setBusy(null); }
  }

  // Esqueletos con la forma de las tarjetas que van a llegar.
  if (!items)
    return (
      <Screen>
        <EsqueletoTarjeta />
        <EsqueletoTarjeta />
      </Screen>
    );

  return (
    <Screen>
      {items.length === 0 ? (
        <Vacio
          icon={Inbox}
          titulo="No hay solicitudes cerca"
          detalle="Mantente en línea: te avisamos en cuanto alguien pida acompañamiento por tu zona."
        />
      ) : null}

      {items.map((s) => (
        <Card key={s.viaje_id} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{s.deportista_nombre.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[font.h3]} numberOfLines={1}>{s.deportista_nombre}</Text>
              <Text style={font.muted}>a {Math.round(s.distancia_m)} m de ti</Text>
            </View>
          </View>

          {/* Cuándo es: sin esto el voluntario aceptaba a ciegas. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 12 }}>
            <CalendarClock
              color={formatearCuando(s.viaje_programado_at).urgente ? colors.coral : colors.indigo}
              size={18}
            />
            <Text style={[font.body, { fontFamily: fuente.fuerte, flex: 1 }]}>
              {formatearCuando(s.viaje_programado_at).texto}
            </Text>
            {s.viaje_duracion_est_min ? (
              <Text style={font.tiny}>~{s.viaje_duracion_est_min} min</Text>
            ) : null}
          </View>

          {(s.viaje_necesidades ?? []).length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {(s.viaje_necesidades ?? []).map((n) => (
                <Estado key={n} text={n.replace(/_/g, " ")} tipo="indigo" />
              ))}
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 12 }}>
            <MapPin color={colors.ink4} size={18} style={{ marginTop: 2 }} />
            <Text style={[font.muted, { flex: 1 }]}>
              {s.viaje_origen_texto ?? "Origen"} → {s.viaje_destino_texto ?? "Destino"}
            </Text>
          </View>

          {/* Lo que la persona pidió con sus palabras: se lee ANTES de aceptar. */}
          {s.viaje_comentario ? (
            <View style={styles.comentario}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <MessageSquare color={colors.indigo} size={16} />
                <Text style={[font.tiny, { color: colors.ink2, fontFamily: fuente.fuerte }]}>
                  Lo que necesita
                </Text>
              </View>
              <Text style={font.body}>{s.viaje_comentario}</Text>
            </View>
          ) : null}

          <View style={{ height: 16 }} />
          <PrimaryButton
            title={busy === s.viaje_id ? "Aceptando…" : "Aceptar acompañamiento"}
            disabled={busy === s.viaje_id}
            onPress={() => aceptar(s.viaje_id)}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: { color: colors.white, fontSize: 16, fontFamily: fuente.fuerte },
  comentario: {
    marginTop: 12,
    backgroundColor: colors.lavanda,
    borderRadius: radius.md,
    padding: 12,
  },
});
