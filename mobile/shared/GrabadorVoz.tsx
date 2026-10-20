/**
 * Grabador de una nota de voz corta, reutilizable.
 *
 * No sube nada: graba en el dispositivo y entrega la grabación al padre por
 * `onChange`. El padre decide cuándo subirla (en la solicitud, al enviar). Deja
 * oírla antes de mandarla y rehacerla o quitarla. El micrófono es el mismo
 * módulo nativo que usa el chat.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Mic, Pause, Play, RotateCcw, Trash2, X } from "lucide-react-native";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import { AUDIO_SET, mmss, pedirPermisoMic } from "./voz";
import { TOQUE_MIN, colors, font, fuente, radius } from "./theme";

export interface GrabacionVoz {
  uri: string;
  duracion: number;
}

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

  useEffect(
    () => () => {
      arp.removeRecordBackListener();
      arp.removePlayBackListener();
      arp.stopRecorder().catch(() => {});
      arp.stopPlayer().catch(() => {});
    },
    [arp],
  );

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
    if (disabled || grabando) return;
    if (!(await pedirPermisoMic())) {
      setError("Necesitamos permiso del micrófono para grabar.");
      return;
    }
    await pararReproduccion();
    setError("");
    try {
      await arp.startRecorder(undefined, AUDIO_SET);
      setSegs(0);
      setGrabando(true);
      arp.addRecordBackListener((e) => setSegs(Math.floor(e.currentPosition / 1000)));
    } catch {
      setGrabando(false);
      setError("No pudimos acceder al micrófono.");
    }
  }

  async function cancelar() {
    arp.removeRecordBackListener();
    try {
      await arp.stopRecorder();
    } catch {
      /* nada que detener */
    }
    setGrabando(false);
    setSegs(0);
  }

  async function terminar() {
    if (!grabando) return;
    arp.removeRecordBackListener();
    const dur = segs;
    let uri: string;
    try {
      uri = await arp.stopRecorder();
    } catch {
      setGrabando(false);
      setError("No se pudo terminar la grabación.");
      return;
    }
    setGrabando(false);
    setSegs(0);
    if (dur < 1) {
      setError("La nota de voz es muy corta.");
      onChange(null);
      return;
    }
    onChange({ uri, duracion: dur });
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
    } catch {
      setReproduciendo(false);
      setError("No pudimos reproducir la nota.");
    }
  }

  async function quitar() {
    await pararReproduccion();
    setError("");
    onChange(null);
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
            style={[estilos.boton, { backgroundColor: colors.surface2 }]}
          >
            <X size={20} color={colors.ink} />
          </Pressable>
          <View style={estilos.info}>
            <View style={estilos.puntoRojo} />
            <Text style={[font.body, { fontFamily: fuente.fuerte }]}>Grabando {mmss(segs)}</Text>
          </View>
          <Pressable
            onPress={terminar}
            accessibilityRole="button"
            accessibilityLabel="Terminar la grabación"
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
          <View style={estilos.info}>
            <Mic size={18} color={colors.indigo} />
            <Text style={[font.body, { fontFamily: fuente.fuerte }]}>Nota de voz · {mmss(value.duracion)}</Text>
          </View>
          <Pressable
            onPress={regrabar}
            accessibilityRole="button"
            accessibilityLabel="Grabar de nuevo"
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
        <Text style={[font.tiny, { color: colors.coral, marginTop: 6 }]} accessibilityRole="alert">
          {error}
        </Text>
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
});
