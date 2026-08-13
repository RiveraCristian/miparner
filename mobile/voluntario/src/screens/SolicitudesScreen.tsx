import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapPin } from "lucide-react-native";
import { colors } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Badge, Card, Loading, PrimaryButton, Screen } from "../../../shared/ui";
import type { SolicitudCercana } from "../../../shared/types";
import type { RootStackParams } from "../navigation";

export function SolicitudesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [items, setItems] = useState<SolicitudCercana[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const cargar = useCallback(() => {
    api<SolicitudCercana[]>("/voluntarios/me/solicitudes?radio=8000").then(setItems).catch(() => setItems([]));
  }, []);
  useFocusEffect(useCallback(() => cargar(), [cargar]));

  async function aceptar(id: number) {
    setBusy(id);
    try { await api(`/viajes/${id}/aceptar`, { method: "POST" }); nav.replace("ViajeActivo", { viajeId: id }); }
    catch (e) { Alert.alert("No se pudo aceptar", e instanceof Error ? e.message : ""); }
    finally { setBusy(null); }
  }

  if (!items) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      {items.length === 0 && <Text style={{ color: colors.ink3, textAlign: "center", marginTop: 40 }}>No hay solicitudes cercanas por ahora.</Text>}
      {items.map((s) => (
        <Card key={s.viaje_id} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>{s.deportista_nombre.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 11 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{s.deportista_nombre}</Text>
              <Text style={{ fontSize: 12.5, color: colors.ink2 }}>a {Math.round(s.distancia_m)} m de ti</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {(s.viaje_necesidades ?? []).map((n) => <Badge key={n} text={n} tone="brand" />)}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
            <MapPin color={colors.ink3} size={15} />
            <Text style={{ fontSize: 13, color: colors.ink2, flex: 1 }} numberOfLines={1}>
              {s.viaje_origen_texto ?? "Origen"} → {s.viaje_destino_texto ?? "Destino"}
            </Text>
          </View>

          <View style={{ height: 12 }} />
          <PrimaryButton title={busy === s.viaje_id ? "Aceptando…" : "Aceptar viaje"} disabled={busy === s.viaje_id} onPress={() => aceptar(s.viaje_id)} />
        </Card>
      ))}
    </Screen>
  );
}
