import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Navigation } from "lucide-react-native";
import { colors } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { connectSocket, joinRide, leaveRide, emitPosition } from "../../../shared/socket";
import { Card, MapPlaceholder, PrimaryButton, Screen } from "../../../shared/ui";
import type { Viaje } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

const PASOS = [
  { key: "en_camino", label: "Voy en camino", siguiente: "en_camino" },
  { key: "a_bordo", label: "Deportista a bordo", siguiente: "a_bordo" },
  { key: "finalizado", label: "Confirmar llegada", siguiente: "finalizado" },
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
        <View style={{ position: "absolute", left: "18%", top: "82%", width: 16, height: 16, borderRadius: 8, backgroundColor: colors.gold, borderWidth: 3, borderColor: "#fff" }} />
        <View style={{ position: "absolute", left: "60%", top: "12%", width: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 3, borderColor: "#fff" }} />
      </MapPlaceholder>

      <Card style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Navigation color={colors.brand} size={26} />
        <View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{viaje?.destino.texto ?? "Destino"}</Text>
          <Text style={{ fontSize: 12.5, color: colors.ink2 }}>Sigue la ruta hasta el destino</Text>
        </View>
      </Card>

      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink2, marginTop: 18, marginBottom: 10 }}>Hitos del viaje</Text>
      <Card style={{ paddingVertical: 6 }}>
        {[{ k: "asignado", l: "Solicitud aceptada" }, { k: "en_camino", l: "En camino" }, { k: "a_bordo", l: "A bordo" }, { k: "finalizado", l: "Finalizado" }].map((p, i) => {
          const order = ["asignado", "en_camino", "a_bordo", "finalizado"];
          const cur = order.indexOf(estado);
          const done = i < cur, now = i === cur;
          return (
            <View key={p.k} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 12, backgroundColor: done ? colors.success : now ? colors.brand : colors.line }} />
              <Text style={{ fontSize: 14, color: now ? colors.ink : colors.ink2, fontWeight: now ? "700" : "400" }}>{p.l}</Text>
            </View>
          );
        })}
      </Card>

      <View style={{ height: 16 }} />
      {siguiente && <PrimaryButton title={busy ? "Actualizando…" : siguiente.label} disabled={busy} onPress={avanzar} />}
    </Screen>
  );
}
