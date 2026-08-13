import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Socket } from "socket.io-client";
import { Circle, CircleDot, CheckCircle2, ShieldAlert, Share2, X } from "lucide-react-native";
import { colors, font } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { connectSocket, joinRide, leaveRide, emitPanic } from "../../../shared/socket";
import {
  Card,
  DangerButton,
  Estado,
  Etiqueta,
  GhostButton,
  Loading,
  MapPlaceholder,
  PuntoMapa,
  Screen,
} from "../../../shared/ui";
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
        <PuntoMapa left="20%" top="78%" color={colors.indigo} />
        <PuntoMapa left="62%" top="16%" color={colors.coral} size={18} />
      </MapPlaceholder>

      <View style={{ alignItems: "center", marginTop: 16 }}>
        <Estado
          text={ETIQUETAS[estado] ?? estado}
          tipo={finalizado ? "exito" : cancelado ? "critico" : "indigo"}
        />
      </View>

      <Card style={{ marginTop: 16 }}>
        <Etiqueta>Destino</Etiqueta>
        <Text style={[font.h3, { marginTop: 4 }]}>{viaje.destino.texto ?? "Destino"}</Text>
      </Card>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Estado del viaje</Etiqueta>
      <Card style={{ paddingVertical: 8 }}>
        {ORDEN.map((k, i) => {
          const hecho = i < idx;
          const ahora = i === idx;
          return (
            <View key={k} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 9, gap: 12 }}>
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
                  { color: ahora || hecho ? colors.ink : colors.ink2, fontWeight: ahora ? "600" : "400" },
                ]}
              >
                {ETIQUETAS[k]}
              </Text>
              {ahora ? <Text style={font.tiny}>· ahora</Text> : null}
            </View>
          );
        })}
      </Card>

      <View style={{ height: 22 }} />
      {!finalizado && !cancelado && (
        <>
          {/* El coral es la forma: borde e icono. El texto va en tinta. */}
          <DangerButton title="Botón de pánico" icon={<ShieldAlert color={colors.coral} size={19} />} onPress={panico} />
          <View style={{ height: 12 }} />
          <GhostButton title="Compartir viaje" icon={<Share2 color={colors.indigo} size={18} />} onPress={() => Alert.alert("Compartir", "Enlace de seguimiento copiado.")} />
          <View style={{ height: 12 }} />
          <GhostButton title="Cancelar viaje" icon={<X color={colors.indigo} size={18} />} onPress={cancelar} />
        </>
      )}
      {(finalizado || cancelado) && <GhostButton title="Volver al inicio" onPress={() => nav.navigate("Tabs")} />}
    </Screen>
  );
}
