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
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImagePickerResponse,
} from "react-native-image-picker";
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from "@react-native-documents/picker";
import { api, apiUpload, esMensajeParaLaPersona, type ArchivoLocal } from "./api";
import { anunciar } from "./anuncios";
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
    // Con TalkBack, lo único que cambia en pantalla es una fila de estado:
    // sin el aviso, la persona no sabe si el toque sirvió o si debe repetirlo.
    void anunciar("Subiendo el documento. Espera un momento.");
    try {
      await apiUpload(`/documentos`, archivo, { tipo });
    } catch (e) {
      setSubiendo(null);
      Alert.alert(
        "No pudimos subir el documento",
        // Solo se enseña el texto si viene escrito para la persona; un error
        // interno en inglés no le sirve de nada.
        esMensajeParaLaPersona(e) ? e.message : "Revisa tu conexión y vuelve a intentarlo.",
      );
      return;
    }

    // El documento ya está en el servidor. Si refrescar falla (la red se cae
    // justo ahora), no se puede decir que la subida falló: la pantalla se
    // pondrá al día la próxima vez que se abra.
    try {
      await refrescar();
    } catch {
      /* se reintenta al volver a la pantalla */
    } finally {
      setSubiendo(null);
    }
    Alert.alert(
      "Documento enviado",
      "Queda en revisión. Te avisamos cuando el equipo valide tu cuenta.",
    );
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

/* ------------------------------------------------- Elegir y preparar archivo */

/**
 * Tope de tamaño, en MB. Debe coincidir con `UPLOAD_MAX_MB` del backend (el
 * servidor es quien manda y vuelve a comprobarlo). Se mira también aquí para
 * no hacer esperar a nadie subiendo 15 MB por datos móviles solo para
 * enterarse al final de que no cabían.
 */
const MAX_MB = 8;

/**
 * Las fotos se reducen antes de subirlas. Un teléfono actual saca fotos de
 * 4000 px o más que pesan de 5 a 15 MB: pasaban el tope del servidor y la
 * subida fallaba. A 2048 px un carnet o un certificado se sigue leyendo
 * perfectamente y la foto queda por debajo de 1 MB.
 */
const OPCIONES_FOTO: CameraOptions = {
  mediaType: "photo",
  quality: 0.8,
  maxWidth: 2048,
  maxHeight: 2048,
  saveToPhotos: false,
};

/** Extensión → mime, para cuando el proveedor de archivos no dice el tipo. */
const MIME_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heic",
};

function extension(nombre: string): string {
  const i = nombre.lastIndexOf(".");
  return i >= 0 ? nombre.slice(i + 1).toLowerCase() : "";
}

/**
 * Nombre apto para el sistema de archivos. Algunos proveedores devuelven
 * nombres con barras o con caracteres que no caben en una ruta, y
 * `keepLocalCopy` los usa tal cual para crear la copia.
 */
