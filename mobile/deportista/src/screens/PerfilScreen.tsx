import { useCallback, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Contrast, Heart, LogOut, Type, Vibrate, Volume2 } from "lucide-react-native";
import { colors, radius } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import { Card, GhostButton, Screen } from "../../../shared/ui";

interface Me {
  deportistaPerfil?: { deportistaDisciplina: string | null; deportistaNecesidades: string[] } | null;
}

const AJUSTES = [
  { key: "voz", label: "Lectura por voz", hint: "VoiceOver / TalkBack", icon: Volume2, def: true },
  { key: "contraste", label: "Alto contraste", hint: "", icon: Contrast, def: false },
  { key: "texto", label: "Texto grande", hint: "", icon: Type, def: false },
  { key: "vibra", label: "Vibración de avisos", hint: "", icon: Vibrate, def: true },
];

export function PerfilScreen() {
  const { user, logout } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [ajustes, setAjustes] = useState<Record<string, boolean>>(
    Object.fromEntries(AJUSTES.map((a) => [a.key, a.def])),
  );

  useFocusEffect(useCallback(() => { api<Me>("/auth/me").then(setMe).catch(() => {}); }, []));
  const perfil = me?.deportistaPerfil;

  return (
    <Screen>
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>{user?.nombre?.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 10 }}>{user?.nombre}</Text>
        <Text style={{ color: colors.ink2, fontSize: 13 }}>{perfil?.deportistaDisciplina ?? "Deportista"}</Text>
      </View>

      <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.ink2, marginTop: 8, marginBottom: 8 }}>ACCESIBILIDAD</Text>
      <Card style={{ paddingVertical: 2 }}>
        {AJUSTES.map((a, i) => {
          const Icon = a.icon;
          return (
            <View key={a.key} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: i < AJUSTES.length - 1 ? 1 : 0, borderBottomColor: colors.line2 }}>
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", marginRight: 11 }}>
                <Icon color={colors.brand} size={19} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors.ink }}>{a.label}</Text>
                {a.hint ? <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{a.hint}</Text> : null}
              </View>
              <Switch
                value={ajustes[a.key]}
                onValueChange={(v) => setAjustes((s) => ({ ...s, [a.key]: v }))}
                trackColor={{ true: colors.brand, false: colors.line }}
                accessibilityLabel={a.label}
              />
            </View>
          );
        })}
      </Card>

      <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.ink2, marginTop: 16, marginBottom: 8 }}>CONTACTO DE EMERGENCIA</Text>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" }}>
          <Heart color={colors.danger} size={19} />
        </View>
        <View>
          <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors.ink }}>Agregar contacto</Text>
          <Text style={{ fontSize: 11.5, color: colors.ink3 }}>Se avisa al activar el botón de pánico</Text>
        </View>
      </Card>

      <View style={{ height: 24 }} />
      <GhostButton title="Cerrar sesión" icon={<LogOut color={colors.ink} size={17} />} onPress={logout} />
      <View style={{ height: 16 }} />
      <Text style={{ textAlign: "center", color: colors.ink3, fontSize: 11 }}>Rumbo · versión 0.1.0</Text>
      <View style={{ borderRadius: radius.sm }} />
    </Screen>
  );
}
