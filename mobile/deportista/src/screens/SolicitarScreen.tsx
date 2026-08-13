import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapPin, Send } from "lucide-react-native";
import { colors, font } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Card, Etiqueta, Pill, PrimaryButton, Screen } from "../../../shared/ui";
import type { Viaje } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

// Origen demo (con GPS real se toma la ubicación del dispositivo).
const ORIGEN = { lat: -33.4265, lng: -70.61, texto: "Casa · Av. Los Leones 220" };

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

export function SolicitarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [destino, setDestino] = useState(DESTINOS[0]);
  const [necesidades, setNecesidades] = useState<string[]>(["silla_ruedas"]);
  const [busy, setBusy] = useState(false);

  const toggle = (k: string) => setNecesidades((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  async function solicitar() {
    setBusy(true);
    try {
      const viaje = await api<Viaje>("/viajes", {
        method: "POST",
        body: {
          origen: { lat: ORIGEN.lat, lng: ORIGEN.lng },
          destino: { lat: destino.lat, lng: destino.lng },
          origenTexto: ORIGEN.texto,
          destinoTexto: destino.texto,
          necesidades,
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
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {/* Origen en índigo, destino en coral: dos formas distintas, no dos matices. */}
        <View style={styles.punto}>
          <View style={[styles.puntoIcono, { backgroundColor: colors.lavanda }]}>
            <MapPin color={colors.indigo} size={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Etiqueta>Origen</Etiqueta>
            <Text style={[font.body, { fontWeight: "600", marginTop: 2 }]}>{ORIGEN.texto}</Text>
          </View>
        </View>
        <View style={[styles.punto, { borderBottomWidth: 0 }]}>
          <View style={[styles.puntoIcono, { backgroundColor: colors.coralBg }]}>
            <MapPin color={colors.coral} size={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Etiqueta>Destino</Etiqueta>
            <Text style={[font.body, { fontWeight: "600", marginTop: 2 }]}>{destino.texto}</Text>
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
});
