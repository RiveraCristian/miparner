/**
 * Utilidades compartidas para grabar y mostrar audio de voz (chat y solicitud).
 */
import { Alert, Linking, NativeModules, PermissionsAndroid, Platform } from "react-native";
import {
  AudioEncoderAndroidType,
  AVEncodingOption,
  OutputFormatAndroidType,
  type AudioSet,
} from "react-native-audio-recorder-player";

/** Tope de duración de una nota de voz: 1 minuto. La grabación se corta sola
 *  al llegar y el backend además recorta el binario a esta duración. */
export const MAX_SEGS = 60;

/** Segundos → "m:ss". El contador de grabación y el de reproducción. */
export const mmss = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Grabamos AAC en contenedor m4a: lo entienden Android, iOS y el backend.
 *  Se graba sin ruta propia: el módulo nativo usa la caché de la app
 *  (`cacheDir/sound.mp4` en Android, `sound.m4a` en iOS), que no pide permiso
 *  de almacenamiento y el sistema limpia solo. */
export const AUDIO_SET: AudioSet = {
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
  AVFormatIDKeyIOS: AVEncodingOption.aac,
};

/** El archivo grabado, listo para `apiUpload` en el campo `audio`. En Android
 *  el módulo devuelve `file:///` + una ruta absoluta (`file:////data/...`);
 *  se normaliza a tres barras para no depender de cómo cada capa la interprete. */
export const archivoVoz = (uri: string) => ({
  uri: /^(file|content):\/\//.test(uri) ? uri.replace(/^file:\/\/\/+/, "file:///") : `file://${uri}`,
  name: "voz.m4a",
  type: "audio/mp4",
});

/**
 * ¿Está compilado el módulo nativo del grabador?
 *
 * Si el paquete quedó instalado sin su carpeta `android/` (pasó con una
 * instalación incompleta de node_modules), el autolinking lo omite sin avisar,
 * el APK sale sin el módulo y cada llamada falla con un TypeError que antes se
 * mostraba como "No pudimos acceder al micrófono". Comprobarlo aparte deja un
 * mensaje honesto y un log que apunta directo a la causa.
 */
export function grabadorDisponible(): boolean {
  return NativeModules.RNAudioRecorderPlayer != null;
}

export type PermisoMic = { ok: true } | { ok: false; bloqueado: boolean; mensaje: string };

/** Pide un permiso de Android y lo traduce a nuestro resultado. */
async function pedirPermisoAndroid(
  permiso: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS],
  textos: { title: string; message: string; denegado: string; bloqueado: string },
): Promise<PermisoMic> {
  // Si ya está concedido no se muestra ningún diálogo.
  if (await PermissionsAndroid.check(permiso)) return { ok: true };
  const r = await PermissionsAndroid.request(permiso, {
    title: textos.title,
    message: textos.message,
    buttonPositive: "Permitir",
    buttonNegative: "Ahora no",
  });
  if (r === PermissionsAndroid.RESULTS.GRANTED) return { ok: true };
  // NEVER_ASK_AGAIN: Android ya no vuelve a mostrar el diálogo, así que la
  // única salida es que la persona lo active en los ajustes de la app.
  const bloqueado = r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
  return { ok: false, bloqueado, mensaje: bloqueado ? textos.bloqueado : textos.denegado };
}

/**
 * Deja listos los permisos para grabar.
 *
 * En iOS el sistema pide el micrófono solo al empezar a grabar (texto en
 * NSMicrophoneUsageDescription). En Android hay que pedir RECORD_AUDIO en
 * tiempo de ejecución. En Android 9 o anterior el módulo nativo además exige
 * WRITE_EXTERNAL_STORAGE aunque grabe en la caché: si falta, rechaza la
 * grabación por su cuenta, así que lo pedimos antes para no fallar a ciegas.
 */
export async function asegurarPermisoMic(): Promise<PermisoMic> {
  if (Platform.OS !== "android") return { ok: true };
  const mic = await pedirPermisoAndroid(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: "Permiso de micrófono",
    message: "Miparner necesita el micrófono para grabar tu mensaje de voz.",
    denegado: "Necesitamos permiso del micrófono para grabar.",
    bloqueado:
      "El permiso del micrófono está desactivado. Actívalo en Ajustes > Permisos para poder grabar.",
  });
  if (!mic.ok || Number(Platform.Version) >= 29) return mic;
  return pedirPermisoAndroid(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
    title: "Permiso de almacenamiento",
    message: "En esta versión de Android, Miparner necesita este permiso para guardar la nota de voz.",
    denegado: "Necesitamos permiso de almacenamiento para guardar la nota de voz.",
    bloqueado:
      "El permiso de almacenamiento está desactivado. Actívalo en Ajustes > Permisos para poder grabar.",
  });
}

/** Abre los ajustes de la app (permisos). */
export function abrirAjustes() {
  Linking.openSettings().catch((e) => console.warn("[voz] No se pudieron abrir los ajustes", e));
}

/**
 * Versión de una línea para pantallas que solo necesitan sí/no (el chat):
 * si el permiso quedó bloqueado ofrece abrir los ajustes con un diálogo.
 */
export async function pedirPermisoMic(): Promise<boolean> {
  const p = await asegurarPermisoMic();
  if (!p.ok && p.bloqueado) {
    Alert.alert("Micrófono desactivado", p.mensaje, [
      { text: "Ahora no", style: "cancel" },
      { text: "Abrir ajustes", onPress: abrirAjustes },
    ]);
  }
  return p.ok;
}

/**
 * Traduce un fallo de `startRecorder` a un mensaje para la persona y lo deja en
 * el log (en release `console.*` llega a logcat con la etiqueta ReactNativeJS),
 * para distinguir "no hay módulo", "no hay permiso" y "el micrófono no arrancó".
 */
export function mensajeFalloGrabacion(e: unknown): string {
  const err = e as { code?: string; message?: string } | null;
  const code = err?.code ?? "";
  const msg = err?.message ?? String(e);
  if (!grabadorDisponible()) {
    console.error(
      "[voz] Falta el módulo nativo RNAudioRecorderPlayer: el binario se compiló sin él " +
        "(revisar node_modules/react-native-audio-recorder-player/android y recompilar).",
      e,
    );
    return "La grabación de voz no está disponible en esta versión de la app. Actualízala e inténtalo de nuevo.";
  }
  console.warn(`[voz] startRecorder falló (code=${code || "?"}): ${msg}`);
  // El módulo rechaza con este código cuando el sistema no le concedió permisos.
  if (/permission/i.test(code) || /permission/i.test(msg)) {
    return "Necesitamos permiso del micrófono para grabar.";
  }
  // MediaRecorder/AVAudioRecorder no arrancó: típico si hay una llamada en curso
  // u otra app tiene tomado el micrófono.
  return "No se pudo iniciar la grabación. Revisa que ninguna otra app esté usando el micrófono e inténtalo de nuevo.";
}
