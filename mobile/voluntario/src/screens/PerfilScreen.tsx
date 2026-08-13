import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Car, LogOut, ShieldCheck } from "lucide-react-native";
import { colors, font } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import { Card, Estado, Etiqueta, GhostButton, Screen } from "../../../shared/ui";

interface Me {
  voluntarioPerfil?: { voluntarioValidado: boolean; voluntarioVehiculo: string | null; voluntarioPatente: string | null } | null;
}

export function PerfilScreen() {
  const { user, logout } = useAuth();
  const [me, setMe] = useState<Me | null>(null);

  useFocusEffect(useCallback(() => { api<Me>("/auth/me").then(setMe).catch(() => {}); }, []));
  const perfil = me?.voluntarioPerfil;

  return (
    <Screen>
      <View style={{ alignItems: "center", paddingVertical: 12, gap: 4 }}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{user?.nombre?.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={[font.h2, { marginTop: 8 }]}>{user?.nombre}</Text>
        <Text style={[font.muted, { marginBottom: 10 }]}>{user?.correo}</Text>
        {perfil ? (
          <Estado
            text={perfil.voluntarioValidado ? "Voluntario validado" : "Validación pendiente"}
            tipo={perfil.voluntarioValidado ? "exito" : "atencion"}
          />
        ) : null}
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 }}>
        <View style={[styles.icono, { backgroundColor: colors.lavanda }]}>
          <Car color={colors.indigo} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Etiqueta>Vehículo</Etiqueta>
          <Text style={[font.body, { fontWeight: "600", marginTop: 2 }]}>
            {perfil?.voluntarioVehiculo ?? "Sin registrar"}
            {perfil?.voluntarioPatente ? ` · ${perfil.voluntarioPatente}` : ""}
          </Text>
        </View>
      </Card>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
        <View
          style={[
            styles.icono,
            { backgroundColor: perfil?.voluntarioValidado ? colors.exitoBg : colors.coralBg },
          ]}
        >
          <ShieldCheck color={perfil?.voluntarioValidado ? colors.exito : colors.coral} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Etiqueta>Estado de la cuenta</Etiqueta>
          <Text style={[font.body, { fontWeight: "600", marginTop: 2 }]}>
            {perfil?.voluntarioValidado ? "Validada" : "En revisión por el equipo"}
          </Text>
        </View>
      </Card>

      <View style={{ height: 28 }} />
      <GhostButton title="Cerrar sesión" icon={<LogOut color={colors.indigo} size={18} />} onPress={logout} />
      <View style={{ height: 18 }} />
      <Text style={[font.tiny, { textAlign: "center" }]}>Miparner Voluntario · versión 0.1.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: { color: colors.white, fontSize: 26, fontWeight: "600" },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
