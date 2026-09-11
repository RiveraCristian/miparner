/**
 * Documentos de validación · compartido por las dos apps.
 *
 * Al registrarse, la cuenta queda **activa pero pendiente**: la persona entra,
 * ve su perfil y sube su respaldo, pero no puede pedir ni aceptar
 * acompañamientos hasta que el panel de administración la apruebe.
 *
 *  · Deportista  → credencial de discapacidad.
 *  · Voluntario  → cédula de identidad + certificado de alumno regular.
 *
 * Qué documento pide cada rol lo decide el backend
 * (`documentos.catalogo.ts`): esta pantalla solo dibuja lo que llega en
 * `/documentos/requeridos`, así que añadir un tipo nuevo no toca la app.
 */
import { useCallback, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Camera,
  CheckCircle2,
  Clock,
  CircleAlert,
  FileUp,
  Images,
  ShieldCheck,
} from "lucide-react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { errorCodes, isErrorWithCode, pick, types } from "@react-native-documents/picker";
import { apiUpload, type ArchivoLocal } from "./api";
import { useAuth } from "./auth";
import { colors, font, fuente, radius } from "./theme";
import { Card, CardLavanda, Estado, Etiqueta, GhostButton, Loading, PanelIndigo, Screen } from "./ui";
import type { EstadoValidacion, Requisito } from "./types";

/* ------------------------------------------------------------------- Aviso */

const TITULO_ESTADO: Record<EstadoValidacion, string> = {
  pendiente: "Cuenta en revisión",
  aprobado: "Cuenta validada",
  rechazado: "Falta corregir algo",
};

/**
 * Banner para las pantallas de inicio. Dice en qué va la validación y lleva a
 * la pantalla de documentos. No usa solo color: lleva icono y texto.
 */
export function AvisoValidacion({ onIr }: { onIr: () => void }) {
  const { validacion, user } = useAuth();
  const estado = validacion?.estadoValidacion ?? user?.estadoValidacion;
  if (!estado || estado === "aprobado") return null;

  const faltan = validacion?.faltantes.length ?? 0;
  const rechazada = estado === "rechazado";

  return (
    <CardLavanda style={{ marginBottom: 16, gap: 10 }}>
      <Estado text={TITULO_ESTADO[estado]} tipo={rechazada ? "critico" : "atencion"} />
      <Text style={font.body}>
        {rechazada
          ? validacion?.motivoRechazo ??
            "El equipo pidió que vuelvas a enviar tu documentación."
          : faltan > 0
            ? `Te ${faltan === 1 ? "falta 1 documento" : `faltan ${faltan} documentos`} por subir. Mientras tanto no puedes pedir ni aceptar acompañamientos.`
            : "El equipo está revisando tus documentos. Te avisamos en cuanto quede lista."}
      </Text>
      <GhostButton
        title={faltan > 0 || rechazada ? "Subir mis documentos" : "Ver mis documentos"}
        icon={<ShieldCheck color={colors.indigo} size={18} />}
        onPress={onIr}
      />
    </CardLavanda>
  );
}

/* ---------------------------------------------------------------- Pantalla */

export function PantallaDocumentos() {
  const { validacion, refrescar } = useAuth();
  const [subiendo, setSubiendo] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refrescar();
    }, [refrescar]),
  );

  async function subir(tipo: string, archivo: ArchivoLocal) {
    setSubiendo(tipo);
    try {
      await apiUpload(`/documentos`, archivo, { tipo });
      await refrescar();
      Alert.alert(
        "Documento enviado",
        "Queda en revisión. Te avisamos cuando el equipo valide tu cuenta.",
      );
    } catch (e) {
      Alert.alert(
        "No pudimos subir el documento",
        e instanceof Error ? e.message : "Revisa tu conexión y vuelve a intentar.",
      );
    } finally {
      setSubiendo(null);
    }
  }

  if (!validacion) {
    return (
      <Screen>
        <Loading texto="Cargando tus documentos…" />
      </Screen>
    );
  }

  const estado = validacion.estadoValidacion;
  const aprobada = estado === "aprobado";

  return (
    <Screen>
      <PanelIndigo style={{ gap: 8 }}>
        <Text style={{ color: colors.white, fontSize: 20, fontFamily: fuente.fuerte }}>
          {TITULO_ESTADO[estado]}
        </Text>
        <Text style={{ color: colors.lav200, fontSize: 16, lineHeight: 24 }}>
          {aprobada
            ? "Ya puedes usar Miparner con normalidad."
            : estado === "rechazado"
              ? validacion.motivoRechazo ?? "Vuelve a enviar la documentación corregida."
              : validacion.listaParaRevision
                ? "Tenemos todo lo que necesitábamos. El equipo lo está revisando."
                : "Sube los documentos que faltan para que el equipo pueda validarte."}
        </Text>
      </PanelIndigo>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Documentos que te pedimos</Etiqueta>

      {validacion.requeridos.map((r) => (
        <TarjetaRequisito
          key={r.tipo}
          requisito={r}
          ocupado={subiendo === r.tipo}
          bloqueado={subiendo !== null}
          onArchivo={(a) => subir(r.tipo, a)}
        />
      ))}

      <Card style={{ marginTop: 6, gap: 6 }}>
        <Text style={[font.body, { fontFamily: fuente.fuerte }]}>¿Por qué los pedimos?</Text>
        <Text style={font.muted}>
          Miparner conecta a personas que se van a encontrar en la calle. Validar quién es
          quién antes del primer acompañamiento es lo que hace que eso sea seguro. Tus
          documentos solo los ve el equipo de administración.
        </Text>
      </Card>

      <View style={{ height: 20 }} />
    </Screen>
  );
}

