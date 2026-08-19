/**
 * Acceso · app del voluntario.
 *
 * Misma cabecera de marca que la app del deportista: índigo plano con el
 * logotipo en blanco. La estructura no cambia entre las dos apps; cambia el
 * submódulo y el contenido del formulario.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AlertCircle } from "lucide-react-native";
import { colors, font, fuente, radius } from "../../../shared/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../shared/auth";
import { Logo } from "../../../shared/brand/Logo";
import { BarraSobreIndigo, GhostButton, PrimaryButton } from "../../../shared/ui";

export function LoginScreen() {
  const { login, register } = useAuth();
  // La cabecera se dibuja bajo la barra de estado: hay que reservar su alto.
  const bordes = useSafeAreaInsets();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [f, setF] = useState({ nombre: "", correo: "", password: "", telefono: "", vehiculo: "", patente: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function enviar() {
    setError("");
    setEnviando(true);
    try {
      if (modo === "login") await login(f.correo.trim(), f.password);
      else
        await register({
          correo: f.correo.trim(),
          nombre: f.nombre.trim(),
          password: f.password,
          rol: "voluntario",
          telefono: f.telefono,
          vehiculo: f.vehiculo,
          patente: f.patente,
        });
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos continuar. Revisa tus datos y vuelve a intentar.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const esRegistro = modo === "registro";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.indigo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BarraSobreIndigo />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.marca, { paddingTop: bordes.top + 34 }]}>
          <Logo alto={40} version="blanco" alt="Miparner" />
          <Text style={styles.etiquetaApp}>VOLUNTARIOS</Text>
          <Text style={styles.lema}>Tu tiempo cambia el día de alguien</Text>
          <Text style={styles.bajada}>
            Acompaña a un deportista hasta su entrenamiento. Tú decides cuándo.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={font.h1}>{esRegistro ? "Únete como voluntario" : "Bienvenido"}</Text>
          <Text style={[font.muted, { marginTop: 6, marginBottom: 22 }]}>
            {esRegistro
              ? "El equipo validará tu cuenta antes de tu primer acompañamiento."
              : "Ingresa con tu correo y contraseña."}
          </Text>

          {error ? (
            <View style={styles.error} accessibilityRole="alert">
              <AlertCircle size={19} color={colors.coral} />
              <Text style={[font.body, { flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          {esRegistro && (
            <Campo label="Nombre completo" value={f.nombre} onChangeText={set("nombre")} placeholder="Tu nombre y apellido" />
          )}
          <Campo
            label="Correo"
            value={f.correo}
            onChangeText={set("correo")}
            placeholder="tu.correo@ejemplo.cl"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Campo
            label="Contraseña"
            value={f.password}
            onChangeText={set("password")}
            placeholder="Tu contraseña"
            secureTextEntry
          />
          {esRegistro && (
            <>
              <Campo label="Teléfono" value={f.telefono} onChangeText={set("telefono")} placeholder="+56 9 1234 5678" keyboardType="phone-pad" />
              <Campo label="Vehículo" value={f.vehiculo} onChangeText={set("vehiculo")} placeholder="Marca y modelo" />
              <Campo label="Patente" value={f.patente} onChangeText={set("patente")} placeholder="ABCD12" autoCapitalize="characters" />
            </>
          )}

          <View style={{ height: 10 }} />
          <PrimaryButton
            title={enviando ? "Procesando…" : esRegistro ? "Crear cuenta" : "Iniciar sesión"}
            onPress={enviar}
            disabled={enviando}
          />
          <View style={{ height: 12 }} />
          <GhostButton
            title={esRegistro ? "Ya tengo cuenta" : "Quiero ser voluntario"}
            onPress={() => {
              setError("");
              setModo(esRegistro ? "login" : "registro");
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.etiquetaCampo}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.ink3}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  marca: {
    backgroundColor: colors.indigo,
    paddingBottom: 34,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  etiquetaApp: {
    color: colors.lav300,
    fontSize: 12,
    fontFamily: fuente.medio,
    letterSpacing: 1.8,
    marginTop: 22,
  },
  lema: {
    color: colors.white,
    fontSize: 26,
    fontFamily: fuente.fuerte,
    lineHeight: 32,
    letterSpacing: -0.4,
    marginTop: 8,
  },
  bajada: { color: colors.lav200, fontSize: 16, lineHeight: 24, marginTop: 8 },

  form: { padding: 24, flex: 1, backgroundColor: colors.surface },
  etiquetaCampo: { fontSize: 14, fontFamily: fuente.fuerte, color: colors.ink2, marginBottom: 7 },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  error: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.coralBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: 18,
  },
});
