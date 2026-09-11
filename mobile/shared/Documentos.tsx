/**
 * Acreditación de la cuenta · compartido por las dos apps.
 *
 * Al registrarse, la cuenta queda **activa pero pendiente**: la persona entra,
 * ve su perfil y acredita su situación, pero no puede pedir ni aceptar
 * acompañamientos hasta que el panel de administración la apruebe.
 *
 * Lo que se pide viene en GRUPOS, y dentro de un grupo basta con una opción:
 *
 *  · Deportista → credencial de discapacidad O certificado médico,
 *    O una videollamada con el equipo si no tiene ninguno de los dos.
 *  · Voluntario → cédula de identidad + certificado de alumno regular.
 *
 * Qué pide cada rol lo decide el backend (`documentos.catalogo.ts`): esta
 * pantalla solo dibuja lo que llega en `/documentos/requeridos`, así que
 * cambiar los requisitos no obliga a tocar la app.
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
  Video,
} from "lucide-react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { errorCodes, isErrorWithCode, pick, types } from "@react-native-documents/picker";
import { api, apiUpload, type ArchivoLocal } from "./api";
import { useAuth } from "./auth";
import { colors, font, fuente, radius } from "./theme";
import {
  CampoTexto,
  Card,
  CardLavanda,
  Estado,
  Etiqueta,
  GhostButton,
  Loading,
  PanelIndigo,
  Pill,
  PrimaryButton,
  Screen,
} from "./ui";
import type { EstadoValidacion, GrupoAcreditacion } from "./types";

/* ------------------------------------------------------------------- Aviso */

const TITULO_ESTADO: Record<EstadoValidacion, string> = {
  pendiente: "Cuenta en revisión",
  aprobado: "Cuenta validada",
  rechazado: "Falta corregir algo",
};

/**
 * Banner para las pantallas de inicio. Dice en qué va la validación y lleva a
 * la pantalla de acreditación. No usa solo color: lleva icono y texto.
 */
export function AvisoValidacion({ onIr }: { onIr: () => void }) {
  const { validacion, user } = useAuth();
  const estado = validacion?.estadoValidacion ?? user?.estadoValidacion;
  if (!estado || estado === "aprobado") return null;

  const faltan = validacion?.faltantes.length ?? 0;
  const rechazada = estado === "rechazado";
  const esperaLlamada = validacion?.verificacionVia === "videollamada" && faltan === 0;

  return (
    <CardLavanda style={{ marginBottom: 16, gap: 10 }}>
      <Estado text={TITULO_ESTADO[estado]} tipo={rechazada ? "critico" : "atencion"} />
      <Text style={font.body}>
        {rechazada
          ? (validacion?.motivoRechazo ??
            "El equipo pidió que vuelvas a enviar tu documentación.")
          : esperaLlamada
            ? "Pediste acreditarte por videollamada. El equipo te contactará con los horarios que indicaste."
            : faltan > 0
              ? "Todavía falta acreditar tu situación. Mientras tanto no puedes pedir ni aceptar acompañamientos."
              : "El equipo está revisando tu cuenta. Te avisamos en cuanto quede lista."}
      </Text>
      <GhostButton
        title={faltan > 0 || rechazada ? "Acreditar mi cuenta" : "Ver mi acreditación"}
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
        <Loading texto="Cargando tu acreditación…" />
      </Screen>
    );
  }

  const estado = validacion.estadoValidacion;
  const aprobada = estado === "aprobado";
  const porVideollamada = validacion.verificacionVia === "videollamada";

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
              ? (validacion.motivoRechazo ?? "Vuelve a enviar la documentación corregida.")
              : validacion.listaParaRevision
                ? "Tenemos todo lo que necesitábamos. El equipo lo está revisando."
                : "Acredita tu situación para que el equipo pueda validarte."}
        </Text>
      </PanelIndigo>

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Lo que necesitamos</Etiqueta>

      {validacion.grupos.map((g) => (
        <TarjetaGrupo
          key={g.grupo}
          grupo={g}
          ocupado={!!subiendo}
          subiendoTipo={subiendo}
          onArchivo={(tipo, a) => subir(tipo, a)}
        />
      ))}

      {/* La vía sin documentos. Solo aparece si el backend la ofrece para
          este rol y el grupo todavía no está cubierto con un papel. */}
      {validacion.admiteVideollamada && !aprobada && (
        <TarjetaVideollamada
          activa={porVideollamada}
          disponibilidad={validacion.verificacionDisponibilidad}
          onPedida={refrescar}
        />
      )}

      <Card style={{ marginTop: 6, gap: 6 }}>
        <Text style={[font.body, { fontFamily: fuente.fuerte }]}>¿Por qué lo pedimos?</Text>
        <Text style={font.muted}>
          Miparner conecta a personas que se van a encontrar en la calle. Saber quién es quién
          antes del primer acompañamiento es lo que hace que eso sea seguro. Tus documentos solo
          los ve el equipo de administración, nunca el voluntario.
        </Text>
      </Card>

      <View style={{ height: 20 }} />
    </Screen>
  );
}

