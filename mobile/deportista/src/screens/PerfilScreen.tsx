import { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Contrast, Heart, LogOut, ShieldCheck, Type, Vibrate, Volume2, Trash2 } from "lucide-react-native";
import { colors, font, fuente } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { useAuth } from "../../../shared/auth";
import { FondoConstelacion } from "../../../shared/FondoConstelacion";
import { Card, Estado, Etiqueta, GhostButton, PanelIndigo, Screen } from "../../../shared/ui";
import type { RootStackParams } from "../navigation";

interface Me {
  deportistaPerfil?: { deportistaDisciplina: string | null; deportistaNecesidades: string[] } | null;
}

const AJUSTES = [
  { key: "voz", label: "Lectura por voz", hint: "VoiceOver / TalkBack", icon: Volume2, def: true },
  { key: "contraste", label: "Alto contraste", hint: "", icon: Contrast, def: false },
  { key: "texto", label: "Texto grande", hint: "", icon: Type, def: false },
  { key: "vibra", label: "Vibración de avisos", hint: "", icon: Vibrate, def: true },
];

/** Cómo se lee cada estado de validación en el perfil. */
const ESTADO_CUENTA: Record<string, { texto: string; tipo: "exito" | "atencion" | "critico" }> = {
  aprobado: { texto: "Cuenta validada", tipo: "exito" },
  pendiente: { texto: "En revisión por el equipo", tipo: "atencion" },
  rechazado: { texto: "Falta corregir tu documentación", tipo: "critico" },
};

export function PerfilScreen() {
  const { user, logout, validacion } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [me, setMe] = useState<Me | null>(null);
  const [ajustes, setAjustes] = useState<Record<string, boolean>>(
    Object.fromEntries(AJUSTES.map((a) => [a.key, a.def])),
  );

  useFocusEffect(useCallback(() => { api<Me>("/auth/me").then(setMe).catch(() => {}); }, []));
  const perfil = me?.deportistaPerfil;
  const estadoCuenta = validacion?.estadoValidacion ?? user?.estadoValidacion ?? "pendiente";
  const cuenta = ESTADO_CUENTA[estadoCuenta] ?? ESTADO_CUENTA.pendiente;

  return (
    <Screen>
      {/* Hero de marca: avatar + identidad sobre fondo azul con constelación. */}
      <PanelIndigo style={{ alignItems: "center", marginBottom: 16, overflow: "hidden" }}>
        <FondoConstelacion />
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{user?.nombre?.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.heroNombre}>{user?.nombre}</Text>
        <Text style={styles.heroCorreo}>{perfil?.deportistaDisciplina ?? user?.correo}</Text>
        <View style={{ marginTop: 12 }}>
          <Estado text={cuenta.texto} tipo={cuenta.tipo} />
        </View>
      </PanelIndigo>

      <Etiqueta style={{ marginBottom: 10 }}>Estado de la cuenta</Etiqueta>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={[
              styles.filaIcono,
              { backgroundColor: cuenta.tipo === "exito" ? colors.exitoBg : colors.coralBg },
            ]}
          >
            <ShieldCheck
              color={cuenta.tipo === "exito" ? colors.exito : colors.coral}
              size={20}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Estado text={cuenta.texto} tipo={cuenta.tipo} />
            <Text style={font.tiny}>
              {estadoCuenta === "aprobado"
                ? "Puedes pedir acompañamiento con normalidad."
                : "Hasta que el equipo valide tu credencial de discapacidad no puedes pedir acompañamiento."}
            </Text>
          </View>
        </View>
        <GhostButton
          title={estadoCuenta === "aprobado" ? "Ver mis documentos" : "Subir mis documentos"}
          onPress={() => nav.navigate("Documentos")}
        />
      </Card>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Accesibilidad</Etiqueta>
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
                <Text style={[font.body, { fontFamily: fuente.fuerte }]}>{a.label}</Text>
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
          <Text style={[font.body, { fontFamily: fuente.fuerte }]}>Agregar contacto</Text>
          <Text style={font.tiny}>Se le avisa al activar el botón de pánico</Text>
        </View>
      </Card>

      <View style={{ height: 28 }} />
      {/* Ley 21.719: los derechos del titular tienen que poder ejercerse
          desde la propia app, no solo escribiendo un correo. */}
      <GhostButton
        title="Mis datos y privacidad"
        icon={<ShieldCheck color={colors.indigo} size={18} />}
        onPress={() => nav.navigate("Privacidad")}
      />
      <View style={{ height: 12 }} />
      {/* Apple exige poder borrar la cuenta desde dentro de la app
          (directriz 5.1.1), y la Ley 21.719 reconoce ese derecho. */}
      <GhostButton
        title="Borrar mi cuenta"
        icon={<Trash2 color={colors.indigo} size={18} />}
        onPress={() => nav.navigate("BorrarCuenta")}
      />
      <View style={{ height: 12 }} />
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
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: { color: colors.indigo, fontSize: 26, fontFamily: fuente.fuerte },
  heroNombre: { color: colors.white, fontSize: 22, fontFamily: fuente.fuerte, letterSpacing: -0.3, marginTop: 12 },
  heroCorreo: { color: colors.lav200, fontSize: 15, fontFamily: fuente.normal, marginTop: 3 },
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
