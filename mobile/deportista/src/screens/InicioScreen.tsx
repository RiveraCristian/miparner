import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Navigation } from "lucide-react-native";
import { colors } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import { Card, MapPlaceholder, PrimaryButton, GhostButton, Pill, Screen, Badge } from "../../../shared/ui";
import type { RootStackParams } from "../navigation";

interface ViajeItem {
  viajeId: number;
  viajeEstado: string;
  viajeOrigenTexto: string | null;
  viajeDestinoTexto: string | null;
}

const ACTIVOS = ["solicitado", "asignado", "en_camino", "a_bordo"];

export function InicioScreen() {
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [activo, setActivo] = useState<ViajeItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      api<ViajeItem[]>("/viajes")
        .then((vs) => setActivo(vs.find((v) => ACTIVOS.includes(v.viajeEstado)) ?? null))
        .catch(() => {});
    }, []),
  );

  return (
    <Screen>
      <Text style={{ fontSize: 13, color: colors.ink3 }}>Hola de nuevo</Text>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, marginBottom: 16 }}>{user?.nombre}</Text>

      {activo && (
        <Card style={{ marginBottom: 14, borderColor: colors.brandSoft, backgroundColor: colors.brandSoft }}>
          <Badge text="Viaje en curso" tone="brand" />
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 8 }} numberOfLines={1}>
            {activo.viajeDestinoTexto ?? "Destino"}
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.ink2, marginBottom: 12 }}>Estado: {activo.viajeEstado.replace("_", " ")}</Text>
          <PrimaryButton title="Ver seguimiento" icon={<Navigation color="#fff" size={17} />} onPress={() => nav.navigate("EnViaje", { viajeId: activo.viajeId })} />
        </Card>
      )}

      <MapPlaceholder height={200}>
        <View style={{ position: "absolute", left: "34%", top: "60%", width: 16, height: 16, borderRadius: 8, backgroundColor: colors.brand, borderWidth: 3, borderColor: "#fff" }} />
        <View style={{ position: "absolute", left: "62%", top: "30%", width: 14, height: 14, borderRadius: 7, backgroundColor: colors.gold, borderWidth: 3, borderColor: "#fff" }} />
      </MapPlaceholder>

      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink2, marginTop: 18, marginBottom: 10 }}>Destinos frecuentes</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Pill label="Entrenamiento" active onPress={() => nav.navigate("Solicitar")} />
        <Pill label="Estadio" onPress={() => nav.navigate("Solicitar")} />
        <Pill label="Centro médico" onPress={() => nav.navigate("Solicitar")} />
      </View>

      <PrimaryButton title="Solicitar acompañamiento" icon={<Plus color="#fff" size={18} />} onPress={() => nav.navigate("Solicitar")} />
      <View style={{ height: 10 }} />
      <GhostButton title="Ver mis viajes" onPress={() => nav.navigate("Solicitar")} />
    </Screen>
  );
}
