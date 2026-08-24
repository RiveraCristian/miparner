import { useCallback, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapPin } from "lucide-react-native";
import { colors, font } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import { AvisoValidacion } from "../../../shared/Documentos";
import { Mapa } from "../../../shared/Mapa";
import { usePublicarUbicacionVoluntario } from "../../../shared/ubicacion";
import { Card, Estado, Etiqueta, PrimaryButton, Screen, StatCard } from "../../../shared/ui";
import type { SolicitudCercana } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

export function InicioScreen() {
  const { user, aprobado } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [enLinea, setEnLinea] = useState(false);
  const [cercanas, setCercanas] = useState<SolicitudCercana[]>([]);

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
  useFocusEffect(useCallback(() => refrescar(), [refrescar]));

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

  return (
    <Screen>
      <Etiqueta>Voluntario</Etiqueta>
      <Text style={[font.h1, { marginTop: 4, marginBottom: 20 }]}>{user?.nombre}</Text>

      {/* Sin validación no se puede salir en línea: aquí se explica por qué. */}
      <AvisoValidacion onIr={() => nav.navigate("Documentos")} />

      {/* El estado en línea lleva insignia con icono, no solo un color de fondo. */}
      <Card
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: enLinea ? colors.exitoBg : colors.surface,
          borderColor: enLinea ? "transparent" : colors.line,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Estado
            text={
              !aprobado
                ? "Cuenta por validar"
                : esperandoGps
                  ? "Buscando tu ubicación"
                  : enLinea
                    ? "Estás en línea"
                    : "Fuera de línea"
            }
            tipo={!aprobado || esperandoGps ? "atencion" : enLinea ? "exito" : "neutro"}
          />
          <Text style={font.muted}>
            {!aprobado
              ? "Podrás ponerte en línea cuando el equipo valide tus documentos."
              : errorGps
                ? errorGps
                : esperandoGps
                  ? "En cuanto el GPS te ubique empezarás a recibir solicitudes de tu zona."
                  : enLinea
                    ? "Recibiendo solicitudes cercanas a donde estás."
                    : "Actívate para recibir solicitudes."}
          </Text>
        </View>
        {/* thumbColor explícito: sin él Android pinta el pulgar con su color de
            acento (verde azulado), fuera de la paleta. */}
        <Switch
          value={enLinea}
          onValueChange={toggle}
          disabled={!aprobado}
          trackColor={{ true: colors.exito, false: colors.line }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.line}
          accessibilityLabel="Disponibilidad para recibir solicitudes"
        />
      </Card>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <StatCard value={String(nCercanas)} label="Solicitudes cerca" />
        <StatCard value="0" label="Acompañados hoy" />
        <StatCard value="—" label="Puntos hoy" />
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
