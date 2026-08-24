import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LocateFixed, MapPin, Send } from "lucide-react-native";
import { colors, font, fuente, radius } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Mapa } from "../../../shared/Mapa";
import { MAPA_CENTRO_DEFECTO } from "../../../shared/config";
import { useMiUbicacion } from "../../../shared/ubicacion";
import { Card, Etiqueta, Pill, PrimaryButton, Screen } from "../../../shared/ui";
import type { LatLng, Viaje } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

/** Si el GPS no responde (permiso denegado, interior sin señal), se parte de aquí. */
const ORIGEN_RESPALDO = { ...MAPA_CENTRO_DEFECTO, texto: "Centro de Santiago" };

const DESTINOS = [
  { texto: "Centro de Alto Rendimiento", lat: -33.4515, lng: -70.61 },
  { texto: "Estadio Nacional", lat: -33.464, lng: -70.6108 },
  { texto: "Centro médico", lat: -33.437, lng: -70.634 },
];

const NECESIDADES = [
  { key: "silla_ruedas", label: "Silla de ruedas" },
  { key: "guia_visual", label: "Guía visual" },
  { key: "rampa", label: "Rampa" },
  { key: "acompanante", label: "Acompañante" },
];

const MAX_COMENTARIO = 1000;

export function SolicitarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [destino, setDestino] = useState<{ texto: string; lat: number; lng: number }>(DESTINOS[0]);
  const [necesidades, setNecesidades] = useState<string[]>(["silla_ruedas"]);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);
  /** Origen movido a mano sobre el mapa; mientras sea null, manda el GPS. */
  const [origenManual, setOrigenManual] = useState<LatLng | null>(null);
  /** Qué mueve el próximo toque en el mapa. */
  const [moviendo, setMoviendo] = useState<"origen" | "destino">("destino");

  const { punto: gps, error: errorGps } = useMiUbicacion(true, 25);

  const origen = origenManual ?? gps ?? ORIGEN_RESPALDO;
  const origenTexto = origenManual
    ? "Punto elegido en el mapa"
    : gps
      ? "Tu ubicación actual"
      : ORIGEN_RESPALDO.texto;

  const toggle = (k: string) =>
    setNecesidades((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  function elegirEnMapa(p: LatLng) {
    if (moviendo === "origen") setOrigenManual(p);
    else setDestino({ ...p, texto: "Punto elegido en el mapa" });
  }

  async function solicitar() {
    setBusy(true);
    try {
      const viaje = await api<Viaje>("/viajes", {
        method: "POST",
        body: {
          origen: { lat: origen.lat, lng: origen.lng },
          destino: { lat: destino.lat, lng: destino.lng },
          origenTexto,
          destinoTexto: destino.texto,
          necesidades,
          comentario: comentario.trim() || undefined,
        },
      });
      nav.replace("EnViaje", { viajeId: viaje.viajeId });
    } catch (e) {
      Alert.alert("No se pudo solicitar", e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Mapa
        alto={220}
        origen={origen}
        destino={destino}
        miUbicacion
        interactivo
        onElegirPunto={elegirEnMapa}
        descripcion={`Recorrido de ${origenTexto} a ${destino.texto}.`}
      />

      {/* Qué mueve el toque en el mapa: sin esto, el gesto es ambiguo. */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Pill label="Mover origen" active={moviendo === "origen"} onPress={() => setMoviendo("origen")} />
        <Pill label="Mover destino" active={moviendo === "destino"} onPress={() => setMoviendo("destino")} />
      </View>

      <Card style={{ padding: 0, overflow: "hidden", marginTop: 16 }}>
        {/* Origen en índigo, destino en coral: dos formas distintas, no dos matices. */}
        <View style={styles.punto}>
          <View style={[styles.puntoIcono, { backgroundColor: colors.lavanda }]}>
            {origenManual || !gps ? (
              <MapPin color={colors.indigo} size={19} />
            ) : (
              <LocateFixed color={colors.indigo} size={19} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Etiqueta>Origen</Etiqueta>
            <Text style={[font.body, { fontFamily: fuente.fuerte, marginTop: 2 }]}>{origenTexto}</Text>
            {origenManual ? (
              <Text style={font.tiny} onPress={() => setOrigenManual(null)} accessibilityRole="button">
                Volver a mi ubicación actual
              </Text>
            ) : errorGps ? (
              <Text style={font.tiny}>{errorGps}</Text>
            ) : !gps ? (
              <Text style={font.tiny}>Buscando tu ubicación…</Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.punto, { borderBottomWidth: 0 }]}>
          <View style={[styles.puntoIcono, { backgroundColor: colors.coralBg }]}>
            <MapPin color={colors.coral} size={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Etiqueta>Destino</Etiqueta>
            <Text style={[font.body, { fontFamily: fuente.fuerte, marginTop: 2 }]}>{destino.texto}</Text>
          </View>
        </View>
      </Card>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>¿A dónde vas?</Etiqueta>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DESTINOS.map((d) => (
          <Pill key={d.texto} label={d.texto} active={destino.texto === d.texto} onPress={() => setDestino(d)} />
        ))}
      </View>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Apoyo que necesito</Etiqueta>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {NECESIDADES.map((n) => (
          <Pill key={n.key} label={n.label} active={necesidades.includes(n.key)} onPress={() => toggle(n.key)} />
        ))}
      </View>

      {/*
        Las etiquetas de arriba nunca cubren todos los casos. Este campo libre
        es lo que el voluntario lee antes de aceptar, así que va con la
        solicitud y no en un mensaje posterior.
      */}
      <Etiqueta style={{ marginTop: 22, marginBottom: 8 }}>Cuéntanos qué necesitas</Etiqueta>
      <TextInput
        style={styles.comentario}
        value={comentario}
        onChangeText={setComentario}
        placeholder="Por ejemplo: voy con silla plegable y necesito ayuda para subirla al auto. El portón de mi edificio es el de Los Leones."
        placeholderTextColor={colors.ink3}
        multiline
        maxLength={MAX_COMENTARIO}
        accessibilityLabel="Comentario sobre lo que necesitas"
      />
      <Text style={[font.tiny, { marginTop: 6 }]}>
        Opcional. Lo lee el voluntario antes de aceptar. {comentario.length}/{MAX_COMENTARIO}
      </Text>

      <View style={{ height: 28 }} />
      <PrimaryButton
        title={busy ? "Buscando voluntario…" : "Buscar voluntario"}
        icon={<Send color={colors.white} size={18} />}
        disabled={busy}
        onPress={solicitar}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  punto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  puntoIcono: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  comentario: {
    minHeight: 104,
    textAlignVertical: "top",
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
  },
});
