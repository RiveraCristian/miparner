import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CheckCircle2, Circle, CircleDot, Navigation } from "lucide-react-native";
import { colors, font, fuente } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { connectSocket, joinRide, leaveRide, emitPosition } from "../../../shared/socket";
import { Card, Etiqueta, MapPlaceholder, PrimaryButton, PuntoMapa, Screen } from "../../../shared/ui";
import type { Viaje } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

const PASOS = [
  { key: "en_camino", label: "Voy en camino", siguiente: "en_camino" },
  { key: "a_bordo", label: "Deportista a bordo", siguiente: "a_bordo" },
  { key: "finalizado", label: "Confirmar llegada", siguiente: "finalizado" },
];

/** Hitos del acompañamiento que ve el voluntario, en orden. */
const HITOS = [
  { k: "asignado", l: "Solicitud aceptada" },
  { k: "en_camino", l: "En camino" },
  { k: "a_bordo", l: "A bordo" },
  { k: "finalizado", l: "Finalizado" },
];

export function ViajeActivoScreen() {
  const route = useRoute<RouteProp<RootStackParams, "ViajeActivo">>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { viajeId } = route.params;
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [estado, setEstado] = useState("asignado");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Viaje>(`/viajes/${viajeId}`).then((v) => { setViaje(v); setEstado(v.estado); }).catch(() => {});
    (async () => { await connectSocket(); joinRide(viajeId); emitPosition(viajeId, -33.4265, -70.61); })();
    return () => leaveRide(viajeId);
  }, [viajeId]);

  const idxActual = PASOS.findIndex((p) => p.key === estado);
  const siguiente = PASOS[idxActual + 1] ?? (estado === "asignado" ? PASOS[0] : null);

  async function avanzar() {
    if (!siguiente) return;
    setBusy(true);
    try {
      await api(`/viajes/${viajeId}/estado`, { method: "PATCH", body: { estado: siguiente.key, lat: -33.4489, lng: -70.6693 } });
      if (siguiente.key === "finalizado") { nav.navigate("Tabs"); return; }
      setEstado(siguiente.key);
    } finally { setBusy(false); }
  }

  return (
    <Screen>
      <MapPlaceholder height={210}>
        <PuntoMapa left="18%" top="82%" color={colors.indigo} />
        <PuntoMapa left="60%" top="12%" color={colors.coral} size={18} />
      </MapPlaceholder>

      <Card style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={styles.iconoDestino}>
          <Navigation color={colors.indigo} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={font.h3} numberOfLines={2}>{viaje?.destino.texto ?? "Destino"}</Text>
          <Text style={font.muted}>Sigue la ruta hasta el destino</Text>
        </View>
      </Card>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Hitos del acompañamiento</Etiqueta>
      <Card style={{ paddingVertical: 8 }}>
        {HITOS.map((p, i) => {
          const cur = HITOS.findIndex((h) => h.k === estado);
          const hecho = i < cur;
          const ahora = i === cur;
          return (
            <View key={p.k} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 9, gap: 12 }}>
              {/* Icono además del color: el hito no se comunica solo con el punto. */}
              {hecho ? (
                <CheckCircle2 size={20} color={colors.exito} />
              ) : ahora ? (
                <CircleDot size={20} color={colors.indigo} />
              ) : (
                <Circle size={20} color={colors.ink4} />
              )}
              <Text
                style={[
                  font.body,
                  { color: ahora || hecho ? colors.ink : colors.ink2, fontFamily: ahora ? fuente.fuerte : fuente.normal },
                ]}
              >
                {p.l}
              </Text>
              {ahora ? <Text style={font.tiny}>· ahora</Text> : null}
            </View>
          );
        })}
      </Card>

      <View style={{ height: 20 }} />
      {siguiente && <PrimaryButton title={busy ? "Actualizando…" : siguiente.label} disabled={busy} onPress={avanzar} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconoDestino: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
});
