import { useCallback, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CheckCircle2,
  CircleAlert,
  CircleDot,
  HandHeart,
  MapPin,
  MinusCircle,
  Navigation,
  Radar,
  Sparkles,
} from "lucide-react-native";
import { colors, font, fuente } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Logo } from "../../../shared/brand/Logo";
import { useAuth } from "../../../shared/auth";
import { AvisoValidacion } from "../../../shared/Documentos";
import { FondoConstelacion } from "../../../shared/FondoConstelacion";
import { Mapa } from "../../../shared/Mapa";
import { usePublicarUbicacionVoluntario } from "../../../shared/ubicacion";
import { CardLavanda, Estado, PanelIndigo, PrimaryButton, Screen, StatCard } from "../../../shared/ui";
import type { SolicitudCercana } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

interface ViajeItem {
  viajeId: number;
  viajeEstado: string;
  viajeDestinoTexto: string | null;
  viajeFinAt: string | null;
}

/** Estados en los que el voluntario tiene un acompañamiento activo al que volver. */
const ACTIVOS_VOL = ["asignado", "en_camino", "a_bordo"];

/** ¿La fecha ISO cae en el día de hoy? */
function esHoy(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function InicioScreen() {
  const { user, aprobado } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [enLinea, setEnLinea] = useState(false);
  const [cercanas, setCercanas] = useState<SolicitudCercana[]>([]);
  const [activo, setActivo] = useState<ViajeItem | null>(null);
  const [acompanadosHoy, setAcompanadosHoy] = useState(0);
  const [puntos, setPuntos] = useState<number | null>(null);

  /*
   * Mientras está en línea, el teléfono publica su posición real: es la que
   * usa el matchmaking (`ST_DWithin` sobre `voluntario_ubicacion`) para decidir
   * qué solicitudes le ofrece. Va espaciada —50 m de filtro, un envío por
   * minuto como mucho— porque esto corre durante horas.
   */
  const { punto: miUbicacion, error: errorGps } = usePublicarUbicacionVoluntario(
    enLinea && aprobado,
  );

  const refrescar = useCallback(() => {
    if (!aprobado) return;
    api<SolicitudCercana[]>("/voluntarios/me/solicitudes?radio=8000")
      .then(setCercanas)
      .catch(() => {});
  }, [aprobado]);
  useFocusEffect(
    useCallback(() => {
      refrescar();
      api<ViajeItem[]>("/viajes")
        .then((vs) => {
          // Acompañamiento en curso al que volver (aunque haya cerrado la pantalla).
          setActivo(vs.find((v) => ACTIVOS_VOL.includes(v.viajeEstado)) ?? null);
          // Acompañamientos finalizados hoy.
          setAcompanadosHoy(vs.filter((v) => v.viajeEstado === "finalizado" && esHoy(v.viajeFinAt)).length);
        })
        .catch(() => {});
      // Puntos reales de gamificación (total acumulado).
      api<{ puntos: number }>("/gamificacion/mi-progreso")
        .then((p) => setPuntos(p.puntos))
        .catch(() => {});
    }, [refrescar]),
  );

  async function toggle(v: boolean) {
    setEnLinea(v);
    try {
      await api("/voluntarios/me/estado", { method: "PATCH", body: { enLinea: v } });
      // La ubicación la publica el hook en cuanto llega la primera lectura.
      if (v) refrescar();
    } catch {
      setEnLinea(!v);
    }
  }

  const nCercanas = cercanas.length;
  const esperandoGps = enLinea && aprobado && !miUbicacion && !errorGps;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";

  // Disponibilidad: icono + título + detalle (el color nunca informa por sí solo).
  const estado = !aprobado
    ? { Icono: CircleAlert, titulo: "Cuenta por validar", detalle: "Podrás ponerte en línea cuando el equipo valide tus documentos." }
    : errorGps
      ? { Icono: CircleAlert, titulo: "Sin ubicación", detalle: errorGps }
      : esperandoGps
        ? { Icono: CircleDot, titulo: "Buscando tu ubicación", detalle: "En cuanto el GPS te ubique empezarás a recibir solicitudes de tu zona." }
        : enLinea
          ? { Icono: CheckCircle2, titulo: "Estás en línea", detalle: "Recibiendo solicitudes cercanas a donde estás." }
          : { Icono: MinusCircle, titulo: "Fuera de línea", detalle: "Actívate para recibir solicitudes." };
  const EstadoIcono = estado.Icono;

  return (
    <Screen>
      {/* Hero de marca: saludo + disponibilidad en un panel índigo con profundidad. */}
      <PanelIndigo style={{ marginBottom: 16, overflow: "hidden" }}>
        <FondoConstelacion />
        {/* El logotipo estaba solo en el acceso: dentro de la app nada
            recordaba dónde estabas. Sobre índigo va en blanco. */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <Logo alto={22} version="blanco" alt="Miparner" />
        </View>
        <Text style={{ color: colors.lav300, fontSize: 12, fontFamily: fuente.medio, letterSpacing: 1.6, textTransform: "uppercase", textAlign: "center" }}>
          {saludo}
        </Text>
        <Text style={{ color: colors.white, fontSize: 26, fontFamily: fuente.fuerte, letterSpacing: -0.4, marginTop: 6, textAlign: "center" }}>
          {user?.nombre}
        </Text>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 16 }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <EstadoIcono size={16} color={colors.white} />
              <Text style={{ color: colors.white, fontFamily: fuente.fuerte, fontSize: 16 }}>{estado.titulo}</Text>
            </View>
            <Text style={{ color: colors.lav200, fontSize: 14, lineHeight: 20 }}>{estado.detalle}</Text>
          </View>
          {/* thumbColor explícito: sin él Android pinta el pulgar con su verde azulado. */}
          <Switch
            value={enLinea}
            onValueChange={toggle}
            disabled={!aprobado}
            trackColor={{ true: colors.exito, false: "rgba(255,255,255,0.25)" }}
            thumbColor={colors.white}
            ios_backgroundColor="rgba(255,255,255,0.25)"
            accessibilityLabel="Disponibilidad para recibir solicitudes"
          />
        </View>
      </PanelIndigo>

      {/* Sin validación no se puede salir en línea: aquí se explica por qué. */}
      <AvisoValidacion onIr={() => nav.navigate("Documentos")} />

      {/* Acompañamiento en curso: permite volver al seguimiento sin pasar por Solicitudes. */}
      {activo && (
        <CardLavanda style={{ marginTop: 14 }}>
          <Estado text="Acompañamiento en curso" tipo="indigo" />
          <Text style={[font.h3, { marginTop: 10 }]} numberOfLines={1}>
            {activo.viajeDestinoTexto ?? "Destino"}
          </Text>
          <Text style={[font.muted, { marginBottom: 14 }]}>{activo.viajeEstado.replace(/_/g, " ")}</Text>
          <PrimaryButton
            title="Volver al seguimiento"
            icon={<Navigation color={colors.white} size={18} />}
            onPress={() => nav.navigate("ViajeActivo", { viajeId: activo.viajeId })}
          />
        </CardLavanda>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <StatCard value={String(nCercanas)} label="Solicitudes cerca" icon={Radar} />
        <StatCard
          value={String(acompanadosHoy)}
          label="Acompañados hoy"
          icon={HandHeart}
          onPress={() => nav.navigate("Historial")}
        />
        <StatCard value={puntos === null ? "—" : String(puntos)} label="Puntos" icon={Sparkles} />
      </View>

      <View style={{ height: 16 }} />
      {/* Dónde estás y dónde está la solicitud más cercana. */}
      <Mapa
        alto={200}
        origen={miUbicacion}
        destino={cercanas[0] ? { lat: cercanas[0].origen_lat, lng: cercanas[0].origen_lng } : null}
        miUbicacion={enLinea}
        descripcion={
          nCercanas > 0
            ? `${nCercanas} ${nCercanas === 1 ? "solicitud abierta" : "solicitudes abiertas"} en tu zona. La lista completa está en Solicitudes.`
            : enLinea
              ? "Tu zona de cobertura. Ahora mismo no hay solicitudes cerca."
              : "Actívate para ver las solicitudes de tu zona."
        }
      />

      <View style={{ height: 18 }} />
      <PrimaryButton
        title={
          !aprobado
            ? "Disponible al validar tu cuenta"
            : enLinea
              ? `Ver solicitudes (${nCercanas})`
              : "Actívate para ver solicitudes"
        }
        icon={<MapPin color={colors.white} size={18} />}
        disabled={!enLinea || !aprobado}
        onPress={() => nav.navigate("Solicitudes")}
      />
    </Screen>
  );
}
