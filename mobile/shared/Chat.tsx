/**
 * Conversación del acompañamiento · compartida por las dos apps.
 *
 * Hablan solo el deportista y el voluntario asignado, y solo dentro de ese
 * acompañamiento: no hay directorio de personas ni mensajes sueltos. El
 * historial queda en la base (auditable desde el panel) y la entrega en vivo
 * va por la sala de Socket.io del viaje.
 *
 * Un mensaje puede ser de texto o de voz. La voz se graba en el dispositivo,
 * se sube como archivo y se reproduce bajo demanda pidiendo el binario al
 * backend con el mismo token (endpoint protegido, no hay URL pública).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Flag, MessageSquare, Mic, Pause, Play, SendHorizontal, VolumeX, X } from "lucide-react-native";
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AVEncodingOption,
  OutputFormatAndroidType,
  type AudioSet,
} from "react-native-audio-recorder-player";
import { api, apiUpload, loadToken, type ArchivoLocal } from "./api";
import { API_URL } from "./config";
import { connectSocket, joinRide, leaveRide } from "./socket";
import { TOQUE_MIN, colors, elevacion, font, fuente, radius } from "./theme";
import { Estado, Vacio } from "./ui";
import type { Conversacion, Mensaje } from "./types";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

/** Segundos → "m:ss". El contador de grabación y el de reproducción. */
const mmss = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Grabamos AAC en contenedor m4a: lo entienden Android, iOS y el backend. */
const AUDIO_SET: AudioSet = {
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
  AVFormatIDKeyIOS: AVEncodingOption.aac,
};

/** Tope de duración de una nota de voz: 1 minuto. La grabación se corta sola
 *  al llegar; el backend además recorta el binario a esta duración. */
const MAX_SEGS = 60;

type EstadoVoz = "cargando" | "suena" | "pausa";

