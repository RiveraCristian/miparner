import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Car, LogOut, ShieldCheck } from "lucide-react-native";
import { colors } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import { Badge, Card, GhostButton, Screen } from "../../../shared/ui";

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
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#3a2405", fontSize: 24, fontWeight: "800" }}>{user?.nombre?.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 10 }}>{user?.nombre}</Text>
        <Text style={{ color: colors.ink2, fontSize: 13, marginBottom: 8 }}>{user?.correo}</Text>
        {perfil && (perfil.voluntarioValidado
          ? <Badge text="Voluntario validado" tone="success" />
          : <Badge text="Validación pendiente" tone="gold" />)}
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Car color={colors.brand} size={19} />
        </View>
        <View>
          <Text style={{ fontSize: 12, color: colors.ink3 }}>Vehículo</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>
            {perfil?.voluntarioVehiculo ?? "Sin registrar"}{perfil?.voluntarioPatente ? ` · ${perfil.voluntarioPatente}` : ""}
          </Text>
        </View>
      </Card>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck color={colors.success} size={19} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: colors.ink3 }}>Estado de la cuenta</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{perfil?.voluntarioValidado ? "Validada" : "En revisión por el equipo"}</Text>
        </View>
      </Card>

      <View style={{ height: 24 }} />
      <GhostButton title="Cerrar sesión" icon={<LogOut color={colors.ink} size={17} />} onPress={logout} />
    </Screen>
  );
}
