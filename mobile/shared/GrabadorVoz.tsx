/**
 * Grabador de una nota de voz corta, reutilizable.
 *
 * No sube nada: graba en el dispositivo y entrega la grabación al padre por
 * `onChange`. El padre decide cuándo subirla (en la solicitud, al enviar). Deja
 * oírla antes de mandarla y rehacerla o quitarla. El micrófono es el mismo
 * módulo nativo que usa el chat.
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Mic, Pause, Play, RotateCcw, Settings, Trash2, X } from "lucide-react-native";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import {
  AUDIO_SET,
  MAX_SEGS,
  abrirAjustes,
  asegurarPermisoMic,
  grabadorDisponible,
  mensajeFalloGrabacion,
  mmss,
} from "./voz";
import { TOQUE_MIN, colors, font, fuente, radius } from "./theme";

export interface GrabacionVoz {
  uri: string;
  duracion: number;
}

/** "1:05" se lee mal con lector de pantalla; esto se lee "1 minuto 5 segundos". */
const durHablada = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const seg = `${r} ${r === 1 ? "segundo" : "segundos"}`;
  return m > 0 ? `${m} ${m === 1 ? "minuto" : "minutos"}${r ? ` ${seg}` : ""}` : seg;
};

export function GrabadorVoz({
  value,
  onChange,
  disabled,
}: {
  value: GrabacionVoz | null;
  onChange: (g: GrabacionVoz | null) => void;
  disabled?: boolean;
}) {
  const arp = useRef(new AudioRecorderPlayer()).current;
  const [grabando, setGrabando] = useState(false);
  const [segs, setSegs] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [error, setError] = useState("");
  // El permiso quedó en "no volver a preguntar": se ofrece abrir los ajustes.
  const [permisoBloqueado, setPermisoBloqueado] = useState(false);
  // El listener de grabación se crea una vez al empezar y cierra sobre el
  // estado de ese render (grabando = false). Con refs, el corte automático al
  // minuto ve el valor actual en vez del congelado y de verdad termina.
  const grabandoRef = useRef(false);
  const segsRef = useRef(0);

  useEffect(
    () => () => {
      arp.removeRecordBackListener();
      arp.removePlayBackListener();
      arp.stopRecorder().catch(() => {});
      arp.stopPlayer().catch(() => {});
    },
    [arp],
  );

  function fijarGrabando(v: boolean) {
    grabandoRef.current = v;
    setGrabando(v);
  }

  function fijarSegs(v: number) {
    segsRef.current = v;
    setSegs(v);
  }

  async function pararReproduccion() {
    arp.removePlayBackListener();
    try {
      await arp.stopPlayer();
    } catch {
      /* nada que detener */
    }
    setReproduciendo(false);
  }

  async function iniciar() {
    if (disabled || grabandoRef.current) return;
    setError("");
    setPermisoBloqueado(false);
    // Sin módulo nativo no tiene sentido pedir permisos: el fallo es del binario.
    if (!grabadorDisponible()) {
      setError(mensajeFalloGrabacion(null));
      return;
    }
    const permiso = await asegurarPermisoMic();
    if (!permiso.ok) {
      setPermisoBloqueado(permiso.bloqueado);
      setError(permiso.mensaje);
      return;
    }
    await pararReproduccion();
    try {
      await arp.startRecorder(undefined, AUDIO_SET);
    } catch (e) {
      fijarGrabando(false);
      setError(mensajeFalloGrabacion(e));
      return;
    }
    fijarSegs(0);
    fijarGrabando(true);
    AccessibilityInfo.announceForAccessibility(
      `Grabando. Máximo ${durHablada(MAX_SEGS)}. Toca Terminar para detener.`,
    );
    arp.addRecordBackListener((e) => {
      const s = Math.floor(e.currentPosition / 1000);
      fijarSegs(Math.min(s, MAX_SEGS));
      // Al llegar al minuto, corta sola y entrega la nota.
      if (s >= MAX_SEGS) terminar(MAX_SEGS);
    });
  }

  async function cancelar() {
    arp.removeRecordBackListener();
    try {
      await arp.stopRecorder();
    } catch {
      /* nada que detener */
    }
    fijarGrabando(false);
    fijarSegs(0);
    AccessibilityInfo.announceForAccessibility("Grabación descartada.");
  }

  async function terminar(durOverride?: number) {
    if (!grabandoRef.current) return;
    // Se marca de inmediato: el listener puede disparar otra vez mientras
    // stopRecorder aún no resuelve, y no queremos terminar dos veces.
    grabandoRef.current = false;
    arp.removeRecordBackListener();
    const dur = durOverride ?? segsRef.current;
    let uri: string;
    try {
      uri = await arp.stopRecorder();
    } catch (e) {
      console.warn("[voz] stopRecorder falló", e);
      fijarGrabando(false);
      setError("No se pudo terminar la grabación. Inténtalo de nuevo.");
      return;
    }
    fijarGrabando(false);
    fijarSegs(0);
    if (dur < 1) {
      setError("La nota de voz es muy corta.");
      onChange(null);
      return;
    }
    onChange({ uri, duracion: dur });
    AccessibilityInfo.announceForAccessibility(`Nota de voz grabada, ${durHablada(dur)}.`);
  }

  async function alternarReproduccion() {
    if (!value) return;
    if (reproduciendo) {
      await pararReproduccion();
      return;
    }
    try {
      await arp.startPlayer(value.uri);
      setReproduciendo(true);
      arp.addPlayBackListener((e) => {
        if (e.duration > 0 && e.currentPosition >= e.duration) pararReproduccion();
      });
    } catch (e) {
      console.warn("[voz] startPlayer falló", e);
      setReproduciendo(false);
      setError("No pudimos reproducir la nota.");
    }
  }

  async function quitar() {
    await pararReproduccion();
    setError("");
    onChange(null);
    AccessibilityInfo.announceForAccessibility("Nota de voz quitada.");
  }

  async function regrabar() {
    await pararReproduccion();
    onChange(null);
    iniciar();
  }

  return (
    <View>
      {grabando ? (
        <View style={estilos.barra}>
          <Pressable
            onPress={cancelar}
            accessibilityRole="button"
            accessibilityLabel="Descartar la grabación"
            accessibilityHint="Detiene la grabación sin guardarla"
            style={[estilos.boton, { backgroundColor: colors.surface2 }]}
          >
            <X size={20} color={colors.ink} />
          </Pressable>
          <View
            style={estilos.info}
            accessible
            accessibilityLabel={`Grabando, ${durHablada(segs)} de ${durHablada(MAX_SEGS)}`}
          >
            <View style={estilos.puntoRojo} />
            <Text style={[font.body, { fontFamily: fuente.fuerte }]}>
              Grabando {mmss(segs)} / {mmss(MAX_SEGS)}
            </Text>
          </View>
          <Pressable
            onPress={() => terminar()}
            accessibilityRole="button"
            accessibilityLabel="Terminar la grabación"
            accessibilityHint="Guarda la nota de voz para enviarla"
            style={[estilos.boton, { backgroundColor: colors.indigo }]}
          >
            <Check size={20} color={colors.white} />
          </Pressable>
        </View>
      ) : value ? (
        <View style={estilos.barra}>
          <Pressable
            onPress={alternarReproduccion}
            accessibilityRole="button"
            accessibilityLabel={reproduciendo ? "Pausar la nota de voz" : "Escuchar la nota de voz"}
            style={[estilos.boton, { backgroundColor: colors.indigo }]}
          >
            {reproduciendo ? <Pause size={20} color={colors.white} /> : <Play size={20} color={colors.white} />}
          </Pressable>
          <View
            style={estilos.info}
            accessible
            accessibilityLabel={`Nota de voz de ${durHablada(value.duracion)}`}
          >
            <Mic size={18} color={colors.indigo} />
            <Text style={[font.body, { fontFamily: fuente.fuerte }]}>Nota de voz · {mmss(value.duracion)}</Text>
          </View>
          <Pressable
            onPress={regrabar}
            accessibilityRole="button"
            accessibilityLabel="Grabar de nuevo"
            accessibilityHint="Reemplaza la nota de voz actual"
            style={[estilos.boton, { backgroundColor: colors.surface2 }]}
          >
            <RotateCcw size={18} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={quitar}
            accessibilityRole="button"
            accessibilityLabel="Quitar la nota de voz"
            style={[estilos.boton, { backgroundColor: colors.coralBg }]}
          >
            <Trash2 size={18} color={colors.coral} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={iniciar}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Grabar una nota de voz"
          accessibilityHint={`Empieza a grabar. Máximo ${durHablada(MAX_SEGS)}`}
          accessibilityState={{ disabled: !!disabled }}
          style={({ pressed }) => [
            estilos.iniciar,
            { borderColor: disabled ? colors.line2 : colors.indigo, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Mic size={20} color={disabled ? colors.ink3 : colors.indigo} />
          <Text style={[font.body, { fontFamily: fuente.fuerte, color: disabled ? colors.ink3 : colors.indigo }]}>
            Grabar una nota de voz
          </Text>
        </Pressable>
      )}

      {error ? (
        // liveRegion: en Android el rol "alert" por sí solo no hace que TalkBack
        // lea el texto al aparecer; la región viva sí.
        <Text
          style={[font.tiny, { color: colors.coral, marginTop: 6 }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {error}
        </Text>
      ) : null}

      {permisoBloqueado ? (
        <Pressable
          onPress={abrirAjustes}
          accessibilityRole="button"
          accessibilityLabel="Abrir ajustes"
          accessibilityHint="Abre los permisos de Miparner para activar el micrófono"
          style={({ pressed }) => [estilos.ajustes, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Settings size={20} color={colors.indigo} />
          <Text style={[font.body, { fontFamily: fuente.fuerte, color: colors.indigo }]}>Abrir ajustes</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  info: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  puntoRojo: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.coral },
  boton: {
    width: TOQUE_MIN,
    height: TOQUE_MIN,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iniciar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: TOQUE_MIN + 4,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  ajustes: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    minHeight: TOQUE_MIN,
    marginTop: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
});
