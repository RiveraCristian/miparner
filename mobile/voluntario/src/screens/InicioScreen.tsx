import { useCallback, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapPin } from "lucide-react-native";
import { colors, font } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import {
  Card,
  Estado,
  Etiqueta,
  MapPlaceholder,
  PrimaryButton,
  PuntoMapa,
  Screen,
  StatCard,
} from "../../../shared/ui";
import type { SolicitudCercana } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

// Ubicación demo del voluntario (Providencia). Con GPS real se envía la posición del dispositivo.
const UBIC = { lat: -33.4265, lng: -70.61 };

export function InicioScreen() {
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [enLinea, setEnLinea] = useState(false);
  const [nCercanas, setNCercanas] = useState(0);

  const refrescar = useCallback(() => {
    api<SolicitudCercana[]>("/voluntarios/me/solicitudes?radio=8000").then((s) => setNCercanas(s.length)).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => refrescar(), [refrescar]));

  async function toggle(v: boolean) {
    setEnLinea(v);
    try {
      await api("/voluntarios/me/estado", { method: "PATCH", body: { enLinea: v } });
      if (v) { await api("/voluntarios/me/ubicacion", { method: "PUT", body: UBIC }); refrescar(); }
    } catch { setEnLinea(!v); }
  }

  return (
    <Screen>
      <Etiqueta>Voluntario</Etiqueta>
      <Text style={[font.h1, { marginTop: 4, marginBottom: 20 }]}>{user?.nombre}</Text>

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
            text={enLinea ? "Estás en línea" : "Fuera de línea"}
            tipo={enLinea ? "exito" : "neutro"}
          />
          <Text style={font.muted}>
            {enLinea ? "Recibiendo solicitudes cercanas." : "Actívate para recibir solicitudes."}
          </Text>
        </View>
        <Switch
          value={enLinea}
          onValueChange={toggle}
          trackColor={{ true: colors.exito, false: colors.line }}
          accessibilityLabel="Disponibilidad para recibir solicitudes"
        />
      </Card>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <StatCard value={String(nCercanas)} label="Solicitudes cerca" />
        <StatCard value="0" label="Viajes hoy" />
        <StatCard value="—" label="Puntos hoy" />
      </View>

      <View style={{ height: 16 }} />
      <MapPlaceholder height={190}>
        <PuntoMapa left="48%" top="48%" color={colors.coral} />
      </MapPlaceholder>

      <View style={{ height: 18 }} />
      <PrimaryButton
        title={enLinea ? `Ver solicitudes (${nCercanas})` : "Actívate para ver solicitudes"}
        icon={<MapPin color={colors.white} size={18} />}
        disabled={!enLinea}
        onPress={() => nav.navigate("Solicitudes")}
      />
    </Screen>
  );
}
