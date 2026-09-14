/**
 * Registro por pasos · compartido por las dos apps.
 *
 * Por qué por pasos y no un formulario largo: al deportista se le piden ahora
 * bastantes datos (caracterización, apoyos, contacto de emergencia y cinco
 * autorizaciones). Todo junto en una sola pantalla es una pared de campos —
 * mala para cualquiera y peor para quien navega con lector de pantalla o tiene
 * una discapacidad cognitiva. En pasos cortos cada pantalla tiene un asunto.
 *
 * El último paso son siempre las autorizaciones: sin las obligatorias el
 * backend no crea la cuenta, así que el botón se queda deshabilitado hasta que
 * estén marcadas.
 */
import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "./auth";
import { useCatalogo, apoyosSugeridos } from "./catalogos";
import { FormularioConsentimientos } from "./Privacidad";
import { Logo } from "./brand/Logo";
import { colors, font, fuente, radius } from "./theme";
import {
  CampoTexto,
  Card,
  Casilla,
  Etiqueta,
  GhostButton,
  Loading,
  Pill,
  PrimaryButton,
  ProgressBar,
} from "./ui";
import type { DecisionConsentimiento } from "./types";

type Rol = "deportista" | "voluntario";

interface Paso {
  clave: string;
  titulo: string;
  bajada: string;
}

const PASOS_DEPORTISTA: Paso[] = [
  { clave: "cuenta", titulo: "Crea tu cuenta", bajada: "Con esto podrás entrar a Miparner." },
  { clave: "sobre_ti", titulo: "Sobre ti", bajada: "Nos ayuda a encontrar voluntarios cerca." },
  { clave: "situacion", titulo: "Cómo acompañarte", bajada: "Lo que el voluntario necesita saber para ayudarte bien." },
  { clave: "emergencia", titulo: "Contacto de emergencia", bajada: "A quién avisamos si activas el botón de pánico." },
  { clave: "permisos", titulo: "Tus autorizaciones", bajada: "Decides tú, una por una." },
];

const PASOS_VOLUNTARIO: Paso[] = [
  { clave: "cuenta", titulo: "Crea tu cuenta", bajada: "Con esto podrás entrar a Miparner." },
  { clave: "vehiculo", titulo: "Cómo te mueves", bajada: "Para que el deportista sepa en qué viajará." },
  { clave: "permisos", titulo: "Tus autorizaciones", bajada: "Decides tú, una por una." },
];

/** Regiones de Chile. La comuna se escribe: son 346 y una lista sería peor. */
const REGIONES = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
  "Valparaíso", "Metropolitana", "O'Higgins", "Maule", "Ñuble",
  "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes",
];

