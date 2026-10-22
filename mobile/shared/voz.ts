/**
 * Utilidades compartidas para grabar y mostrar audio de voz (chat y solicitud).
 */
import { PermissionsAndroid, Platform } from "react-native";
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

/** Grabamos AAC en contenedor m4a: lo entienden Android, iOS y el backend. */
export const AUDIO_SET: AudioSet = {
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
  AVFormatIDKeyIOS: AVEncodingOption.aac,
};

/** El archivo grabado, listo para `apiUpload` en el campo `audio`. */
export const archivoVoz = (uri: string) => ({
  uri: /^(file|content):\/\//.test(uri) ? uri : `file://${uri}`,
  name: "voz.m4a",
  type: "audio/mp4",
});

/** Pide el permiso de micrófono en Android (en iOS lo gestiona el sistema). */
export async function pedirPermisoMic(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: "Permiso de micrófono",
    message: "Miparner necesita el micrófono para grabar tu mensaje de voz.",
    buttonPositive: "Permitir",
    buttonNegative: "Ahora no",
  });
  return r === PermissionsAndroid.RESULTS.GRANTED;
}
