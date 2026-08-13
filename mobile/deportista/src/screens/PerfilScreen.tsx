import { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Contrast, Heart, LogOut, Type, Vibrate, Volume2 } from "lucide-react-native";
import { colors, font } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import { Card, Etiqueta, GhostButton, Screen } from "../../../shared/ui";

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
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{user?.nombre?.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={[font.h2, { marginTop: 12 }]}>{user?.nombre}</Text>
        <Text style={font.muted}>{perfil?.deportistaDisciplina ?? "Deportista"}</Text>
      </View>

      <Etiqueta style={{ marginTop: 14, marginBottom: 10 }}>Accesibilidad</Etiqueta>
      <Card style={{ paddingVertical: 4 }}>
        {AJUSTES.map((a, i) => {
          const Icono = a.icon;
          return (
            <View
              key={a.key}
              style={[styles.fila, i === AJUSTES.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={[styles.filaIcono, { backgroundColor: colors.lavanda }]}>
                <Icono color={colors.indigo} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[font.body, { fontWeight: "600" }]}>{a.label}</Text>
                {a.hint ? <Text style={font.tiny}>{a.hint}</Text> : null}
              </View>
              {/* thumbColor explícito: sin él Android pinta el pulgar con su
                  color de acento (verde azulado), fuera de la paleta. */}
              <Switch
                value={ajustes[a.key]}
                onValueChange={(v) => setAjustes((s) => ({ ...s, [a.key]: v }))}
                trackColor={{ true: colors.indigo, false: colors.line }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.line}
                accessibilityLabel={a.label}
              />
            </View>
          );
        })}
      </Card>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Contacto de emergencia</Etiqueta>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {/* Coral como forma: el icono. El texto va en tinta. */}
        <View style={[styles.filaIcono, { backgroundColor: colors.coralBg }]}>
          <Heart color={colors.coral} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[font.body, { fontWeight: "600" }]}>Agregar contacto</Text>
          <Text style={font.tiny}>Se le avisa al activar el botón de pánico</Text>
        </View>
      </Card>

      <View style={{ height: 28 }} />
      <GhostButton title="Cerrar sesión" icon={<LogOut color={colors.indigo} size={18} />} onPress={logout} />
      <View style={{ height: 18 }} />
      <Text style={[font.tiny, { textAlign: "center" }]}>Miparner · versión 0.1.0</Text>
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
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  filaIcono: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
