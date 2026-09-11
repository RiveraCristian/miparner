/**
 * Consentimientos y derechos · Ley 21.719. Compartido por las dos apps.
 *
 * Dos piezas:
 *  · `FormularioConsentimientos` — va dentro del registro. Cada finalidad se
 *    acepta por separado; una sola casilla de "acepto los términos" no sirve,
 *    porque la ley pide consentimiento específico para cada finalidad.
 *  · `PantallaPrivacidad` — ya dentro de la app. Ver qué autorizaste,
 *    cambiarlo, revocarlo y descargar una copia de tus datos.
 *
 * Las casillas nunca vienen marcadas: un consentimiento premarcado no es
 * consentimiento.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert, Share, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Download, ShieldCheck, Trash2 } from "lucide-react-native";
import { api } from "./api";
import { useAuth } from "./auth";
import { colors, font, fuente } from "./theme";
import {
  Card,
  CardLavanda,
  Casilla,
  Estado,
  Etiqueta,
  GhostButton,
  Loading,
  PanelIndigo,
  Screen,
} from "./ui";
import type { Consentimientos, DecisionConsentimiento, Derecho, Finalidad } from "./types";

/* --------------------------------------------------- Formulario de registro */

interface RespuestaFinalidades {
  version: string;
  derechos: Derecho[];
  finalidades: Finalidad[];
}

/**
 * Casillas de consentimiento para el registro.
 *
 * Avisa al formulario padre de las decisiones y de si ya están todas las
 * obligatorias, para que pueda habilitar el botón de crear la cuenta.
 */
export function FormularioConsentimientos({
  rol,
  onCambio,
}: {
  rol: "deportista" | "voluntario";
  onCambio: (decisiones: DecisionConsentimiento[], completo: boolean) => void;
}) {
  const [datos, setDatos] = useState<RespuestaFinalidades | null>(null);
  const [error, setError] = useState("");
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api<RespuestaFinalidades>(`/consentimientos/finalidades?rol=${rol}`, { auth: false })
      .then(setDatos)
      .catch(() =>
        setError("No pudimos cargar las autorizaciones. Revisa tu conexión y vuelve a intentar."),
      );
  }, [rol]);

  useEffect(() => {
    if (!datos) return;
    const decisiones = datos.finalidades.map((f) => ({
      finalidad: f.clave,
      otorgado: !!marcadas[f.clave],
    }));
    const completo = datos.finalidades
      .filter((f) => f.obligatorio)
      .every((f) => marcadas[f.clave]);
    onCambio(decisiones, completo);
  }, [datos, marcadas, onCambio]);

  if (error) {
    return (
      <Card>
        <Text style={font.body} accessibilityRole="alert">
          {error}
        </Text>
      </Card>
    );
  }
  if (!datos) return <Loading texto="Cargando autorizaciones…" />;

  return (
    <View>
      <Text style={[font.muted, { marginBottom: 14 }]}>
        Antes de crear tu cuenta necesitamos que autorices, una por una, para qué usaremos tus
        datos. Las marcadas con asterisco son imprescindibles para poder darte el servicio.
      </Text>

      {datos.finalidades.map((f) => (
        <Casilla
          key={f.clave}
          valor={!!marcadas[f.clave]}
          onCambiar={(v) => setMarcadas((s) => ({ ...s, [f.clave]: v }))}
          titulo={f.titulo}
          texto={f.texto}
          obligatorio={f.obligatorio}
          // Los datos sensibles se destacan: no pueden pasar desapercibidos.
          destacado={f.sensible}
        />
      ))}

      <Text style={[font.tiny, { marginTop: 4 }]}>
        Puedes cambiar o revocar cualquiera de estas autorizaciones desde tu perfil, cuando
        quieras. Versión de la política: {datos.version}.
      </Text>
    </View>
  );
}

/* ------------------------------------------------------- Pantalla de perfil */

