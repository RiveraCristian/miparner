import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Socket } from "socket.io-client";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  LocateFixed,
  MessageSquare,
  Navigation,
} from "lucide-react-native";
import { colors, font, fuente } from "../../../../shared/theme";
import { api } from "../../../../shared/api";
import { connectSocket, joinRide, leaveRide } from "../../../../shared/socket";
import { Mapa } from "../../../../shared/Mapa";
import { distanciaM, useCompartirPosicion, usePosicionDe } from "../../../../shared/ubicacion";
import { Card, Etiqueta, GhostButton, PrimaryButton, Screen } from "../../../../shared/ui";
import type { LatLng, Mensaje, Viaje } from "../../../../shared/types";
import type { RootStackParams } from "../../navigation";

const PASOS = [
  { key: "en_camino", label: "Voy en camino" },
  { key: "a_bordo", label: "Deportista a bordo" },
  { key: "finalizado", label: "Confirmar llegada" },
];

/** Hitos del acompañamiento que ve el voluntario, en orden. */
const HITOS = [
  { k: "asignado", l: "Solicitud aceptada" },
  { k: "en_camino", l: "En camino" },
  { k: "a_bordo", l: "A bordo" },
  { k: "finalizado", l: "Finalizado" },
];

const EN_CURSO = ["asignado", "en_camino", "a_bordo"];

const metros = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

export function ViajeActivoScreen() {
  const route = useRoute<RouteProp<RootStackParams, "ViajeActivo">>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { viajeId } = route.params;
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [estado, setEstado] = useState("asignado");
  const [busy, setBusy] = useState(false);
  const [sinLeer, setSinLeer] = useState(0);

  const enCurso = EN_CURSO.includes(estado);

  /*
   * El voluntario es el que se mueve: su posición va con el filtro más fino y
   * se comparte en vivo, porque es la que el deportista está mirando.
   */
  const { punto: yo, error: errorGps } = useCompartirPosicion(viajeId, {
    activo: enCurso,
    desplazamientoMinimo: 10,
  });
  const { punto: deportista } = usePosicionDe(viajeId, viaje?.deportistaId);

  useEffect(() => {
    let socket: Socket | undefined;
    const onMensaje = (m: Mensaje) => {
      if (m.mensajeViajeId === viajeId) setSinLeer((n) => n + 1);
    };
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
      socket.on("mensaje_nuevo", onMensaje);
      socket.on("trip_status_change", onStatus);
    })();

    return () => {
      leaveRide(viajeId);
      socket?.off("mensaje_nuevo", onMensaje);
      socket?.off("trip_status_change", onStatus);
    };
  }, [viajeId]);

  const idxActual = PASOS.findIndex((p) => p.key === estado);
  const siguiente = PASOS[idxActual + 1] ?? (estado === "asignado" ? PASOS[0] : null);

  async function avanzar() {
    if (!siguiente) return;
    setBusy(true);
    try {
      await api(`/viajes/${viajeId}/estado`, { method: "PATCH", body: { estado: siguiente.key } });
      if (siguiente.key === "finalizado") {
        nav.navigate("Tabs");
        return;
      }
      setEstado(siguiente.key);
    } finally {
      setBusy(false);
    }
  }

  function abrirChat() {
    setSinLeer(0);
    nav.navigate("Chat", { viajeId });
  }

  /*
   * Antes de recoger importa cuánto falta para el origen; con la persona a
   * bordo, cuánto falta para el destino.
   */
  const objetivo: LatLng | null =
    estado === "a_bordo" ? viaje?.destino ?? null : deportista ?? viaje?.origen ?? null;
  const restante = yo && objetivo ? distanciaM(yo, objetivo) : null;

  return (
    <Screen>
      <Mapa
        alto={210}
        origen={viaje?.origen}
        destino={viaje?.destino}
        movil={deportista}
        miUbicacion={enCurso}
        descripcion={
          viaje
            ? `Recoges en ${viaje.origen.texto ?? "el punto de partida"} y dejas en ${viaje.destino.texto ?? "el destino"}.` +
              (restante !== null
                ? ` Te quedan ${metros(restante)} hasta ${estado === "a_bordo" ? "el destino" : "el punto de encuentro"}.`
                : "")
            : undefined
        }
      />

      {restante !== null ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
          <LocateFixed size={18} color={colors.exito} />
          <Text style={[font.body, { fontFamily: fuente.fuerte }]}>
            {metros(restante)} hasta {estado === "a_bordo" ? "el destino" : "el punto de encuentro"}
          </Text>
        </View>
      ) : null}

      {errorGps ? (
        <Text style={[font.tiny, { marginTop: 10, color: colors.ink2 }]} accessibilityRole="alert">
          {errorGps}
        </Text>
      ) : null}

      <Card style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={styles.iconoDestino}>
          <Navigation color={colors.indigo} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={font.h3} numberOfLines={2}>{viaje?.destino.texto ?? "Destino"}</Text>
          <Text style={font.muted}>Sigue la ruta hasta el destino</Text>
        </View>
      </Card>

      {/* Lo que el deportista escribió al pedir el acompañamiento. */}
      {viaje?.comentario ? (
        <Card style={{ marginTop: 12 }}>
          <Etiqueta>Lo que necesita</Etiqueta>
          <Text style={[font.body, { marginTop: 6 }]}>{viaje.comentario}</Text>
        </Card>
      ) : null}

      <View style={{ height: 16 }} />
      <GhostButton
        title={sinLeer > 0 ? `Mensajes (${sinLeer} sin leer)` : "Escribir al deportista"}
        icon={<MessageSquare color={colors.indigo} size={18} />}
        onPress={abrirChat}
      />

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
