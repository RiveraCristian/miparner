import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Activity, Flag, Inbox, MapPin, MessageSquare, CalendarClock, Pause, Play } from "lucide-react-native";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import { colors, font, fuente, radius } from "../../../../shared/theme";
import { api, loadToken } from "../../../../shared/api";
import { API_URL } from "../../../../shared/config";
import { mmss } from "../../../../shared/voz";
import { Card, Estado, EsqueletoTarjeta, PrimaryButton, Screen, Vacio } from "../../../../shared/ui";
import type { SolicitudCercana } from "../../../../shared/types";
import type { RootStackParams } from "../../navigation";

/** Nivel atlético autodeclarado, con su mayúscula para mostrarlo. */
const nivelLabel = (n: string) => n.charAt(0).toUpperCase() + n.slice(1);

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
  // Nota de voz: qué solicitud suena ahora y si está cargando.
  const [vozId, setVozId] = useState<number | null>(null);
  const [vozCargando, setVozCargando] = useState(false);
  // Notas de voz ya reportadas en esta sesión (para deshabilitar el botón).
  const [reportadas, setReportadas] = useState<Set<number>>(new Set());
  const arp = useRef(new AudioRecorderPlayer()).current;

  const cargar = useCallback(() => {
    api<SolicitudCercana[]>("/voluntarios/me/solicitudes?radio=8000").then(setItems).catch(() => setItems([]));
  }, []);
  useFocusEffect(useCallback(() => cargar(), [cargar]));

  useEffect(
    () => () => {
      arp.removePlayBackListener();
      arp.stopPlayer().catch(() => {});
    },
    [arp],
  );

  async function pararNota() {
    arp.removePlayBackListener();
    try {
      await arp.stopPlayer();
    } catch {
      /* nada que detener */
    }
    setVozId(null);
    setVozCargando(false);
  }

  async function reproducirNota(viajeId: number) {
    if (vozId === viajeId) {
      await pararNota();
      return;
    }
    await pararNota();
    const token = await loadToken();
    setVozId(viajeId);
    setVozCargando(true);
    try {
      await arp.startPlayer(
        `${API_URL}/viajes/${viajeId}/comentario-voz`,
        token ? { Authorization: `Bearer ${token}` } : undefined,
      );
      setVozCargando(false);
      arp.addPlayBackListener((e) => {
        if (e.duration > 0 && e.currentPosition >= e.duration) pararNota();
      });
    } catch {
      await pararNota();
      Alert.alert("No se pudo reproducir", "La nota de voz no está disponible.");
    }
  }

  /** Denuncia la nota de voz de una solicitud por lenguaje inapropiado. */
  function reportarNota(viajeId: number) {
    if (reportadas.has(viajeId)) return;
    Alert.alert(
      "Reportar nota de voz",
      "¿Reportar esta nota de voz por lenguaje inapropiado? El equipo de Miparner la revisará.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reportar",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/viajes/${viajeId}/comentario-voz/reportar`, {
                method: "POST",
                body: { motivo: "lenguaje inapropiado" },
              });
              setReportadas((s) => new Set(s).add(viajeId));
            } catch (e) {
              Alert.alert("No se pudo reportar", e instanceof Error ? e.message : "");
            }
          },
        },
      ],
    );
  }

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

          {/* Nivel atlético autodeclarado: le dice al voluntario qué esperar. */}
          {s.deportista_nivel_atletico ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
              <Activity color={colors.indigo} size={16} />
              <Text style={[font.body, { fontFamily: fuente.fuerte }]}>
                Nivel {nivelLabel(s.deportista_nivel_atletico)}
              </Text>
            </View>
          ) : null}

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

          {/* Nota de voz de la solicitud: se escucha ANTES de aceptar. */}
          {s.viaje_comentario_audio_duracion ? (
            <>
              <Pressable
                onPress={() => reproducirNota(s.viaje_id)}
                accessibilityRole="button"
                accessibilityLabel={
                  vozId === s.viaje_id ? "Pausar la nota de voz" : "Escuchar la nota de voz de la solicitud"
                }
                style={styles.notaVoz}
              >
                <View style={styles.notaVozBoton}>
                  {vozCargando && vozId === s.viaje_id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : vozId === s.viaje_id ? (
                    <Pause size={18} color={colors.white} />
                  ) : (
                    <Play size={18} color={colors.white} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[font.tiny, { color: colors.ink2, fontFamily: fuente.fuerte }]}>
                    Nota de voz
                  </Text>
                  <Text style={font.body}>Escuchar · {mmss(s.viaje_comentario_audio_duracion)}</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => reportarNota(s.viaje_id)}
                disabled={reportadas.has(s.viaje_id)}
                accessibilityRole="button"
                accessibilityLabel={
                  reportadas.has(s.viaje_id)
                    ? "Nota de voz reportada"
                    : "Reportar la nota de voz por lenguaje inapropiado"
                }
                style={styles.reportar}
              >
                <Flag size={13} color={reportadas.has(s.viaje_id) ? colors.ink3 : colors.coral} />
                <Text style={[font.tiny, { color: reportadas.has(s.viaje_id) ? colors.ink3 : colors.coral }]}>
                  {reportadas.has(s.viaje_id) ? "Reportada" : "Reportar"}
                </Text>
              </Pressable>
            </>
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
  notaVoz: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.lavanda,
    borderRadius: radius.md,
    padding: 12,
  },
  notaVozBoton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  reportar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
});