export function Registro({ rol, onVolver }: { rol: Rol; onVolver: () => void }) {
  const { register } = useAuth();
  const bordes = useSafeAreaInsets();
  const { catalogo, cargando, error: errorCatalogo, reintentar } = useCatalogo();

  const pasos = rol === "deportista" ? PASOS_DEPORTISTA : PASOS_VOLUNTARIO;
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [f, setF] = useState({
    nombre: "", correo: "", password: "", telefono: "",
    fechaNacimiento: "", genero: "", region: "", comuna: "", direccion: "",
    disciplina: "", observaciones: "",
    emergenciaNombre: "", emergenciaTelefono: "", emergenciaRelacion: "",
    vehiculo: "", patente: "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const [tipos, setTipos] = useState<string[]>([]);
  const [apoyos, setApoyos] = useState<string[]>([]);
  const [nivelAutonomia, setNivelAutonomia] = useState("");
  const [comunicacion, setComunicacion] = useState("");
  const [decisiones, setDecisiones] = useState<DecisionConsentimiento[]>([]);
  const [permisosCompletos, setPermisosCompletos] = useState(false);

  const alternar = (lista: string[], set: (v: string[]) => void) => (clave: string) =>
    set(lista.includes(clave) ? lista.filter((x) => x !== clave) : [...lista, clave]);

  const onCambioConsentimientos = useCallback(
    (d: DecisionConsentimiento[], completo: boolean) => {
      setDecisiones(d);
      setPermisosCompletos(completo);
    },
    [],
  );

  const cuentaLista =
    f.nombre.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.correo) && f.password.length >= 8;

  const puedeAvanzar = useMemo(() => {
    switch (pasos[paso].clave) {
      case "cuenta":
        return cuentaLista;
      case "permisos":
        return permisosCompletos;
      default:
        // Los pasos intermedios son opcionales: se pueden completar después
        // desde el perfil, y obligar aquí solo alarga la barrera de entrada.
        return true;
    }
  }, [pasos, paso, cuentaLista, permisosCompletos]);

  async function crear() {
    setError("");
    setEnviando(true);
    try {
      await register({
        correo: f.correo.trim(),
        nombre: f.nombre.trim(),
        password: f.password,
        telefono: f.telefono.trim() || undefined,
        rol,
        consentimientos: decisiones,
        ...(rol === "deportista"
          ? {
              perfil: {
                disciplina: f.disciplina.trim() || undefined,
                fechaNacimiento: f.fechaNacimiento.trim() || undefined,
                genero: f.genero.trim() || undefined,
                region: f.region || undefined,
                comuna: f.comuna.trim() || undefined,
                direccion: f.direccion.trim() || undefined,
                tiposDiscapacidad: tipos,
                apoyos,
                nivelAutonomia: nivelAutonomia || undefined,
                comunicacion: comunicacion || undefined,
                observaciones: f.observaciones.trim() || undefined,
                emergenciaNombre: f.emergenciaNombre.trim() || undefined,
                emergenciaTelefono: f.emergenciaTelefono.trim() || undefined,
                emergenciaRelacion: f.emergenciaRelacion.trim() || undefined,
              },
            }
          : { vehiculo: f.vehiculo.trim() || undefined, patente: f.patente.trim() || undefined }),
      });
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos crear tu cuenta. Revisa tus datos y vuelve a intentar.",
      );
      // Si falla algo de las autorizaciones, el paso correcto es el último.
      setPaso(pasos.length - 1);
    } finally {
      setEnviando(false);
    }
  }

  const actual = pasos[paso];
  const ultimo = paso === pasos.length - 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.indigo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ backgroundColor: colors.indigo, paddingTop: bordes.top + 24, paddingHorizontal: 24, paddingBottom: 26, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, gap: 10 }}>
          <Logo alto={28} version="blanco" alt="Miparner" />
          <Text style={{ color: colors.white, fontSize: 24, fontFamily: fuente.fuerte, marginTop: 12 }}>
            {actual.titulo}
          </Text>
          <Text style={{ color: colors.lav200, fontSize: 15, lineHeight: 22 }}>{actual.bajada}</Text>
          <View style={{ marginTop: 10 }}>
            <ProgressBar pct={((paso + 1) / pasos.length) * 100} color={colors.lav200} sobreOscuro />
          </View>
          <Text style={{ color: colors.lav300, fontSize: 13 }}>
            Paso {paso + 1} de {pasos.length}
          </Text>
        </View>

        <View style={{ flex: 1, backgroundColor: colors.surface, padding: 24 }}>
          {error ? (
            <View style={{ flexDirection: "row", gap: 10, backgroundColor: colors.coralBg, borderLeftWidth: 3, borderLeftColor: colors.coral, borderRadius: radius.sm, padding: 14, marginBottom: 18 }} accessibilityRole="alert">
              <AlertCircle size={19} color={colors.coral} />
              <Text style={[font.body, { flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          {actual.clave === "cuenta" && (
            <>
              <CampoTexto label="Nombre completo" value={f.nombre} onChangeText={set("nombre")} placeholder="Tu nombre y apellido" obligatorio />
              <CampoTexto label="Correo" value={f.correo} onChangeText={set("correo")} placeholder="tu.correo@ejemplo.cl" autoCapitalize="none" keyboardType="email-address" obligatorio />
              <CampoTexto label="Contraseña" ayuda="Al menos 8 caracteres." value={f.password} onChangeText={set("password")} secureTextEntry obligatorio />
              <CampoTexto label="Teléfono" value={f.telefono} onChangeText={set("telefono")} placeholder="+56 9 1234 5678" keyboardType="phone-pad" />
            </>
          )}

          {actual.clave === "sobre_ti" && (
            <>
              <CampoTexto label="Fecha de nacimiento" ayuda="Formato AAAA-MM-DD, por ejemplo 1998-04-23." value={f.fechaNacimiento} onChangeText={set("fechaNacimiento")} placeholder="1998-04-23" keyboardType="numbers-and-punctuation" />
              <CampoTexto label="Género" ayuda="Escríbelo como tú lo describas. Puedes dejarlo en blanco." value={f.genero} onChangeText={set("genero")} maxLength={40} />

              <Etiqueta style={{ marginBottom: 10 }}>Región</Etiqueta>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                {REGIONES.map((r) => (
                  <Pill key={r} label={r} active={f.region === r} onPress={() => set("region")(f.region === r ? "" : r)} />
                ))}
              </View>

              <CampoTexto label="Comuna" value={f.comuna} onChangeText={set("comuna")} placeholder="Providencia" maxLength={120} />
              <CampoTexto label="Dirección" ayuda="Opcional. Solo se usa para proponerte el punto de partida." value={f.direccion} onChangeText={set("direccion")} maxLength={255} />
              <CampoTexto label="Disciplina que practicas" value={f.disciplina} onChangeText={set("disciplina")} placeholder="Paratletismo" maxLength={120} />
            </>
          )}

          {actual.clave === "situacion" && (
            <PasoSituacion
              catalogo={catalogo}
              cargando={cargando}
              error={errorCatalogo}
              reintentar={reintentar}
              tipos={tipos}
              onTipo={alternar(tipos, setTipos)}
              apoyos={apoyos}
              onApoyo={alternar(apoyos, setApoyos)}
              nivelAutonomia={nivelAutonomia}
              onNivel={setNivelAutonomia}
              comunicacion={comunicacion}
              onComunicacion={setComunicacion}
              observaciones={f.observaciones}
              onObservaciones={set("observaciones")}
            />
          )}

          {actual.clave === "emergencia" && (
            <>
              <Text style={[font.muted, { marginBottom: 18 }]}>
                Si activas el botón de pánico durante un acompañamiento, avisaremos a esta
                persona junto con tu ubicación. Puedes dejarlo para después.
              </Text>
              <CampoTexto label="Nombre" value={f.emergenciaNombre} onChangeText={set("emergenciaNombre")} maxLength={255} />
              <CampoTexto label="Teléfono" value={f.emergenciaTelefono} onChangeText={set("emergenciaTelefono")} keyboardType="phone-pad" maxLength={30} />
              <CampoTexto label="¿Quién es de ti?" value={f.emergenciaRelacion} onChangeText={set("emergenciaRelacion")} placeholder="Madre, pareja, entrenador…" maxLength={60} />
            </>
          )}

          {actual.clave === "vehiculo" && (
            <>
              <CampoTexto label="Vehículo" ayuda="Déjalo en blanco si acompañas a pie o en transporte público." value={f.vehiculo} onChangeText={set("vehiculo")} placeholder="Toyota Yaris gris" maxLength={120} />
              <CampoTexto label="Patente" value={f.patente} onChangeText={set("patente")} placeholder="ABCD12" autoCapitalize="characters" maxLength={20} />
            </>
          )}

          {actual.clave === "permisos" && (
            <FormularioConsentimientos rol={rol} onCambio={onCambioConsentimientos} />
          )}

          <View style={{ height: 20 }} />

          {ultimo ? (
            <PrimaryButton
              title={enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
              icon={<Check color={colors.white} size={18} />}
              disabled={enviando || !puedeAvanzar}
              onPress={() => void crear()}
            />
          ) : (
            <PrimaryButton
              title="Continuar"
              icon={<ArrowRight color={colors.white} size={18} />}
              disabled={!puedeAvanzar}
              onPress={() => setPaso((p) => p + 1)}
            />
          )}

          <View style={{ height: 12 }} />
          <GhostButton
            title={paso === 0 ? "Ya tengo cuenta" : "Volver"}
            icon={<ArrowLeft color={colors.indigo} size={18} />}
            onPress={() => (paso === 0 ? onVolver() : setPaso((p) => p - 1))}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------ Paso de la situación */

function PasoSituacion({
  catalogo,
  cargando,
  error,
  reintentar,
  tipos,
  onTipo,
  apoyos,
  onApoyo,
  nivelAutonomia,
  onNivel,
  comunicacion,
  onComunicacion,
  observaciones,
  onObservaciones,
}: {
  catalogo: ReturnType<typeof useCatalogo>["catalogo"];
  cargando: boolean;
  error: string;
  reintentar: () => void;
  tipos: string[];
  onTipo: (clave: string) => void;
  apoyos: string[];
  onApoyo: (clave: string) => void;
  nivelAutonomia: string;
  onNivel: (v: string) => void;
  comunicacion: string;
  onComunicacion: (v: string) => void;
  observaciones: string;
  onObservaciones: (v: string) => void;
}) {
  if (cargando) return <Loading texto="Cargando opciones…" />;
  if (!catalogo) {
    return (
      <Card style={{ gap: 12 }}>
        <Text style={font.body} accessibilityRole="alert">{error}</Text>
        <GhostButton title="Reintentar" onPress={reintentar} />
      </Card>
    );
  }

  const grupos = apoyosSugeridos(catalogo, tipos);

  return (
    <>
      <Card style={{ marginBottom: 18, gap: 6 }}>
        <Text style={[font.body, { fontFamily: fuente.fuerte }]}>Quién ve qué</Text>
        <Text style={font.muted}>
          El voluntario solo ve los apoyos que necesitas durante el trayecto. Tu tipo de
          discapacidad y lo que escribas aquí no se le muestran nunca.
        </Text>
      </Card>

      <Etiqueta style={{ marginBottom: 10 }}>Tipo de discapacidad</Etiqueta>
      <Text style={[font.tiny, { marginBottom: 10 }]}>
        Puedes elegir varias, o "prefiero no decirlo".
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {catalogo.tiposDiscapacidad.map((t) => (
          <Pill key={t.clave} label={t.titulo} active={tipos.includes(t.clave)} onPress={() => onTipo(t.clave)} />
        ))}
      </View>

      <Etiqueta style={{ marginBottom: 10 }}>¿Cuánta ayuda necesitas en el trayecto?</Etiqueta>
      <View style={{ gap: 0, marginBottom: 22 }}>
        {catalogo.nivelAutonomia.map((n) => (
          <Casilla
            key={n.clave}
            valor={nivelAutonomia === n.clave}
            onCambiar={() => onNivel(nivelAutonomia === n.clave ? "" : n.clave)}
            titulo={n.titulo}
            texto={n.detalle}
          />
        ))}
      </View>

      <Etiqueta style={{ marginBottom: 10 }}>¿Cómo prefieres que te contactemos?</Etiqueta>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {catalogo.comunicacionPreferida.map((c) => (
          <Pill key={c.clave} label={c.titulo} active={comunicacion === c.clave} onPress={() => onComunicacion(comunicacion === c.clave ? "" : c.clave)} />
        ))}
      </View>

      <Etiqueta style={{ marginBottom: 4 }}>Apoyos que necesitas</Etiqueta>
      <Text style={[font.tiny, { marginBottom: 12 }]}>
        Esto sí lo ve el voluntario. Marca todo lo que te sirva.
      </Text>
      {grupos.map((g) => (
        <View key={g.categoria} style={{ marginBottom: 18 }}>
          <Text style={[font.body, { fontFamily: fuente.fuerte, marginBottom: 8 }]}>{g.titulo}</Text>
          {g.apoyos.map((a) => (
            <Casilla
              key={a.clave}
              valor={apoyos.includes(a.clave)}
              onCambiar={() => onApoyo(a.clave)}
              titulo={a.titulo}
              texto={a.detalle}
            />
          ))}
        </View>
      ))}

      <CampoTexto
        label="¿Algo más que debamos saber?"
        ayuda="Opcional. Solo lo ve el equipo, no el voluntario."
        value={observaciones}
        onChangeText={onObservaciones}
        multiline
        maxLength={1000}
      />
    </>
  );
}