/* -------------------------------------------------------- Tarjeta de grupo */

const ESTADO_DOC: Record<string, { texto: string; tipo: "exito" | "atencion" | "critico" }> = {
  aprobado: { texto: "Aprobado", tipo: "exito" },
  pendiente: { texto: "En revisión", tipo: "atencion" },
  rechazado: { texto: "Rechazado", tipo: "critico" },
};

function TarjetaGrupo({
  grupo: g,
  ocupado,
  subiendoTipo,
  onArchivo,
}: {
  grupo: GrupoAcreditacion;
  ocupado: boolean;
  subiendoTipo: string | null;
  onArchivo: (tipo: string, archivo: ArchivoLocal) => void;
}) {
  // Con varias opciones hay que elegir cuál se va a subir. Si ya hay una
  // cubierta, se preselecciona esa para poder reemplazarla.
  const [elegido, setElegido] = useState<string>(g.tipoCubierto ?? g.opciones[0]?.tipo ?? "");
  const doc = g.documento;
  const marca = doc ? ESTADO_DOC[doc.documentoEstado] : null;

  const Icono = g.cubiertoPorVideollamada
    ? Video
    : !doc
      ? FileUp
      : doc.documentoEstado === "aprobado"
        ? CheckCircle2
        : doc.documentoEstado === "rechazado"
          ? CircleAlert
          : Clock;

  const colorIcono = !doc
    ? colors.indigo
    : doc.documentoEstado === "aprobado"
      ? colors.exito
      : doc.documentoEstado === "rechazado"
        ? colors.coral
        : colors.indigo;

  const opcion = g.opciones.find((o) => o.tipo === elegido) ?? g.opciones[0];

  function entregar(archivo: ArchivoLocal) {
    if (!opcion) return;
    onArchivo(opcion.tipo, archivo);
  }

  async function conCamara() {
    manejarImagen(await launchCamera({ mediaType: "photo", quality: 0.8, saveToPhotos: false }));
  }

  async function conGaleria() {
    manejarImagen(await launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 1 }));
  }

  function manejarImagen(res: Awaited<ReturnType<typeof launchImageLibrary>>) {
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert(
        "No pudimos abrir la cámara",
        res.errorCode === "permission"
          ? "Da permiso de cámara a Miparner desde los ajustes del teléfono."
          : (res.errorMessage ?? "Prueba eligiendo el archivo desde tu teléfono."),
        res.errorCode === "permission"
          ? [
              { text: "Cancelar" },
              { text: "Abrir ajustes", onPress: () => void Linking.openSettings() },
            ]
          : undefined,
      );
      return;
    }
    const a = res.assets?.[0];
    if (!a?.uri) return;
    entregar({
      uri: a.uri,
      name: a.fileName ?? `${opcion?.tipo ?? "documento"}.jpg`,
      type: a.type ?? "image/jpeg",
    });
  }

  async function conArchivo() {
    try {
      const [f] = await pick({ type: [types.pdf, types.images] });
      if (!f?.uri) return;
      entregar({
        uri: f.uri,
        name: f.name ?? `${opcion?.tipo ?? "documento"}.pdf`,
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
          <Text style={[font.body, { fontFamily: fuente.fuerte }]}>{g.titulo}</Text>
          <Text style={font.tiny}>{g.descripcion}</Text>
        </View>
        {g.cubiertoPorVideollamada ? (
          <Estado text="Por videollamada" tipo="indigo" />
        ) : marca ? (
          <Estado text={marca.texto} tipo={marca.tipo} />
        ) : (
          <Estado text="Falta" tipo="neutro" />
        )}
      </View>

      {doc ? (
        <View style={estilos.archivo}>
          <Text style={font.tiny} numberOfLines={1}>
            {doc.documentoNombreOriginal} · {Math.max(1, Math.round(doc.documentoTamano / 1024))} KB
          </Text>
          {doc.documentoObservacion ? (
            <Text style={[font.tiny, { color: colors.ink2 }]}>
              Nota del equipo: {doc.documentoObservacion}
            </Text>
          ) : null}
        </View>
      ) : null}

      {g.cubiertoPorVideollamada || doc?.documentoEstado === "aprobado" ? null : (
        <View style={{ gap: 10 }}>
          {/* Con más de una opción, la persona elige qué va a subir. */}
          {g.opciones.length > 1 ? (
            <View style={{ gap: 8 }}>
              <Text style={font.tiny}>¿Cuál vas a subir? Con una basta.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {g.opciones.map((o) => (
                  <Pill
                    key={o.tipo}
                    label={o.titulo}
                    active={o.tipo === elegido}
                    onPress={() => setElegido(o.tipo)}
                  />
                ))}
              </View>
              {opcion ? <Text style={font.tiny}>{opcion.descripcion}</Text> : null}
            </View>
          ) : null}

          <GhostButton
            title={subiendoTipo === opcion?.tipo ? "Subiendo…" : "Tomar foto del documento"}
            icon={<Camera color={colors.indigo} size={18} />}
            disabled={ocupado}
            onPress={conCamara}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <GhostButton
              title="Galería"
              icon={<Images color={colors.indigo} size={18} />}
              disabled={ocupado}
              onPress={conGaleria}
              style={{ flex: 1 }}
            />
            <GhostButton
              title="Archivo"
              icon={<FileUp color={colors.indigo} size={18} />}
              disabled={ocupado}
              onPress={conArchivo}
              style={{ flex: 1 }}
            />
          </View>
          {doc ? (
            <Text style={font.tiny}>
              Si subes uno nuevo, reemplaza al anterior y vuelve a revisión.
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

/* ------------------------------------------------- Acreditación sin papeles */

/**
 * Muchas personas con discapacidad no tienen credencial vigente: el trámite es
 * lento y se vence. Dejarlas fuera por un papel sería la barrera que Miparner
 * existe para quitar, así que pueden pedir una videollamada y el equipo las
 * acredita a mano.
 */
function TarjetaVideollamada({
  activa,
  disponibilidad,
  onPedida,
}: {
  activa: boolean;
  disponibilidad: string | null;
  onPedida: () => Promise<void> | void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(disponibilidad ?? "");
  const [enviando, setEnviando] = useState(false);

  async function pedir() {
    setEnviando(true);
    try {
      await api("/documentos/videollamada", {
        method: "POST",
        body: { disponibilidad: texto.trim() },
      });
      await onPedida();
      setAbierto(false);
      Alert.alert(
        "Solicitud enviada",
        "El equipo te contactará para coordinar la videollamada en los horarios que indicaste.",
      );
    } catch (e) {
      Alert.alert(
        "No pudimos enviar tu solicitud",
        e instanceof Error ? e.message : "Revisa tu conexión y vuelve a intentar.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (activa && !abierto) {
    return (
      <CardLavanda style={{ marginBottom: 14, gap: 10 }}>
        <Estado text="Videollamada solicitada" tipo="indigo" />
        <Text style={font.body}>
          El equipo se pondrá en contacto contigo para acreditar tu cuenta. No necesitas subir
          ningún documento.
        </Text>
        {disponibilidad ? (
          <Text style={font.tiny}>Tu disponibilidad: {disponibilidad}</Text>
        ) : null}
        <GhostButton title="Cambiar mi disponibilidad" onPress={() => setAbierto(true)} />
      </CardLavanda>
    );
  }

  return (
    <Card style={{ marginBottom: 14, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={[estilos.icono, { backgroundColor: colors.lavanda }]}>
          <Video color={colors.indigo} size={20} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[font.body, { fontFamily: fuente.fuerte }]}>No tengo ninguno de los dos</Text>
          <Text style={font.tiny}>
            Pide una videollamada con el equipo. Conversamos contigo, acreditamos tu cuenta a mano
            y no necesitas subir ningún documento.
          </Text>
        </View>
      </View>

      {abierto ? (
        <View>
          <CampoTexto
            label="¿Qué días y horas te vienen bien?"
            ayuda="Por ejemplo: lunes y miércoles por la tarde, después de las 16:00."
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={500}
          />
          <PrimaryButton
            title={enviando ? "Enviando…" : "Pedir videollamada"}
            icon={<Video color={colors.white} size={18} />}
            disabled={enviando || texto.trim().length < 5}
            onPress={pedir}
          />
          <View style={{ height: 10 }} />
          <GhostButton title="Mejor subo un documento" onPress={() => setAbierto(false)} />
        </View>
      ) : (
        <GhostButton
          title="Quiero una videollamada"
          icon={<Video color={colors.indigo} size={18} />}
          onPress={() => setAbierto(true)}
        />
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
