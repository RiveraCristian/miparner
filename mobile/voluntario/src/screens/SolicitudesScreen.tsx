import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Inbox, MapPin } from "lucide-react-native";
import { colors, font, fuente } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Card, Estado, EsqueletoTarjeta, PrimaryButton, Screen, Vacio } from "../../../shared/ui";
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

  // Esqueletos con la forma de las tarjetas que van a llegar.
  if (!items)
    return (
      <Screen>
        <EsqueletoTarjeta />
        <EsqueletoTarjeta />
      </Screen>
    );

  return (
    <Screen>
      {items.length === 0 ? (
        <Vacio
          icon={Inbox}
          titulo="No hay solicitudes cerca"
          detalle="Mantente en línea: te avisamos en cuanto alguien pida acompañamiento por tu zona."
        />
      ) : null}

      {items.map((s) => (
        <Card key={s.viaje_id} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{s.deportista_nombre.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[font.h3]} numberOfLines={1}>{s.deportista_nombre}</Text>
              <Text style={font.muted}>a {Math.round(s.distancia_m)} m de ti</Text>
            </View>
          </View>

          {(s.viaje_necesidades ?? []).length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {(s.viaje_necesidades ?? []).map((n) => (
                <Estado key={n} text={n.replace(/_/g, " ")} tipo="indigo" />
              ))}
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 12 }}>
            <MapPin color={colors.ink4} size={18} style={{ marginTop: 2 }} />
            <Text style={[font.muted, { flex: 1 }]}>
              {s.viaje_origen_texto ?? "Origen"} → {s.viaje_destino_texto ?? "Destino"}
            </Text>
          </View>

          <View style={{ height: 16 }} />
          <PrimaryButton
            title={busy === s.viaje_id ? "Aceptando…" : "Aceptar acompañamiento"}
            disabled={busy === s.viaje_id}
            onPress={() => aceptar(s.viaje_id)}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: { color: colors.white, fontSize: 16, fontFamily: fuente.fuerte },
});
