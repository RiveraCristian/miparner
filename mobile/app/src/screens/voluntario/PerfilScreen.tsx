import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Car, LogOut, ShieldCheck, Trash2 } from "lucide-react-native";
import { colors, font, fuente } from "../../../../shared/theme";
import { api } from "../../../../shared/api";
import { useAuth } from "../../../../shared/auth";
import { FondoConstelacion } from "../../../../shared/FondoConstelacion";
import { Card, Estado, Etiqueta, GhostButton, PanelIndigo, Screen } from "../../../../shared/ui";
import type { RootStackParams } from "../../navigation";

interface Me {
  voluntarioPerfil?: { voluntarioValidado: boolean; voluntarioVehiculo: string | null; voluntarioPatente: string | null } | null;
}

/** Cómo se lee cada estado de validación en el perfil. */
const ESTADO_CUENTA: Record<string, { texto: string; tipo: "exito" | "atencion" | "critico" }> = {
  aprobado: { texto: "Voluntario validado", tipo: "exito" },
  pendiente: { texto: "En revisión por el equipo", tipo: "atencion" },
  rechazado: { texto: "Falta corregir tu documentación", tipo: "critico" },
};

export function PerfilScreen() {
  const { user, logout, validacion } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [me, setMe] = useState<Me | null>(null);

  useFocusEffect(useCallback(() => { api<Me>("/auth/me").then(setMe).catch(() => {}); }, []));
  const perfil = me?.voluntarioPerfil;
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
        <Text style={styles.heroCorreo}>{user?.correo}</Text>
        <View style={{ marginTop: 12 }}>
          <Estado text={cuenta.texto} tipo={cuenta.tipo} />
        </View>
      </PanelIndigo>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.icono, { backgroundColor: colors.indigo }]}>
          <Car color={colors.white} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Etiqueta>Vehículo</Etiqueta>
          <Text style={[font.body, { fontFamily: fuente.fuerte, marginTop: 2 }]}>
            {perfil?.voluntarioVehiculo ?? "Sin registrar"}
            {perfil?.voluntarioPatente ? ` · ${perfil.voluntarioPatente}` : ""}
          </Text>
        </View>
      </Card>

      <Card style={{ marginTop: 12, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={[
              styles.icono,
              { backgroundColor: cuenta.tipo === "exito" ? colors.exitoBg : colors.coralBg },
            ]}
          >
            <ShieldCheck color={cuenta.tipo === "exito" ? colors.exito : colors.coral} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Etiqueta>Estado de la cuenta</Etiqueta>
            <Text style={[font.body, { fontFamily: fuente.fuerte, marginTop: 2 }]}>{cuenta.texto}</Text>
            <Text style={font.tiny}>
              {estadoCuenta === "aprobado"
                ? "Puedes ponerte en línea y aceptar acompañamientos."
                : "Necesitamos tu cédula y tu certificado de alumno regular antes del primer acompañamiento."}
            </Text>
          </View>
        </View>
        <GhostButton
          title={estadoCuenta === "aprobado" ? "Ver mis documentos" : "Subir mis documentos"}
          onPress={() => nav.navigate("Documentos")}
        />
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
      <Text style={[font.tiny, { textAlign: "center" }]}>Miparner Voluntario · versión 0.1.0</Text>
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
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