export function Chat({ viajeId, yoId }: { viajeId: number; yoId: number }) {
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // Grabación en curso.
  const [grabando, setGrabando] = useState(false);
  const [segsGrab, setSegsGrab] = useState(0);
  const [subiendoVoz, setSubiendoVoz] = useState(false);

  // Audios que este usuario ya reportó en esta sesión (para deshabilitar el botón).
  const [reportados, setReportados] = useState<Set<number>>(new Set());

  // Reproducción: qué mensaje suena ahora y por dónde va.
  const [vozId, setVozId] = useState<number | null>(null);
  const [vozEstado, setVozEstado] = useState<EstadoVoz>("cargando");
  const [vozPos, setVozPos] = useState(0);
  const [vozDur, setVozDur] = useState(0);

  const lista = useRef<FlatList<Mensaje>>(null);
  // Una sola instancia: nunca se graba y reproduce a la vez.
  const arp = useRef(new AudioRecorderPlayer()).current;

  const alFinal = useCallback(() => {
    // El salto al final espera al layout de la fila recién añadida.
    requestAnimationFrame(() => lista.current?.scrollToEnd({ animated: true }));
  }, []);

  const agregar = useCallback(
    (m: Mensaje) =>
      setConv((c) =>
        c && !c.mensajes.some((x) => x.mensajeId === m.mensajeId)
          ? { ...c, mensajes: [...c.mensajes, m] }
          : c,
      ),
    [],
  );

  useEffect(() => {
    let vivo = true;
    let socket: Awaited<ReturnType<typeof connectSocket>> | undefined;

    const alLlegar = (m: Mensaje) => {
      if (m.mensajeViajeId !== viajeId) return;
      agregar(m);
      alFinal();
    };

    api<Conversacion>(`/viajes/${viajeId}/mensajes`)
      .then((c) => {
        if (!vivo) return;
        setConv(c);
        alFinal();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No pudimos abrir el chat"));

    (async () => {
      socket = await connectSocket();
      joinRide(viajeId);
      socket.on("mensaje_nuevo", alLlegar);
    })();

    return () => {
      vivo = false;
      leaveRide(viajeId);
      socket?.off("mensaje_nuevo", alLlegar);
    };
  }, [viajeId, alFinal, agregar]);

  // Al salir de la pantalla, cortar grabación y reproducción.
  useEffect(
    () => () => {
      arp.removeRecordBackListener();
      arp.removePlayBackListener();
      arp.stopRecorder().catch(() => {});
      arp.stopPlayer().catch(() => {});
    },
    [arp],
  );

  const sinContraparte = conv !== null && conv.contraparte === null;

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const m = await api<Mensaje>(`/viajes/${viajeId}/mensajes`, {
        method: "POST",
        body: { texto: limpio },
      });
      setTexto("");
      agregar(m);
      alFinal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  }

  // --- Reproducción ---------------------------------------------------------

  const detenerReproduccion = useCallback(async () => {
    arp.removePlayBackListener();
    try {
      await arp.stopPlayer();
    } catch {
      /* nada que detener */
    }
    setVozId(null);
    setVozEstado("cargando");
    setVozPos(0);
    setVozDur(0);
  }, [arp]);

  async function reproducirVoz(m: Mensaje) {
    // Si ya es el que suena, el toque alterna pausa/reanudar.
    if (vozId === m.mensajeId) {
      if (vozEstado === "suena") {
        await arp.pausePlayer();
        setVozEstado("pausa");
      } else if (vozEstado === "pausa") {
        await arp.resumePlayer();
        setVozEstado("suena");
      }
      return;
    }

    await detenerReproduccion();
    const token = await loadToken();
    const url = `${API_URL}/viajes/${viajeId}/mensajes/${m.mensajeId}/audio`;
    setVozId(m.mensajeId);
    setVozEstado("cargando");
    setVozPos(0);
    setVozDur((m.mensajeAudioDuracion ?? 0) * 1000);
    try {
      await arp.startPlayer(url, token ? { Authorization: `Bearer ${token}` } : undefined);
      setVozEstado("suena");
      arp.addPlayBackListener((e) => {
        setVozPos(e.currentPosition);
        if (e.duration > 0) setVozDur(e.duration);
        if (e.duration > 0 && e.currentPosition >= e.duration) detenerReproduccion();
      });
    } catch {
      await detenerReproduccion();
      setError("No pudimos reproducir el audio.");
    }
  }

  // --- Grabación ------------------------------------------------------------

  async function pedirPermisoMic(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: "Permiso de micrófono",
      message: "Miparner necesita el micrófono para grabar tu mensaje de voz.",
      buttonPositive: "Permitir",
      buttonNegative: "Ahora no",
    });
    return r === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function iniciarGrabacion() {
    if (grabando || sinContraparte || subiendoVoz) return;
    if (!(await pedirPermisoMic())) {
      setError("Necesitamos permiso del micrófono para grabar.");
      return;
    }
    await detenerReproduccion();
    setError("");
    try {
      await arp.startRecorder(undefined, AUDIO_SET);
      setSegsGrab(0);
      setGrabando(true);
      arp.addRecordBackListener((e) => {
        const s = Math.floor(e.currentPosition / 1000);
        setSegsGrab(Math.min(s, MAX_SEGS));
        // Al llegar al minuto, corta sola y envía.
        if (s >= MAX_SEGS) enviarVoz(MAX_SEGS);
      });
    } catch {
      setGrabando(false);
      setError("No pudimos acceder al micrófono.");
    }
  }

  async function cancelarGrabacion() {
    arp.removeRecordBackListener();
    try {
      await arp.stopRecorder();
    } catch {
      /* nada que detener */
    }
    setGrabando(false);
    setSegsGrab(0);
  }

  async function enviarVoz(durOverride?: number) {
    if (!grabando || subiendoVoz) return;
    arp.removeRecordBackListener();
    const dur = durOverride ?? segsGrab;
    let uri: string;
    try {
      uri = await arp.stopRecorder();
    } catch {
      setGrabando(false);
      setError("No se pudo terminar la grabación.");
      return;
    }
    setGrabando(false);
    setSegsGrab(0);
    if (dur < 1) {
      setError("El mensaje de voz es muy corto.");
      return;
    }

    setSubiendoVoz(true);
    setError("");
    try {
      const archivo: ArchivoLocal = {
        uri: /^(file|content):\/\//.test(uri) ? uri : `file://${uri}`,
        name: "voz.m4a",
        type: "audio/mp4",
      };
      const m = await apiUpload<Mensaje>(
        `/viajes/${viajeId}/mensajes/voz`,
        archivo,
        { duracion: String(dur) },
        "audio",
      );
      agregar(m);
      alFinal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje de voz");
    } finally {
      setSubiendoVoz(false);
    }
  }

  // --- Reporte ---------------------------------------------------------------

  /** Denuncia un audio recibido por lenguaje inapropiado (lo revisa el equipo). */
  function reportarVoz(m: Mensaje) {
    if (reportados.has(m.mensajeId)) return;
    Alert.alert(
      "Reportar audio",
      "¿Reportar este audio por lenguaje inapropiado? El equipo de Miparner lo revisará.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reportar",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/viajes/${viajeId}/mensajes/${m.mensajeId}/reportar`, {
                method: "POST",
                body: { motivo: "lenguaje inapropiado" },
              });
              setReportados((s) => new Set(s).add(m.mensajeId));
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo reportar el audio");
            }
          },
        },
      ],
    );
  }

  const puedeEnviarTexto = texto.trim().length > 0 && !enviando && !sinContraparte;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Con quién se habla, siempre visible. */}
        <View style={estilos.cabecera}>
          <View style={estilos.avatar}>
            <Text style={estilos.avatarTexto}>
              {(conv?.contraparte?.nombre ?? "··").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[font.body, { fontFamily: fuente.fuerte }]} numberOfLines={1}>
              {conv?.contraparte?.nombre ?? "Sin voluntario asignado"}
            </Text>
            <Text style={font.tiny}>
              {conv?.contraparte
                ? conv.contraparte.rol === "voluntario"
                  ? "Tu voluntario"
                  : "Deportista"
                : "La conversación se abre al asignarse un voluntario"}
            </Text>
          </View>
          {conv ? <Estado text={conv.estado.replace(/_/g, " ")} tipo="indigo" /> : null}
        </View>

        {error ? (
          <View style={estilos.error} accessibilityRole="alert">
            <Text style={font.body}>{error}</Text>
          </View>
        ) : null}

        {!conv ? (
          <View style={{ padding: 40, alignItems: "center", gap: 12 }} accessibilityRole="progressbar">
            <ActivityIndicator color={colors.indigo} />
            <Text style={font.tiny}>Abriendo la conversación…</Text>
          </View>
        ) : (
          <FlatList
            ref={lista}
            data={conv.mensajes}
            keyExtractor={(m) => String(m.mensajeId)}
            extraData={{ vozId, vozEstado, vozPos, vozDur, reportados }}
            contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
            onContentSizeChange={alFinal}
            ListEmptyComponent={
              <Vacio
                icon={MessageSquare}
                titulo={sinContraparte ? "Todavía no hay con quién hablar" : "Aún no hay mensajes"}
                detalle={
                  sinContraparte
                    ? "En cuanto un voluntario acepte tu acompañamiento podrán escribirse aquí."
                    : "Escribe el primero: cuenta dónde estás o cualquier detalle útil."
                }
              />
            }
            renderItem={({ item }) => (
              <Burbuja
                mensaje={item}
                mio={item.mensajeEmisorId === yoId}
                sonando={vozId === item.mensajeId}
                estadoVoz={vozEstado}
                posMs={vozPos}
                durMs={vozDur}
                onReproducir={reproducirVoz}
                onReportar={reportarVoz}
                reportado={reportados.has(item.mensajeId)}
              />
            )}
          />
        )}

        {grabando ? (
          <View style={estilos.barra}>
            <Pressable
              onPress={cancelarGrabacion}
              accessibilityRole="button"
              accessibilityLabel="Descartar la grabación"
              style={[estilos.boton, { backgroundColor: colors.surface2 }]}
            >
              <X size={20} color={colors.ink} />
            </Pressable>
            <View style={estilos.grabInfo}>
              <View style={estilos.puntoRojo} />
              <Text style={[font.body, { fontFamily: fuente.fuerte }]}>
                Grabando {mmss(segsGrab)} / {mmss(MAX_SEGS)}
              </Text>
            </View>
            <Pressable
              onPress={() => enviarVoz()}
              accessibilityRole="button"
              accessibilityLabel="Enviar el mensaje de voz"
              style={[estilos.boton, { backgroundColor: colors.indigo }]}
            >
              <Check size={20} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <View style={estilos.barra}>
            <TextInput
              style={estilos.entrada}
              value={texto}
              onChangeText={setTexto}
              placeholder={sinContraparte ? "Sin voluntario asignado" : "Escribe un mensaje…"}
              placeholderTextColor={colors.ink3}
              editable={!sinContraparte}
              multiline
              maxLength={1000}
              accessibilityLabel="Mensaje"
              onSubmitEditing={enviar}
            />
            {texto.trim().length === 0 ? (
              <Pressable
                onPress={iniciarGrabacion}
                disabled={sinContraparte || subiendoVoz}
                accessibilityRole="button"
                accessibilityLabel="Grabar un mensaje de voz"
                accessibilityState={{ disabled: sinContraparte || subiendoVoz }}
                style={({ pressed }) => [
                  estilos.boton,
                  {
                    backgroundColor:
                      sinContraparte || subiendoVoz
                        ? colors.surface2
                        : pressed
                          ? colors.tinta
                          : colors.indigo,
                  },
                ]}
              >
                {subiendoVoz ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Mic size={20} color={sinContraparte ? colors.ink3 : colors.white} />
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={enviar}
                disabled={!puedeEnviarTexto}
                accessibilityRole="button"
                accessibilityLabel="Enviar mensaje"
                accessibilityState={{ disabled: !puedeEnviarTexto }}
                style={({ pressed }) => [
                  estilos.boton,
                  { backgroundColor: !puedeEnviarTexto ? colors.surface2 : pressed ? colors.tinta : colors.indigo },
                ]}
              >
                <SendHorizontal size={20} color={puedeEnviarTexto ? colors.white : colors.ink3} />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Burbuja de mensaje. Lo propio va en índigo a la derecha y lo recibido en
 * blanco a la izquierda: además del color, cambia el lado y el aviso de
 * lectura, así que el estado no depende solo del matiz. Si el mensaje es de
 * voz, en lugar del texto va el reproductor.
 */
function Burbuja({
  mensaje,
  mio,
  sonando,
  estadoVoz,
  posMs,
  durMs,
  onReproducir,
  onReportar,
  reportado,
}: {
  mensaje: Mensaje;
  mio: boolean;
  sonando: boolean;
  estadoVoz: EstadoVoz;
  posMs: number;
  durMs: number;
  onReproducir: (m: Mensaje) => void;
  onReportar: (m: Mensaje) => void;
  reportado: boolean;
}) {
  const retirado = !!mensaje.mensajeModeradoAt;
  const esVoz = !!mensaje.mensajeAudioArchivo;
  // El botón de reporte solo en audios recibidos y aún disponibles.
  const puedeReportar = !mio && esVoz && !retirado;
  return (
    <View style={[estilos.fila, { justifyContent: mio ? "flex-end" : "flex-start" }]}>
      <View style={[estilos.burbuja, mio ? estilos.burbujaMia : estilos.burbujaSuya]}>
        {retirado ? (
          <View style={estilos.retirado}>
            <VolumeX size={18} color={mio ? colors.lav200 : colors.ink3} />
            <Text style={[font.body, { fontStyle: "italic" }, mio ? { color: colors.lav200 } : { color: colors.ink3 }]}>
              Audio retirado por moderación
            </Text>
          </View>
        ) : esVoz ? (
          <Voz
            mensaje={mensaje}
            mio={mio}
            sonando={sonando}
            estadoVoz={estadoVoz}
            posMs={posMs}
            durMs={durMs}
            onReproducir={onReproducir}
          />
        ) : (
          <Text style={[font.body, mio && { color: colors.white }]}>{mensaje.mensajeTexto}</Text>
        )}

        {puedeReportar ? (
          <Pressable
            onPress={() => onReportar(mensaje)}
            disabled={reportado}
            accessibilityRole="button"
            accessibilityLabel={reportado ? "Audio reportado" : "Reportar este audio por lenguaje inapropiado"}
            style={estilos.reportar}
          >
            <Flag size={13} color={reportado ? colors.ink3 : colors.coral} />
            <Text style={[font.tiny, { color: reportado ? colors.ink3 : colors.coral }]}>
              {reportado ? "Reportado" : "Reportar"}
            </Text>
          </Pressable>
        ) : null}

        <Text style={[font.tiny, { marginTop: 4 }, mio && { color: colors.lav200 }]}>
          {hora(mensaje.createdAt)}
          {mio ? (mensaje.mensajeLeidoAt ? " · leído" : " · enviado") : ""}
        </Text>
      </View>
    </View>
  );
}

/** Reproductor de un mensaje de voz: botón play/pausa, barra y tiempo. */
function Voz({
  mensaje,
  mio,
  sonando,
  estadoVoz,
  posMs,
  durMs,
  onReproducir,
}: {
  mensaje: Mensaje;
  mio: boolean;
  sonando: boolean;
  estadoVoz: EstadoVoz;
  posMs: number;
  durMs: number;
  onReproducir: (m: Mensaje) => void;
}) {
  const totalSecs = mensaje.mensajeAudioDuracion ?? 0;
  const cargando = sonando && estadoVoz === "cargando";
  const enMarcha = sonando && estadoVoz === "suena";
  const pct = sonando && durMs > 0 ? Math.min(1, posMs / durMs) : 0;
  const secsMostrados = sonando ? Math.floor(posMs / 1000) : totalSecs;

  const principal = mio ? colors.white : colors.indigo;
  const pista = mio ? "rgba(255,255,255,0.3)" : colors.surface2;
  const Icono = enMarcha ? Pause : Play;

  return (
    <Pressable
      onPress={() => onReproducir(mensaje)}
      accessibilityRole="button"
      accessibilityLabel={
        enMarcha ? "Pausar mensaje de voz" : `Reproducir mensaje de voz de ${mmss(totalSecs)}`
      }
      style={estilos.vozFila}
    >
      <View
        style={[estilos.vozBoton, { backgroundColor: mio ? "rgba(255,255,255,0.2)" : colors.lavanda }]}
      >
        {cargando ? (
          <ActivityIndicator size="small" color={principal} />
        ) : (
          <Icono size={18} color={principal} />
        )}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[estilos.vozPista, { backgroundColor: pista }]}>
          <View style={[estilos.vozProgreso, { backgroundColor: principal, width: `${pct * 100}%` }]} />
        </View>
        <Text style={[font.tiny, mio && { color: colors.lav200 }]}>{mmss(secsMostrados)}</Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: { color: colors.white, fontSize: 15, fontFamily: fuente.fuerte },

  fila: { flexDirection: "row", marginBottom: 10 },
  burbuja: { maxWidth: "82%", borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  burbujaMia: { backgroundColor: colors.indigo, borderBottomRightRadius: radius.sm },
  burbujaSuya: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.sm,
    ...elevacion.suave,
  },

  // Reproductor de voz dentro de la burbuja.
  vozFila: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180 },
  vozBoton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  vozPista: { height: 4, borderRadius: 2, overflow: "hidden" },
  vozProgreso: { height: 4, borderRadius: 2 },

  // Aviso de audio retirado por moderación.
  retirado: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 180 },
  // Enlace "Reportar" bajo un audio recibido.
  reportar: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, alignSelf: "flex-start" },

  error: {
    backgroundColor: colors.coralBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    padding: 12,
    margin: 16,
    borderRadius: radius.sm,
  },

  barra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line2,
  },
  entrada: {
    flex: 1,
    minHeight: TOQUE_MIN,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
    alignSelf: "stretch",
  },
  boton: {
    width: TOQUE_MIN + 4,
    height: TOQUE_MIN + 4,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // Pastilla central mientras se graba: punto rojo + contador.
  grabInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: TOQUE_MIN,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  puntoRojo: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.coral },
});
