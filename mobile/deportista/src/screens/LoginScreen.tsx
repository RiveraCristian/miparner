/**
 * Acceso · app del deportista.
 *
 * Cabecera de marca en índigo plano con el logotipo en blanco, como la portada
 * del manual. Sobre índigo el logotipo nunca va en color.
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
  const [f, setF] = useState({ nombre: "", correo: "", password: "", telefono: "", disciplina: "" });
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
          rol: "deportista",
          telefono: f.telefono,
          disciplina: f.disciplina,
        });
    } catch (e) {
      // El error dice qué pasó y qué hacer, nunca solo «error».
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
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        {/* Índigo plano: el manual no admite el color aclarado ni en degradado. */}
        <View style={[styles.marca, { paddingTop: bordes.top + 34 }]}>
          {/* El nombre está en el arte del logotipo: no se repite en texto. */}
          <Logo alto={40} version="blanco" alt="Miparner" />
          <Text style={styles.lema}>Encuentra tu lugar</Text>
          <Text style={styles.bajada}>
            Dos personas, un mismo lugar. Pide acompañamiento y llega a entrenar.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={font.h1}>{esRegistro ? "Crea tu cuenta" : "Bienvenido"}</Text>
          <Text style={[font.muted, { marginTop: 6, marginBottom: 22 }]}>
            {esRegistro
              ? "Cuéntanos quién eres para acompañarte mejor."
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
              <Campo label="Disciplina" value={f.disciplina} onChangeText={set("disciplina")} placeholder="Por ejemplo, paratletismo" />
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
            title={esRegistro ? "Ya tengo cuenta" : "Crear una cuenta"}
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

/** Campo con etiqueta visible: el placeholder nunca es la única pista. */
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
  lema: {
    color: colors.white,
    fontSize: 28,
    fontFamily: fuente.fuerte,
    lineHeight: 34,
    letterSpacing: -0.5,
    marginTop: 24,
  },
  // lavanda-200 sobre índigo · 8.1:1 AAA
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
  // Coral como forma (borde e icono); el texto va en tinta.
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