/* -------------------------------------------------------- Tarjeta por tipo */

const ESTADO_DOC: Record<string, { texto: string; tipo: "exito" | "atencion" | "critico" }> = {
  aprobado: { texto: "Aprobado", tipo: "exito" },
  pendiente: { texto: "En revisión", tipo: "atencion" },
  rechazado: { texto: "Rechazado", tipo: "critico" },
};

function TarjetaRequisito({
  requisito: r,
  ocupado,
  bloqueado,
  onArchivo,
}: {
  requisito: Requisito;
  ocupado: boolean;
  bloqueado: boolean;
  onArchivo: (archivo: ArchivoLocal) => void;
}) {
  const doc = r.documento;
  const marca = doc ? ESTADO_DOC[doc.documentoEstado] : null;
  const Icono = !doc ? FileUp : doc.documentoEstado === "aprobado" ? CheckCircle2 : doc.documentoEstado === "rechazado" ? CircleAlert : Clock;
  const colorIcono = !doc
    ? colors.indigo
    : doc.documentoEstado === "aprobado"
      ? colors.exito
      : doc.documentoEstado === "rechazado"
        ? colors.coral
        : colors.indigo;

  async function conCamara() {
    const res = await launchCamera({ mediaType: "photo", quality: 0.8, saveToPhotos: false });
    manejarImagen(res);
  }

  async function conGaleria() {
    const res = await launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 1 });
    manejarImagen(res);
  }

  function manejarImagen(res: Awaited<ReturnType<typeof launchImageLibrary>>) {
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert(
        "No pudimos abrir la cámara",
        res.errorCode === "permission"
          ? "Da permiso de cámara a Miparner desde los ajustes del teléfono."
          : res.errorMessage ?? "Prueba eligiendo el archivo desde tu teléfono.",
        res.errorCode === "permission"
          ? [{ text: "Cancelar" }, { text: "Abrir ajustes", onPress: () => void Linking.openSettings() }]
          : undefined,
      );
      return;
    }
    const a = res.assets?.[0];
    if (!a?.uri) return;
    onArchivo({
      uri: a.uri,
      name: a.fileName ?? `${r.tipo}.jpg`,
      type: a.type ?? "image/jpeg",
    });
  }

  async function conArchivo() {
    try {
      const [f] = await pick({ type: [types.pdf, types.images] });
      if (!f?.uri) return;
      onArchivo({
        uri: f.uri,
        name: f.name ?? `${r.tipo}.pdf`,
        type: f.type ?? "application/pdf",
      });
    } catch (e) {
      // Cancelar no es un error: se ignora en silencio.
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert("No pudimos abrir tus archivos", "Prueba tomando una foto del documento.");
    }
  }

  return (
    <Card style={{ marginBottom: 14, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={[estilos.icono, { backgroundColor: colors.lavanda }]}>
          <Icono color={colorIcono} size={20} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[font.body, { fontFamily: fuente.fuerte }]}>{r.titulo}</Text>
          <Text style={font.tiny}>{r.descripcion}</Text>
        </View>
        {marca ? <Estado text={marca.texto} tipo={marca.tipo} /> : <Estado text="Falta" tipo="neutro" />}
      </View>

      {doc ? (
        <View style={estilos.archivo}>
          <Text style={font.tiny} numberOfLines={1}>
            {doc.documentoNombreOriginal} · {Math.max(1, Math.round(doc.documentoTamano / 1024))} KB
          </Text>
          {doc.documentoObservacion ? (
            <Text style={[font.tiny, { color: colors.ink2 }]}>Nota del equipo: {doc.documentoObservacion}</Text>
          ) : null}
        </View>
      ) : null}

      {doc?.documentoEstado === "aprobado" ? null : (
        <View style={{ gap: 10 }}>
          <GhostButton
            title={ocupado ? "Subiendo…" : "Tomar foto del documento"}
            icon={<Camera color={colors.indigo} size={18} />}
            disabled={bloqueado}
            onPress={conCamara}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <GhostButton
              title="Galería"
              icon={<Images color={colors.indigo} size={18} />}
              disabled={bloqueado}
              onPress={conGaleria}
              style={{ flex: 1 }}
            />
            <GhostButton
              title="Archivo"
              icon={<FileUp color={colors.indigo} size={18} />}
              disabled={bloqueado}
              onPress={conArchivo}
              style={{ flex: 1 }}
            />
          </View>
          {doc ? (
            <Text style={font.tiny}>Si subes uno nuevo, reemplaza al anterior y vuelve a revisión.</Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const estilos = StyleSheet.create({
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  archivo: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    padding: 10,
    gap: 4,
  },
});