export function PantallaPrivacidad() {
  const { refrescar } = useAuth();
  const [datos, setDatos] = useState<Consentimientos | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  const cargar = useCallback(() => {
    api<Consentimientos>("/consentimientos/me").then(setDatos).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => cargar(), [cargar]));

  async function cambiar(finalidad: Finalidad, otorgado: boolean) {
    // Revocar una obligatoria desactiva la cuenta: hay que decirlo antes.
    if (!otorgado && finalidad.obligatorio) {
      Alert.alert(
        "Esto desactivará tu cuenta",
        `Sin la autorización "${finalidad.titulo}" no podemos seguir prestándote el servicio. ` +
          "Tu cuenta quedará desactivada, aunque no se borra: puedes volver a activarla " +
          "otorgándola de nuevo.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Revocar igualmente", style: "destructive", onPress: () => void aplicar() },
        ],
      );
      return;
    }
    void aplicar();

    async function aplicar() {
      setOcupado(finalidad.clave);
      try {
        if (otorgado) {
          await api("/consentimientos/me", {
            method: "POST",
            body: { decisiones: [{ finalidad: finalidad.clave, otorgado: true }] },
          });
        } else {
          await api("/consentimientos/me/revocar", {
            method: "POST",
            body: { finalidad: finalidad.clave },
          });
        }
        cargar();
        await refrescar();
      } catch (e) {
        Alert.alert("No pudimos guardar el cambio", e instanceof Error ? e.message : "");
      } finally {
        setOcupado(null);
      }
    }
  }

  async function descargarMisDatos() {
    setDescargando(true);
    try {
      const datos = await api<unknown>("/consentimientos/me/mis-datos");
      const texto = JSON.stringify(datos, null, 2);
      // Compartir textos muy largos falla en algunos teléfonos; por encima de
      // ese tamaño conviene pedirlo desde la web.
      if (texto.length > 100_000) {
        Alert.alert(
          "Tus datos son muy extensos",
          "Escríbenos y te enviamos el archivo completo por correo.",
        );
        return;
      }
      await Share.share({ message: texto, title: "Mis datos en Miparner" });
    } catch (e) {
      Alert.alert("No pudimos preparar tus datos", e instanceof Error ? e.message : "");
    } finally {
      setDescargando(false);
    }
  }

  if (!datos) {
    return (
      <Screen>
        <Loading texto="Cargando tus autorizaciones…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <PanelIndigo style={{ gap: 8 }}>
        <Text style={{ color: colors.white, fontSize: 20, fontFamily: fuente.fuerte }}>
          Mis datos y privacidad
        </Text>
        <Text style={{ color: colors.lav200, fontSize: 16, lineHeight: 24 }}>
          Aquí decides para qué puede usarse tu información. Puedes cambiarlo cuando quieras.
        </Text>
      </PanelIndigo>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Lo que autorizaste</Etiqueta>

      {datos.finalidades.map((f) => (
        <Card key={f.clave} style={{ marginBottom: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={[font.body, { flex: 1, fontFamily: fuente.fuerte }]}>{f.titulo}</Text>
            <Estado
              text={f.otorgado ? "Autorizado" : "No autorizado"}
              tipo={f.otorgado ? "exito" : "neutro"}
            />
          </View>
          <Text style={font.muted}>{f.texto}</Text>
          {f.sensible ? <Estado text="Dato sensible" tipo="atencion" /> : null}
          {f.requiereRenovar ? (
            <Text style={font.tiny}>
              La política cambió desde que aceptaste. Vuelve a autorizarla para mantenerla al día.
            </Text>
          ) : null}
          <GhostButton
            title={
              ocupado === f.clave
                ? "Guardando…"
                : f.otorgado
                  ? "Revocar esta autorización"
                  : "Autorizar"
            }
            icon={
              f.otorgado ? (
                <Trash2 color={colors.indigo} size={18} />
              ) : (
                <ShieldCheck color={colors.indigo} size={18} />
              )
            }
            disabled={ocupado !== null}
            onPress={() => void cambiar(f, !f.otorgado)}
          />
        </Card>
      ))}

      <Etiqueta style={{ marginTop: 12, marginBottom: 10 }}>Tus derechos</Etiqueta>
      <CardLavanda style={{ gap: 10 }}>
        <Text style={font.body}>
          Puedes acceder a tus datos, corregirlos, pedir que los borremos, oponerte a un uso
          concreto y llevártelos contigo.
        </Text>
        <GhostButton
          title={descargando ? "Preparando…" : "Descargar una copia de mis datos"}
          icon={<Download color={colors.indigo} size={18} />}
          disabled={descargando}
          onPress={() => void descargarMisDatos()}
        />
      </CardLavanda>

      <Text style={[font.tiny, { marginTop: 16, textAlign: "center" }]}>
        Versión de la política: {datos.version}
      </Text>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
