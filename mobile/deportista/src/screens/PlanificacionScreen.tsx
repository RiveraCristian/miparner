/**
 * Planificación mensual de entrenamientos.
 *
 * Es la agenda del deportista: cuándo entrena, dónde, y qué cumplió. No pide
 * acompañamientos por sí sola —eso se hace aparte—, pero deja el mes a la vista
 * para organizarse.
 *
 * El avance lo calcula el backend a partir de los bloques cumplidos, no se
 * guarda: así nunca se desincroniza de lo que hay realmente en la agenda.
 */
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Target,
  X,
} from "lucide-react-native";
import { api } from "../../../shared/api";
import { colors, font, fuente } from "../../../shared/theme";
import {
  CampoTexto,
  Card,
  CardLavanda,
  Estado,
  Etiqueta,
  GhostButton,
  Loading,
  Pill,
  PrimaryButton,
  ProgressBar,
  Screen,
  Vacio,
} from "../../../shared/ui";
import type { BloqueEntrenamiento, PlanMensual } from "../../../shared/types";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Duraciones habituales de un entrenamiento, para no teclear. */
const DURACIONES = [30, 45, 60, 90, 120];

function hoy() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

/** Día de la semana de "AAAA-MM-DD", sin líos de zona horaria. */
function nombreDia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

export function PlanificacionScreen() {
  const [periodo, setPeriodo] = useState(hoy);
  const [plan, setPlan] = useState<PlanMensual | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => {
    api<PlanMensual>(`/planificacion/${periodo.anio}/${periodo.mes}`)
      .then(setPlan)
      .catch(() => setPlan(null));
  }, [periodo]);

  useFocusEffect(useCallback(() => cargar(), [cargar]));

  function mover(delta: number) {
    setPlan(null);
    setPeriodo((p) => {
      const total = p.anio * 12 + (p.mes - 1) + delta;
      return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
    });
  }

  async function marcar(bloque: BloqueEntrenamiento, estado: BloqueEntrenamiento["estado"]) {
    setOcupado(true);
    try {
      setPlan(await api<PlanMensual>(`/planificacion/bloques/${bloque.bloqueId}`, {
        method: "PATCH",
        body: { estado },
      }));
    } catch (e) {
      Alert.alert("No pudimos guardar el cambio", e instanceof Error ? e.message : "");
    } finally {
      setOcupado(false);
    }
  }

  function eliminar(bloque: BloqueEntrenamiento) {
    Alert.alert("Quitar entrenamiento", "¿Seguro que quieres quitarlo de tu agenda?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          setOcupado(true);
          try {
            setPlan(
              await api<PlanMensual>(`/planificacion/bloques/${bloque.bloqueId}`, {
                method: "DELETE",
              }),
            );
          } catch (e) {
            Alert.alert("No pudimos quitarlo", e instanceof Error ? e.message : "");
          } finally {
            setOcupado(false);
          }
        },
      },
    ]);
  }

  if (!plan) {
    return (
      <Screen>
        <Loading texto="Cargando tu planificación…" />
      </Screen>
    );
  }

  const { avance } = plan;

  // Los bloques llegan ordenados por fecha: agruparlos por día evita repetir
  // la fecha en cada tarjeta.
  const porDia = plan.bloques.reduce<Record<string, BloqueEntrenamiento[]>>((acc, b) => {
    (acc[b.fecha] ??= []).push(b);
    return acc;
  }, {});

  return (
    <Screen>
      {/* Selector de mes */}
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <GhostButton
          title=""
          icon={<ChevronLeft color={colors.indigo} size={20} />}
          onPress={() => mover(-1)}
          style={{ paddingHorizontal: 14 }}
        />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[font.h3, { textTransform: "capitalize" }]}>{MESES[plan.mes - 1]}</Text>
          <Text style={font.tiny}>{plan.anio}</Text>
        </View>
        <GhostButton
          title=""
          icon={<ChevronRight color={colors.indigo} size={20} />}
          onPress={() => mover(1)}
          style={{ paddingHorizontal: 14 }}
        />
      </Card>

      {/* Avance del mes */}
      <CardLavanda style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Target color={colors.indigo} size={20} />
          <Text style={[font.body, { flex: 1, fontFamily: fuente.fuerte }]}>
            {plan.horasObjetivo > 0
              ? `${avance.horasCumplidas} de ${plan.horasObjetivo} horas`
              : `${avance.horasCumplidas} horas entrenadas`}
          </Text>
          <Estado
            text={`${avance.sesionesCumplidas}/${avance.sesionesTotales}`}
            tipo={avance.sesionesTotales > 0 ? "indigo" : "neutro"}
          />
        </View>

        {avance.porcentaje !== null ? (
          <ProgressBar pct={avance.porcentaje} />
        ) : (
          <Text style={font.tiny}>
            Ponte una meta de horas para el mes y verás tu avance aquí.
          </Text>
        )}

        {plan.objetivo ? <Text style={font.muted}>{plan.objetivo}</Text> : null}
      </CardLavanda>

      <EditorObjetivo
        anio={plan.anio}
        mes={plan.mes}
        objetivo={plan.objetivo}
        horasObjetivo={plan.horasObjetivo}
        onGuardado={setPlan}
      />

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Entrenamientos del mes</Etiqueta>

      {plan.bloques.length === 0 ? (
        <Card>
          <Vacio
            icon={CalendarDays}
            titulo="Todavía no hay nada planificado"
            detalle="Agrega tu primer entrenamiento y te llevamos la cuenta de las horas."
          />
        </Card>
      ) : (
        Object.entries(porDia).map(([fecha, bloques]) => (
          <View key={fecha} style={{ marginBottom: 14 }}>
            <Text style={[font.tiny, { marginBottom: 6, textTransform: "capitalize" }]}>
              {nombreDia(fecha)} {fecha.slice(8, 10)}
            </Text>
            {bloques.map((b) => (
              <TarjetaBloque
                key={b.bloqueId}
                bloque={b}
                ocupado={ocupado}
                onMarcar={(e) => void marcar(b, e)}
                onEliminar={() => eliminar(b)}
              />
            ))}
          </View>
        ))
      )}

      {agregando ? (
        <FormularioBloque
          anio={plan.anio}
          mes={plan.mes}
          onGuardado={(p) => {
            setPlan(p);
            setAgregando(false);
          }}
          onCancelar={() => setAgregando(false)}
        />
      ) : (
        <PrimaryButton
          title="Agregar entrenamiento"
          icon={<Plus color={colors.white} size={19} />}
          onPress={() => setAgregando(true)}
        />
      )}

      <View style={{ height: 24 }} />
    </Screen>
  );
}

