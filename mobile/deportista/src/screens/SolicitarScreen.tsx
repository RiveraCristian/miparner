import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapPin, Send } from "lucide-react-native";
import { colors } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Card, Pill, PrimaryButton, Screen } from "../../../shared/ui";
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <MapPin color={colors.brand} size={18} />
          </View>
          <View>
            <Text style={{ fontSize: 11.5, color: colors.ink3 }}>Origen</Text>
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors.ink }}>{ORIGEN.texto}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11, padding: 13 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" }}>
            <MapPin color={colors.danger} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11.5, color: colors.ink3 }}>Destino</Text>
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors.ink }}>{destino.texto}</Text>
          </View>
        </View>
      </Card>

      <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.ink2, marginTop: 16, marginBottom: 8 }}>¿A dónde vas?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DESTINOS.map((d) => (
          <Pill key={d.texto} label={d.texto} active={destino.texto === d.texto} onPress={() => setDestino(d)} />
        ))}
      </View>

      <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.ink2, marginTop: 18, marginBottom: 8 }}>Apoyo que necesito</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {NECESIDADES.map((n) => (
          <Pill key={n.key} label={n.label} active={necesidades.includes(n.key)} onPress={() => toggle(n.key)} />
        ))}
      </View>

      <View style={{ height: 24 }} />
      <PrimaryButton title={busy ? "Buscando voluntario…" : "Buscar voluntario"} icon={<Send color="#fff" size={17} />} disabled={busy} onPress={solicitar} />
    </Screen>
  );
}
