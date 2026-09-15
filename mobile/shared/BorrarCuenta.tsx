/**
 * Borrar la propia cuenta · compartido por las dos apps.
 *
 * Apple exige que toda app que permita registrarse permita también borrar la
 * cuenta desde dentro (directriz 5.1.1), y la Ley 21.719 reconoce el derecho de
 * supresión. Sin esto, la app se rechaza en la App Store.
 *
 * Tres frenos deliberados, porque es irreversible:
 *  · Explica antes qué se borra y qué se conserva. Nadie debería descubrirlo
 *    después.
 *  · Pide escribir ELIMINAR. Un botón solo se pulsa sin querer.
 *  · Pide la contraseña. Un teléfono desbloqueado ajeno no basta para destruir
 *    la cuenta de alguien.
 */
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Trash2, TriangleAlert } from "lucide-react-native";
import { api } from "./api";
import { useAuth } from "./auth";
import { colors, font, fuente, radius } from "./theme";
import { CampoTexto, Card, DangerButton, GhostButton, Screen } from "./ui";

const PALABRA = "ELIMINAR";

export function PantallaBorrarCuenta({ onListo }: { onListo?: () => void }) {
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");

  const puede = password.length > 0 && confirmacion.trim().toUpperCase() === PALABRA;

  function preguntar() {
    Alert.alert(
      "¿Borrar tu cuenta?",
      "Esto no se puede deshacer. Perderás el acceso y borraremos tus datos personales.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Borrar mi cuenta", style: "destructive", onPress: () => void borrar() },
      ],
    );
  }

  async function borrar() {
    setError("");
    setBorrando(true);
    try {
      await api("/auth/me", {
        method: "DELETE",
        body: { password, confirmacion: PALABRA },
      });
      // La sesión ya no vale nada en el servidor: se limpia también aquí.
      await logout();
      onListo?.();
      Alert.alert("Cuenta eliminada", "Gracias por haber usado Miparner.");
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos borrar tu cuenta. Revisa tu conexión y vuelve a intentar.",
      );
    } finally {
      setBorrando(false);
    }
  }

  return (
    <Screen>
      <Card style={{ gap: 12, borderWidth: 1.5, borderColor: colors.coral }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TriangleAlert color={colors.coral} size={22} />
          <Text style={[font.h3, { flex: 1 }]}>Esto no se puede deshacer</Text>
        </View>
        <Text style={font.body}>
          Al borrar tu cuenta perderás el acceso a Miparner y no podrás recuperarla.
        </Text>
      </Card>

      <Card style={{ marginTop: 16, gap: 8 }}>
        <Text style={[font.body, { fontFamily: fuente.fuerte }]}>Qué borramos</Text>
        <Text style={font.muted}>
          Tu nombre, correo y teléfono. Tu dirección y comuna. Tu discapacidad, los apoyos que
          necesitas y lo que hayas escrito sobre tu salud. Tu contacto de emergencia. Tus
          documentos de acreditación, incluidos los archivos. Tus planes de entrenamiento y el
          texto de los mensajes que escribiste.
        </Text>
      </Card>

      <Card style={{ marginTop: 12, gap: 8 }}>
        <Text style={[font.body, { fontFamily: fuente.fuerte }]}>Qué se conserva, y por qué</Text>
        <Text style={font.muted}>
          El registro de los acompañamientos, sin tu nombre: es también el historial de la otra
          persona y el respaldo si alguna vez hubo una alerta de seguridad. Los mensajes que te
          escribieron, porque son palabras suyas, no tuyas. Y la constancia de qué autorizaste,
          que es justo lo que nos permite demostrar que tratamos tus datos de forma lícita
          mientras tuviste cuenta.
        </Text>
      </Card>

      {error ? (
        <Card
          style={{
            marginTop: 16,
            backgroundColor: colors.coralBg,
            borderLeftWidth: 3,
            borderLeftColor: colors.coral,
            borderRadius: radius.sm,
          }}
        >
          <Text style={font.body} accessibilityRole="alert">
            {error}
          </Text>
        </Card>
      ) : null}

      <View style={{ height: 22 }} />

      <CampoTexto
        label="Tu contraseña"
        ayuda="La pedimos para asegurarnos de que eres tú."
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        obligatorio
      />
      <CampoTexto
        label={`Escribe ${PALABRA} para confirmar`}
        value={confirmacion}
        onChangeText={setConfirmacion}
        autoCapitalize="characters"
        autoCorrect={false}
        obligatorio
      />

      <DangerButton
        title={borrando ? "Borrando…" : "Borrar mi cuenta"}
        icon={<Trash2 color={colors.coral} size={19} />}
        disabled={!puede || borrando}
        onPress={preguntar}
      />

      <View style={{ height: 12 }} />
      <GhostButton
        title="Mejor no, volver"
        onPress={() => onListo?.()}
        disabled={borrando}
      />
      <View style={{ height: 24 }} />
    </Screen>
  );
}
