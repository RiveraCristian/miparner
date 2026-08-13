import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Socket } from "socket.io-client";
import { ShieldAlert, Share2, X } from "lucide-react-native";
import { colors } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { connectSocket, joinRide, leaveRide, emitPanic } from "../../../shared/socket";
import { Badge, Card, DangerButton, GhostButton, Loading, MapPlaceholder, Screen } from "../../../shared/ui";
import type { Viaje } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

const ORDEN = ["solicitado", "asignado", "en_camino", "a_bordo", "finalizado"];
const ETIQUETAS: Record<string, string> = {
  solicitado: "Buscando voluntario",
  asignado: "Voluntario asignado",
  en_camino: "En camino",
  a_bordo: "A bordo",
  finalizado: "Finalizado",
};

export function EnViajeScreen() {
  const route = useRoute<RouteProp<RootStackParams, "EnViaje">>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { viajeId } = route.params;
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [estado, setEstado] = useState("solicitado");

  useEffect(() => {
    let socket: Socket | undefined;
    const onStatus = (d: { rideId: number; estado: string }) => {
      if (d.rideId === viajeId) setEstado(d.estado);
    };

    api<Viaje>(`/viajes/${viajeId}`)
      .then((v) => {
        setViaje(v);
        setEstado(v.estado);
      })
      .catch(() => {});

    (async () => {
      socket = await connectSocket();
      joinRide(viajeId);
      socket.on("trip_status_change", onStatus);
    })();

    return () => {
      leaveRide(viajeId);
      socket?.off("trip_status_change", onStatus);
    };
  }, [viajeId]);

  async function panico() {
    emitPanic(viajeId, viaje?.origen.lat, viaje?.origen.lng);
    try {
      await api("/seguridad/panico", { method: "POST", body: { rideId: viajeId, lat: viaje?.origen.lat, lng: viaje?.origen.lng } });
    } catch {
      // el pánico es best-effort: la emisión por socket ya salió
    }
    Alert.alert("Alerta enviada", "El equipo y tus contactos fueron notificados con tu ubicación.");
  }

  async function cancelar() {
    try {
      await api(`/viajes/${viajeId}/estado`, { method: "PATCH", body: { estado: "cancelado" } });
    } catch {
      /* noop */
    }
    nav.navigate("Tabs");
  }

  if (!viaje) return <Screen><Loading /></Screen>;

  const idx = ORDEN.indexOf(estado);
  const finalizado = estado === "finalizado";
  const cancelado = estado === "cancelado";

  return (
    <Screen>
      <MapPlaceholder height={200}>
        <View style={{ position: "absolute", left: "20%", top: "78%", width: 16, height: 16, borderRadius: 8, backgroundColor: colors.brand, borderWidth: 3, borderColor: "#fff" }} />
        <View style={{ position: "absolute", left: "62%", top: "16%", width: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 3, borderColor: "#fff" }} />
      </MapPlaceholder>

      <View style={{ alignItems: "center", marginTop: 14 }}>
        <Badge text={ETIQUETAS[estado] ?? estado} tone={finalizado ? "success" : cancelado ? "danger" : "brand"} />
      </View>

      <Card style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 12, color: colors.ink3 }}>Destino</Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{viaje.destino.texto ?? "Destino"}</Text>
      </Card>

      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink2, marginTop: 18, marginBottom: 10 }}>Estado del viaje</Text>
      <Card style={{ paddingVertical: 6 }}>
        {ORDEN.map((k, i) => {
          const done = i < idx;
          const now = i === idx;
          return (
            <View key={k} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 12, backgroundColor: done ? colors.success : now ? colors.brand : colors.line }} />
              <Text style={{ fontSize: 14, color: now ? colors.ink : colors.ink2, fontWeight: now ? "700" : "400" }}>{ETIQUETAS[k]}</Text>
            </View>
          );
        })}
      </Card>

      <View style={{ height: 18 }} />
      {!finalizado && !cancelado && (
        <>
          <DangerButton title="Botón de pánico" icon={<ShieldAlert color="#fff" size={18} />} onPress={panico} />
          <View style={{ height: 10 }} />
          <GhostButton title="Compartir viaje" icon={<Share2 color={colors.ink} size={17} />} onPress={() => Alert.alert("Compartir", "Enlace de seguimiento copiado.")} />
          <View style={{ height: 10 }} />
          <GhostButton title="Cancelar viaje" icon={<X color={colors.ink} size={17} />} onPress={cancelar} />
        </>
      )}
      {(finalizado || cancelado) && <GhostButton title="Volver al inicio" onPress={() => nav.navigate("Tabs")} />}
    </Screen>
  );
}
