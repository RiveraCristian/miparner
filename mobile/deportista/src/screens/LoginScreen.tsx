import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Accessibility } from "lucide-react-native";
import { colors, radius } from "../../../shared/theme";
import { useAuth } from "../../../shared/auth";
import { PrimaryButton, GhostButton } from "../../../shared/ui";

export function LoginScreen() {
  const { login, register } = useAuth();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [f, setF] = useState({ nombre: "", correo: "", password: "", telefono: "", disciplina: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    setError("");
    setBusy(true);
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
      setError(e instanceof Error ? e.message : "No se pudo continuar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Accessibility color="#fff" size={28} />
          </View>
          <Text style={styles.title}>Rumbo</Text>
          <Text style={styles.subtitle}>Tu compañía para entrenar y competir.</Text>
        </View>
        <View style={styles.form}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink, marginBottom: 4 }}>
            {modo === "login" ? "Bienvenido" : "Crea tu cuenta"}
          </Text>
          <Text style={{ color: colors.ink2, marginBottom: 18 }}>
            {modo === "login" ? "Ingresa con tu correo y contraseña." : "Cuéntanos quién eres para acompañarte mejor."}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {modo === "registro" && (
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor={colors.ink3}
              value={f.nombre}
              onChangeText={set("nombre")}
              accessibilityLabel="Nombre completo"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Correo"
            placeholderTextColor={colors.ink3}
            autoCapitalize="none"
            keyboardType="email-address"
            value={f.correo}
            onChangeText={set("correo")}
            accessibilityLabel="Correo"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={colors.ink3}
            secureTextEntry
            value={f.password}
            onChangeText={set("password")}
            accessibilityLabel="Contraseña"
          />
          {modo === "registro" && (
            <>
              <TextInput style={styles.input} placeholder="Teléfono (+56 9 ...)" placeholderTextColor={colors.ink3} keyboardType="phone-pad" value={f.telefono} onChangeText={set("telefono")} accessibilityLabel="Teléfono" />
              <TextInput style={styles.input} placeholder="Disciplina (ej. paratletismo)" placeholderTextColor={colors.ink3} value={f.disciplina} onChangeText={set("disciplina")} accessibilityLabel="Disciplina" />
            </>
          )}

          <View style={{ height: 8 }} />
          <PrimaryButton title={busy ? "Procesando…" : modo === "login" ? "Iniciar sesión" : "Crear cuenta"} onPress={submit} disabled={busy} />
          <View style={{ height: 10 }} />
          <GhostButton title={modo === "login" ? "Crear una cuenta" : "Ya tengo cuenta"} onPress={() => { setError(""); setModo(modo === "login" ? "registro" : "login"); }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.brand, paddingTop: 68, paddingBottom: 36, alignItems: "center", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logo: { width: 60, height: 60, borderRadius: 16, backgroundColor: "rgba(255,255,255,.2)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: "rgba(255,255,255,.85)", fontSize: 14, marginTop: 4 },
  form: { padding: 24 },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.ink, marginBottom: 12 },
  error: { backgroundColor: colors.dangerSoft, color: colors.dangerStrong, padding: 11, borderRadius: radius.sm, marginBottom: 12, fontSize: 13.5 },
});
