/**
 * Acceso · una sola app para deportistas y voluntarios.
 *
 * Antes eran dos aplicaciones distintas y cada una tenía su acceso. Unificarlas
 * traslada aquí una decisión que antes tomaba la persona al elegir qué app
 * descargar: al entrar no hace falta preguntar nada —el rol viene en la cuenta—
 * pero al registrarse sí, y por eso el registro empieza eligiendo para qué
 * vienes.
 *
 * La cabecera cambia de mensaje según lo elegido: quien viene a pedir
 * acompañamiento y quien viene a darlo no responden al mismo texto.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AlertCircle, HandHeart, PersonStanding } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../../shared/auth";
import { Registro } from "../../../../shared/Registro";
import { FondoConstelacion } from "../../../../shared/FondoConstelacion";
import { Logo } from "../../../../shared/brand/Logo";
import { colors, elevacion, font, fuente, radius } from "../../../../shared/theme";
import { BarraSobreIndigo, CampoTexto, GhostButton, PrimaryButton } from "../../../../shared/ui";

type Rol = "deportista" | "voluntario";
type Modo = { pantalla: "login" } | { pantalla: "elegir" } | { pantalla: "registro"; rol: Rol };

export function LoginScreen() {
  const { login } = useAuth();
  // La cabecera se dibuja bajo la barra de estado: hay que reservar su alto.
  const bordes = useSafeAreaInsets();
  const [modo, setModo] = useState<Modo>({ pantalla: "login" });
  const [f, setF] = useState({ correo: "", password: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  if (modo.pantalla === "registro") {
    return <Registro rol={modo.rol} onVolver={() => setModo({ pantalla: "elegir" })} />;
  }

  async function entrar() {
    setError("");
    setEnviando(true);
    try {
      await login(f.correo.trim(), f.password);
    } catch (e) {
      // El error dice qué pasó y qué hacer, nunca solo «error».
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos entrar. Revisa tus datos y vuelve a intentar.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const eligiendo = modo.pantalla === "elegir";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.indigo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BarraSobreIndigo />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        {/* Índigo plano: el manual no admite el color aclarado ni en degradado. */}
        <View style={[styles.marca, { paddingTop: bordes.top + 34 }]}>
          <FondoConstelacion />
          {/* El nombre está en el arte del logotipo: no se repite en texto. */}
          <Logo alto={40} version="blanco" alt="Miparner" />
          <Text style={styles.lema} numberOfLines={1} adjustsFontSizeToFit>
            Encuentra tu lugar
          </Text>
          <Text style={styles.bajada}>
            Dos personas, un mismo lugar. Deportistas y voluntarios que llegan juntos al
            entrenamiento.
          </Text>
        </View>

        <View style={styles.form}>
          {eligiendo ? (
            <ElegirRol
              onElegir={(rol) => setModo({ pantalla: "registro", rol })}
              onVolver={() => setModo({ pantalla: "login" })}
            />
          ) : (
            <>
              <Text style={font.h1}>Bienvenido</Text>
              <Text style={[font.muted, { marginTop: 6, marginBottom: 22 }]}>
                Ingresa con tu correo y contraseña.
              </Text>

              {error ? (
                <View style={styles.error} accessibilityRole="alert">
                  <AlertCircle size={19} color={colors.coral} />
                  <Text style={[font.body, { flex: 1 }]}>{error}</Text>
                </View>
              ) : null}

              <CampoTexto
                label="Correo"
                value={f.correo}
                onChangeText={set("correo")}
                placeholder="tu.correo@ejemplo.cl"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <CampoTexto
                label="Contraseña"
                value={f.password}
                onChangeText={set("password")}
                placeholder="Tu contraseña"
                secureTextEntry
              />

              <View style={{ height: 10 }} />
              <PrimaryButton
                title={enviando ? "Entrando…" : "Iniciar sesión"}
                onPress={() => void entrar()}
                disabled={enviando}
              />
              <View style={{ height: 12 }} />
              <GhostButton
                title="Crear una cuenta"
                onPress={() => {
                  setError("");
                  setModo({ pantalla: "elegir" });
                }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ----------------------------------------------------------- Elegir el rol */

/**
 * Primer paso del registro: para qué vienes.
 *
 * Son tarjetas grandes y no un desplegable porque es la decisión que define
 * toda la experiencia posterior, y porque un área táctil amplia con icono y
 * texto es lo más accesible para quien navega con dificultad motora o por voz.
 */
function ElegirRol({
  onElegir,
  onVolver,
}: {
  onElegir: (rol: Rol) => void;
  onVolver: () => void;
}) {
  return (
    <>
      <Text style={font.h1}>¿Cómo quieres usar Miparner?</Text>
      <Text style={[font.muted, { marginTop: 6, marginBottom: 22 }]}>
        Elige una. Podrás cambiarlo más adelante escribiéndonos.
      </Text>

      <TarjetaRol
        icono={<PersonStanding color={colors.indigo} size={26} />}
        titulo="Busco acompañamiento"
        detalle="Soy deportista y quiero que alguien me acompañe a entrenar."
        onPress={() => onElegir("deportista")}
      />
      <TarjetaRol
        icono={<HandHeart color={colors.indigo} size={26} />}
        titulo="Quiero acompañar"
        detalle="Soy estudiante y quiero ser voluntario."
        onPress={() => onElegir("voluntario")}
      />

      <View style={{ height: 10 }} />
      <GhostButton title="Ya tengo cuenta" onPress={onVolver} />
    </>
  );
}

function TarjetaRol({
  icono,
  titulo,
  detalle,
  onPress,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={detalle}
      style={({ pressed }) => [
        styles.tarjetaRol,
        elevacion.suave,
        pressed && { backgroundColor: colors.lavanda, borderColor: colors.indigo },
      ]}
    >
      <View style={styles.tarjetaIcono}>{icono}</View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[font.body, { fontFamily: fuente.fuerte }]}>{titulo}</Text>
        <Text style={font.muted}>{detalle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marca: {
    backgroundColor: colors.indigo,
    paddingBottom: 34,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  lema: {
    color: colors.white,
    fontSize: 28,
    fontFamily: fuente.fuerte,
    lineHeight: 34,
    letterSpacing: -0.6,
    marginTop: 24,
  },
  // lavanda-200 sobre índigo · 8.1:1 AAA
  bajada: { color: colors.lav200, fontSize: 16, lineHeight: 24, marginTop: 8 },

  form: { padding: 24, flex: 1, backgroundColor: colors.surface },

  tarjetaRol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    marginBottom: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  tarjetaIcono: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.lavanda,
    alignItems: "center",
    justifyContent: "center",
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