function nombreSeguro(nombre: string | null, porDefecto: string): string {
  const limpio = (nombre ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return limpio || porDefecto;
}

/**
 * Pide el permiso de cámara en Android.
 *
 * Es imprescindible: el manifiesto declara `CAMERA`, y en ese caso
 * react-native-image-picker NO lo pide por su cuenta, sino que devuelve
 * `errorCode: "permission"` sin abrir la cámara (ver
 * `Utils.isCameraPermissionFulfilled` en la librería). Sin esta llamada,
 * "Tomar foto" fallaba siempre en el primer uso y mandaba a la persona a los
 * ajustes del teléfono por un permiso que nadie le había pedido.
 */
async function permisoCamara(): Promise<"si" | "no" | "nunca"> {
  if (Platform.OS !== "android") return "si";
  const permiso = PermissionsAndroid.PERMISSIONS.CAMERA;
  if (await PermissionsAndroid.check(permiso)) return "si";
  const r = await PermissionsAndroid.request(permiso, {
    title: "Permiso de cámara",
    message: "Miparner necesita la cámara para que fotografíes tu documento.",
    buttonPositive: "Permitir",
    buttonNegative: "Ahora no",
  });
  if (r === PermissionsAndroid.RESULTS.GRANTED) return "si";
  return r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? "nunca" : "no";
}

function avisarDemasiadoGrande(mb: number) {
  Alert.alert(
    "El archivo es demasiado grande",
    `Pesa ${mb.toFixed(1)} MB y el máximo es ${MAX_MB} MB. Si es una foto, elígela desde ` +
      "\"Elegir foto de la galería\": así se envía más liviana.",
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
    const permiso = await permisoCamara();
    if (permiso !== "si") {
      Alert.alert(
        "Sin permiso de cámara",
        permiso === "nunca"
          ? "Activa el permiso de cámara de Miparner en los ajustes del teléfono, o elige una foto de la galería."
          : "Para fotografiar el documento hace falta la cámara. También puedes elegir una foto de la galería.",
        permiso === "nunca"
          ? [
              { text: "Cancelar", style: "cancel" },
              { text: "Abrir ajustes", onPress: () => void Linking.openSettings() },
            ]
          : undefined,
      );
      return;
    }
    manejarImagen(await launchCamera(OPCIONES_FOTO), "cámara");
  }

  async function conGaleria() {
    manejarImagen(await launchImageLibrary({ ...OPCIONES_FOTO, selectionLimit: 1 }), "galería");
  }

  function manejarImagen(res: ImagePickerResponse, origen: "cámara" | "galería") {
    if (res.didCancel) return;
    if (res.errorCode) {
      const sinPermiso = res.errorCode === "permission";
      Alert.alert(
        origen === "cámara" ? "No pudimos abrir la cámara" : "No pudimos abrir la galería",
        sinPermiso
          ? "Da permiso de cámara a Miparner desde los ajustes del teléfono."
          : res.errorCode === "camera_unavailable"
            ? "Este teléfono no tiene una cámara disponible. Elige una foto de la galería o un archivo."
            : "Prueba eligiendo el archivo desde tu teléfono.",
        sinPermiso
          ? [
              { text: "Cancelar", style: "cancel" },
              { text: "Abrir ajustes", onPress: () => void Linking.openSettings() },
            ]
          : undefined,
      );
      return;
    }
    const a = res.assets?.[0];
    if (!a?.uri) {
      Alert.alert("No pudimos leer la foto", "Vuelve a intentarlo o elige otra imagen.");
      return;
    }
    if (a.fileSize && a.fileSize > MAX_MB * 1024 * 1024) {
      avisarDemasiadoGrande(a.fileSize / (1024 * 1024));
      return;
    }
    // Con `quality` < 1 la librería vuelve a codificar la imagen: PNG se
    // queda en PNG y todo lo demás sale como JPEG, aunque el archivo conserve
    // la extensión del original (`.heic`, `.gif`…). Se etiqueta por lo que de
    // verdad contiene; el servidor lo confirma mirando los bytes.
    const esPng = a.type === "image/png";
    const base = opcion?.tipo ?? "documento";
    entregar({
      uri: a.uri,
      name: `${base}.${esPng ? "png" : "jpg"}`,
      type: esPng ? "image/png" : "image/jpeg",
    });
  }

  async function conArchivo() {
    let f;
    try {
      [f] = await pick({ type: [types.pdf, types.images] });
    } catch (e) {
      // Cancelar no es un error: se ignora en silencio.
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert("No pudimos abrir tus archivos", "Prueba tomando una foto del documento.");
      return;
    }
    if (!f?.uri) return;

    // Algunos gestores de archivos ignoran el filtro de tipos y dejan elegir
    // cualquier cosa. Mejor decirlo ahora que tras esperar la subida.
    if (!f.hasRequestedType) {
      Alert.alert(
        "Formato no admitido",
        "Elige un PDF o una foto (JPG, PNG, WEBP o HEIC) del documento.",
      );
      return;
    }
    if (f.size && f.size > MAX_MB * 1024 * 1024) {
      avisarDemasiadoGrande(f.size / (1024 * 1024));
      return;
    }

    const base = opcion?.tipo ?? "documento";
    const nombre = nombreSeguro(f.name, `${base}.${f.type === "application/pdf" ? "pdf" : "jpg"}`);

    // El selector devuelve un `content://`. Subirlo directo falla con los
    // archivos de Drive, Google Fotos y otros proveedores en la nube: React
    // Native mide la parte con `InputStream.available()`, que ahí vale 0, y
    // OkHttp corta la subida ("Network request failed"). Era el fallo que
    // impedía terminar la validación. Copiarlo antes a la caché de la app da
    // un `file://` normal, con su tamaño real.
    let uri: string;
    try {
      const [copia] = await keepLocalCopy({
        files: [{ uri: f.uri, fileName: nombre }],
        destination: "cachesDirectory",
      });
      if (copia.status !== "success") throw new Error(copia.copyError);
      uri = copia.localUri;
    } catch {
      Alert.alert(
        "No pudimos leer el archivo",
        "Si está en Drive u otra nube, descárgalo primero al teléfono, o toma una foto del documento.",
      );
      return;
    }

    entregar({
      uri,
      name: nombre,
      // Sin tipo, se deduce de la extensión. Si tampoco hay, va como genérico
      // y el servidor decide por el contenido.
      type: f.type ?? MIME_POR_EXTENSION[extension(nombre)] ?? "application/octet-stream",
    });
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

          {/* Uno debajo de otro y con el texto completo: el lector de pantalla
              lee el título como etiqueta, y "Galería" o "Archivo" a secas no
              decían qué iba a pasar. Apilados, además, no se cortan con la
              letra grande del sistema. */}
          <GhostButton
            title="Tomar foto del documento"
            icon={<Camera color={colors.indigo} size={18} />}
            disabled={ocupado}
            onPress={conCamara}
          />
          <GhostButton
            title="Elegir foto de la galería"
            icon={<Images color={colors.indigo} size={18} />}
            disabled={ocupado}
            onPress={conGaleria}
          />
          <GhostButton
            title="Elegir archivo PDF o imagen"
            icon={<FileUp color={colors.indigo} size={18} />}
            disabled={ocupado}
            onPress={conArchivo}
          />
          {subiendoTipo && subiendoTipo === opcion?.tipo ? (
            <View
              style={estilos.subiendo}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Subiendo el documento"
              accessibilityLiveRegion="polite"
            >
              <ActivityIndicator color={colors.indigo} />
              <Text style={font.tiny}>Subiendo el documento…</Text>
            </View>
          ) : null}
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
  subiendo: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
});
