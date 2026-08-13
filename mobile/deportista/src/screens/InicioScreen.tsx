import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Navigation } from "lucide-react-native";
import { colors, font } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import {
  CardLavanda,
  Estado,
  Etiqueta,
  GhostButton,
  MapPlaceholder,
  Pill,
  PrimaryButton,
  PuntoMapa,
  Screen,
} from "../../../shared/ui";
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
      <Etiqueta>Hola de nuevo</Etiqueta>
      <Text style={[font.h1, { marginTop: 4, marginBottom: 20 }]}>{user?.nombre}</Text>

      {activo && (
        <CardLavanda style={{ marginBottom: 16 }}>
          <Estado text="Viaje en curso" tipo="indigo" />
          <Text style={[font.h3, { marginTop: 10 }]} numberOfLines={1}>
            {activo.viajeDestinoTexto ?? "Destino"}
          </Text>
          <Text style={[font.muted, { marginBottom: 14 }]}>
            {activo.viajeEstado.replace(/_/g, " ")}
          </Text>
          <PrimaryButton
            title="Ver seguimiento"
            icon={<Navigation color={colors.white} size={18} />}
            onPress={() => nav.navigate("EnViaje", { viajeId: activo.viajeId })}
          />
        </CardLavanda>
      )}

      <MapPlaceholder height={200}>
        <PuntoMapa left="34%" top="60%" color={colors.indigo} />
        <PuntoMapa left="62%" top="30%" color={colors.coral} size={14} />
      </MapPlaceholder>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Destinos frecuentes</Etiqueta>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <Pill label="Entrenamiento" active onPress={() => nav.navigate("Solicitar")} />
        <Pill label="Estadio" onPress={() => nav.navigate("Solicitar")} />
        <Pill label="Centro médico" onPress={() => nav.navigate("Solicitar")} />
      </View>

      <PrimaryButton
        title="Solicitar acompañamiento"
        icon={<Plus color={colors.white} size={19} />}
        onPress={() => nav.navigate("Solicitar")}
      />
      <View style={{ height: 12 }} />
      <GhostButton title="Ver mis viajes" onPress={() => nav.navigate("Solicitar")} />
    </Screen>
  );
}
