import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Socket } from "socket.io-client";
import {
  Circle,
  CircleDot,
  CheckCircle2,
  LocateFixed,
  MessageSquare,
  ShieldAlert,
  Share2,
  X,
} from "lucide-react-native";
import { colors, font, fuente } from "../../../../shared/theme";
import { api } from "../../../../shared/api";
import { connectSocket, joinRide, leaveRide, emitPanic } from "../../../../shared/socket";
import { Mapa } from "../../../../shared/Mapa";
import { distanciaM, useCompartirPosicion, usePosicionDe } from "../../../../shared/ubicacion";
import {
  Card,
  DangerButton,
  Estado,
  Etiqueta,
  GhostButton,
  Loading,
  Screen,
} from "../../../../shared/ui";
import type { Mensaje, Viaje } from "../../../../shared/types";
import type { RootStackParams } from "../../navigation";

const ORDEN = ["solicitado", "asignado", "en_camino", "a_bordo", "finalizado"];
const ETIQUETAS: Record<string, string> = {
  solicitado: "Buscando voluntario",
  asignado: "Voluntario asignado",
  en_camino: "En camino",
  a_bordo: "A bordo",
  finalizado: "Finalizado",
};

/** Estados en los que el acompañamiento sigue vivo y el GPS tiene sentido. */
const EN_CURSO = ["solicitado", "asignado", "en_camino", "a_bordo"];

const metros = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

export function EnViajeScreen() {
  const route = useRoute<RouteProp<RootStackParams, "EnViaje">>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { viajeId } = route.params;
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [estado, setEstado] = useState("solicitado");
  const [sinLeer, setSinLeer] = useState(0);

  const enCurso = EN_CURSO.includes(estado);

  // Mi posición real: se comparte con el voluntario y alimenta el pánico.
  const { punto: yo, error: errorGps } = useCompartirPosicion(viajeId, { activo: enCurso });
  // La del voluntario, tal como la va reportando su teléfono.
  const { punto: voluntario, traza } = usePosicionDe(viajeId, viaje?.voluntarioId);

  useEffect(() => {
    let socket: Socket | undefined;

    const onStatus = (d: { rideId: number; estado: string }) => {
      if (d.rideId !== viajeId) return;
      setEstado(d.estado);
      // Al asignarse un voluntario aparece su usuarioId, y solo entonces se
      // puede empezar a seguir su posición: hay que releer el viaje.
      api<Viaje>(`/viajes/${viajeId}`).then(setViaje).catch(() => {});
    };
    const onMensaje = (m: Mensaje) => {
      if (m.mensajeViajeId === viajeId) setSinLeer((n) => n + 1);
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
      socket.on("mensaje_nuevo", onMensaje);
    })();

    return () => {
      leaveRide(viajeId);
      socket?.off("trip_status_change", onStatus);
      socket?.off("mensaje_nuevo", onMensaje);
    };
  }, [viajeId]);

  async function panico() {
    // Con GPS se envía dónde estás ahora, no dónde pediste el acompañamiento.
    const lat = yo?.lat ?? viaje?.origen.lat;
    const lng = yo?.lng ?? viaje?.origen.lng;
    emitPanic(viajeId, lat, lng);
    try {
      await api("/seguridad/panico", { method: "POST", body: { rideId: viajeId, lat, lng } });
    } catch {
      // el pánico es best-effort: la emisión por socket ya salió
    }
    Alert.alert(
      "Alerta enviada",
      yo
        ? "El equipo y tus contactos fueron notificados con tu ubicación actual."
        : "El equipo fue notificado. Todavía no tenemos tu ubicación exacta: mantén la app abierta.",
    );
  }

  async function cancelar() {
    try {
      await api(`/viajes/${viajeId}/estado`, { method: "PATCH", body: { estado: "cancelado" } });
    } catch {
      /* noop */
    }
    nav.navigate("Tabs");
  }

  function abrirChat() {
    setSinLeer(0);
    nav.navigate("Chat", { viajeId });
  }

  if (!viaje) return <Screen><Loading /></Screen>;

  const idx = ORDEN.indexOf(estado);
  const finalizado = estado === "finalizado";
  const cancelado = estado === "cancelado";
  const hayVoluntario = viaje.voluntarioId !== null || idx >= 1;
  const distancia = yo && voluntario ? distanciaM(yo, voluntario) : null;

  return (
    <Screen>
      <Mapa
        alto={210}
        origen={viaje.origen}
        destino={viaje.destino}
        movil={voluntario}
        ruta={traza}
        miUbicacion={enCurso}
        descripcion={
          `De ${viaje.origen.texto ?? "tu origen"} a ${viaje.destino.texto ?? "tu destino"}.` +
          (distancia !== null
            ? ` Tu voluntario está a ${metros(distancia)} de ti.`
            : voluntario
              ? " El punto verde es tu voluntario."
              : "")
        }
      />

      {/* Distancia en vivo: el dato del mapa, también en texto. */}
      {distancia !== null && !finalizado && !cancelado ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
          <LocateFixed size={18} color={colors.exito} />
          <Text style={[font.body, { fontFamily: fuente.fuerte }]}>
            Tu voluntario está a {metros(distancia)}
          </Text>
        </View>
      ) : null}

      {errorGps ? (
        <Text style={[font.tiny, { marginTop: 10, color: colors.ink2 }]} accessibilityRole="alert">
          {errorGps}
        </Text>
      ) : null}

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

      {/* Lo que pediste con tus palabras, para que quede a la vista de ambos. */}
      {viaje.comentario ? (
        <Card style={{ marginTop: 12 }}>
          <Etiqueta>Lo que pediste</Etiqueta>
          <Text style={[font.body, { marginTop: 6 }]}>{viaje.comentario}</Text>
        </Card>
      ) : null}

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Estado del acompañamiento</Etiqueta>
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
                  { color: ahora || hecho ? colors.ink : colors.ink2, fontFamily: ahora ? fuente.fuerte : fuente.normal },
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
          {/* Hablar con el voluntario: disponible en cuanto hay alguien asignado. */}
          <GhostButton
            title={
              !hayVoluntario
                ? "Chat disponible al asignarse un voluntario"
                : sinLeer > 0
                  ? `Mensajes (${sinLeer} sin leer)`
                  : "Escribir a mi voluntario"
            }
            icon={<MessageSquare color={colors.indigo} size={18} />}
            disabled={!hayVoluntario}
            onPress={abrirChat}
          />
          <View style={{ height: 12 }} />
          {/* El coral es la forma: borde e icono. El texto va en tinta. */}
          <DangerButton title="Botón de pánico" icon={<ShieldAlert color={colors.coral} size={19} />} onPress={panico} />
          <View style={{ height: 12 }} />
          <GhostButton
            title="Compartir acompañamiento"
            icon={<Share2 color={colors.indigo} size={18} />}
            onPress={() => Alert.alert("Compartir", "Enlace de seguimiento copiado.")}
          />
          <View style={{ height: 12 }} />
          <GhostButton title="Cancelar acompañamiento" icon={<X color={colors.indigo} size={18} />} onPress={cancelar} />
        </>
      )}
      {(finalizado || cancelado) && <GhostButton title="Volver al inicio" onPress={() => nav.navigate("Tabs")} />}
    </Screen>
  );
}
