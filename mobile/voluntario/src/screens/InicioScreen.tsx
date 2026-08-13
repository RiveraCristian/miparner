import { useCallback, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapPin } from "lucide-react-native";
import { colors } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import { Card, MapPlaceholder, PrimaryButton, Screen, StatCard } from "../../../shared/ui";
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
      <Text style={{ fontSize: 13, color: colors.ink3 }}>Voluntario</Text>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, marginBottom: 16 }}>{user?.nombre}</Text>

      <Card style={{ backgroundColor: enLinea ? colors.successSoft : colors.surface, borderColor: enLinea ? colors.successSoft : colors.line, flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: enLinea ? colors.success : colors.ink }}>{enLinea ? "Estás en línea" : "Fuera de línea"}</Text>
          <Text style={{ fontSize: 12.5, color: colors.ink2 }}>{enLinea ? "Recibiendo solicitudes cercanas" : "Actívate para recibir solicitudes"}</Text>
        </View>
        <Switch value={enLinea} onValueChange={toggle} trackColor={{ true: colors.success, false: colors.line }} />
      </Card>

      <View style={{ flexDirection: "row", gap: 9, marginTop: 12 }}>
        <StatCard value={String(nCercanas)} label="Solicitudes cerca" />
        <StatCard value={"0"} label="Viajes hoy" />
        <StatCard value={"—"} label="Puntos hoy" />
      </View>

      <MapPlaceholder height={190} >
        <View style={{ position: "absolute", left: "48%", top: "48%", width: 16, height: 16, borderRadius: 8, backgroundColor: colors.gold, borderWidth: 3, borderColor: "#fff" }} />
      </MapPlaceholder>

      <View style={{ height: 14 }} />
      <PrimaryButton
        title={enLinea ? `Ver solicitudes (${nCercanas})` : "Actívate para ver solicitudes"}
        icon={<MapPin color="#fff" size={17} />}
        disabled={!enLinea}
        onPress={() => nav.navigate("Solicitudes")}
      />
    </Screen>
  );
}