/* ------------------------------------------------------------- Cada bloque */

function TarjetaBloque({
  bloque: b,
  ocupado,
  onMarcar,
  onEliminar,
}: {
  bloque: BloqueEntrenamiento;
  ocupado: boolean;
  onMarcar: (estado: BloqueEntrenamiento["estado"]) => void;
  onEliminar: () => void;
}) {
  const cumplido = b.estado === "cumplido";
  const omitido = b.estado === "omitido";

  return (
    <Card style={{ marginBottom: 10, gap: 10, opacity: omitido ? 0.65 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Clock color={colors.ink3} size={16} />
            <Text style={[font.body, { fontFamily: fuente.fuerte }]}>
              {b.horaInicio} · {b.duracionMin} min
            </Text>
          </View>
          {b.disciplina ? <Text style={font.muted}>{b.disciplina}</Text> : null}
          {b.lugar ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MapPin color={colors.ink4} size={15} />
              <Text style={font.tiny}>{b.lugar}</Text>
            </View>
          ) : null}
          {b.notas ? <Text style={font.tiny}>{b.notas}</Text> : null}
        </View>
        <Estado
          text={cumplido ? "Cumplido" : omitido ? "Omitido" : "Planificado"}
          tipo={cumplido ? "exito" : omitido ? "neutro" : "indigo"}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <GhostButton
          title={cumplido ? "Desmarcar" : "Cumplido"}
          icon={<Check color={colors.indigo} size={17} />}
          disabled={ocupado}
          onPress={() => onMarcar(cumplido ? "planificado" : "cumplido")}
          style={{ flex: 1 }}
        />
        <GhostButton
          title={omitido ? "Recuperar" : "No fui"}
          icon={<X color={colors.indigo} size={17} />}
          disabled={ocupado}
          onPress={() => onMarcar(omitido ? "planificado" : "omitido")}
          style={{ flex: 1 }}
        />
      </View>
      <GhostButton title="Quitar de la agenda" disabled={ocupado} onPress={onEliminar} />
    </Card>
  );
}

/* ----------------------------------------------------------- Meta del mes */

function EditorObjetivo({
  anio,
  mes,
  objetivo,
  horasObjetivo,
  onGuardado,
}: {
  anio: number;
  mes: number;
  objetivo: string | null;
  horasObjetivo: number;
  onGuardado: (p: PlanMensual) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(objetivo ?? "");
  const [horas, setHoras] = useState(String(horasObjetivo || ""));
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      onGuardado(
        await api<PlanMensual>(`/planificacion/${anio}/${mes}`, {
          method: "PUT",
          body: {
            objetivo: texto.trim() || undefined,
            horasObjetivo: Number(horas) || 0,
          },
        }),
      );
      setAbierto(false);
    } catch (e) {
      Alert.alert("No pudimos guardar tu meta", e instanceof Error ? e.message : "");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <GhostButton
        title={horasObjetivo > 0 || objetivo ? "Cambiar mi meta del mes" : "Ponerme una meta"}
        icon={<Target color={colors.indigo} size={18} />}
        onPress={() => setAbierto(true)}
        style={{ marginTop: 12 }}
      />
    );
  }

  return (
    <Card style={{ marginTop: 12 }}>
      <CampoTexto
        label="Horas que quieres entrenar este mes"
        value={horas}
        onChangeText={(v) => setHoras(v.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        placeholder="Por ejemplo, 20"
        maxLength={3}
      />
      <CampoTexto
        label="Tu objetivo, con tus palabras"
        ayuda="Opcional. Te lo mostramos arriba cada vez que abras tu plan."
        value={texto}
        onChangeText={setTexto}
        placeholder="Preparar el regional de noviembre"
        multiline
        maxLength={500}
      />
      <PrimaryButton
        title={guardando ? "Guardando…" : "Guardar meta"}
        disabled={guardando}
        onPress={() => void guardar()}
      />
      <View style={{ height: 10 }} />
      <GhostButton title="Cancelar" onPress={() => setAbierto(false)} />
    </Card>
  );
}

/* ------------------------------------------------------ Agregar entrenamiento */

function FormularioBloque({
  anio,
  mes,
  onGuardado,
  onCancelar,
}: {
  anio: number;
  mes: number;
  onGuardado: (p: PlanMensual) => void;
  onCancelar: () => void;
}) {
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [duracion, setDuracion] = useState(60);
  const [disciplina, setDisciplina] = useState("");
  const [lugar, setLugar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const diaValido = Number(dia) >= 1 && Number(dia) <= diasDelMes;
  const horaValida = /^([01]\d|2[0-3]):([0-5]\d)$/.test(hora);

  async function guardar() {
    setError("");
    setGuardando(true);
    try {
      const fecha = `${anio}-${String(mes).padStart(2, "0")}-${dia.padStart(2, "0")}`;
      onGuardado(
        await api<PlanMensual>(`/planificacion/${anio}/${mes}/bloques`, {
          method: "POST",
          body: {
            fecha,
            horaInicio: hora,
            duracionMin: duracion,
            disciplina: disciplina.trim() || undefined,
            lugar: lugar.trim() || undefined,
          },
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos agregarlo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card style={{ gap: 4 }}>
      <Text style={[font.h3, { marginBottom: 12 }]}>Nuevo entrenamiento</Text>

      {error ? (
        <Text style={[font.body, { color: colors.ink, marginBottom: 10 }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <CampoTexto
        label={`Día de ${MESES[mes - 1]}`}
        value={dia}
        onChangeText={(v) => setDia(v.replace(/[^0-9]/g, "").slice(0, 2))}
        keyboardType="number-pad"
        placeholder={`1 a ${diasDelMes}`}
        obligatorio
        error={dia && !diaValido ? `Escribe un día entre 1 y ${diasDelMes}` : undefined}
      />
      <CampoTexto
        label="Hora de inicio"
        value={hora}
        onChangeText={setHora}
        placeholder="09:30"
        keyboardType="numbers-and-punctuation"
        obligatorio
        error={hora && !horaValida ? "Usa el formato HH:MM, por ejemplo 09:30" : undefined}
      />

      <Text style={[font.tiny, { marginBottom: 8 }]}>¿Cuánto dura?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {DURACIONES.map((d) => (
          <Pill
            key={d}
            label={d >= 60 ? `${d / 60} h${d % 60 ? ` ${d % 60}` : ""}` : `${d} min`}
            active={duracion === d}
            onPress={() => setDuracion(d)}
          />
        ))}
      </View>

      <CampoTexto
        label="Disciplina"
        value={disciplina}
        onChangeText={setDisciplina}
        placeholder="Paratletismo"
        maxLength={120}
      />
      <CampoTexto
        label="Lugar"
        value={lugar}
        onChangeText={setLugar}
        placeholder="Centro de Alto Rendimiento"
        maxLength={255}
      />

      <PrimaryButton
        title={guardando ? "Guardando…" : "Agregar a mi agenda"}
        icon={<Plus color={colors.white} size={18} />}
        disabled={guardando || !diaValido || !horaValida}
        onPress={() => void guardar()}
      />
      <View style={{ height: 10 }} />
      <GhostButton title="Cancelar" onPress={onCancelar} />
    </Card>
  );
}
