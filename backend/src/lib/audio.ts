/**
 * Compresión de las notas de voz al guardarlas.
 *
 * El dispositivo sube el audio tal cual lo graba (AAC/m4a, a veces a bitrate
 * alto). Antes de dejarlo en disco lo recomprimimos a voz mono de 32 kbps y lo
 * recortamos a 60 s como máximo: queda ~1/5 del tamaño (importa porque
 * `uploads/` es efímero en el contenedor y pasa por el ancho de banda del
 * droplet) y el tope de duración deja de depender de que el cliente sea honesto.
 *
 * Se mantiene el contenedor m4a / `audio/mp4`, que es lo que ya reproducen la
 * app (Android/iOS) y el panel (`<audio>`), así no cambia nada aguas abajo.
 *
 * Es best-effort: si ffmpeg no está o falla, se devuelve el archivo original
 * sin tocar y el mensaje se envía igual (la feature degrada, nunca rompe).
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import ffmpegPath from "ffmpeg-static";
import { eliminarArchivo, rutaDe } from "./uploads";

/** Tope duro de duración de cualquier nota de voz. */
export const MAX_SEGS_AUDIO = 60;

export interface AudioGuardado {
  archivo: string;
  mime: string;
  duracion: number;
}

const clampDuracion = (secs: number) =>
  Math.min(MAX_SEGS_AUDIO, Math.max(1, Math.round(secs || 0)));

/** Ejecuta ffmpeg y resuelve a true si terminó con código 0. */
function ejecutarFfmpeg(args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ffmpegPath) return resolve(false);
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
}

/**
 * Recomprime el audio ya guardado por multer. Devuelve el nuevo archivo (y
 * borra el original) o, si la compresión falla, el original intacto con la
 * duración clampada al tope.
 */
export async function comprimirAudio(audio: AudioGuardado): Promise<AudioGuardado> {
  const duracion = clampDuracion(audio.duracion);
  const entrada = rutaDe(audio.archivo);
  const salidaNombre = `${randomUUID()}.m4a`;
  const salida = rutaDe(salidaNombre);

  const ok = await ejecutarFfmpeg([
    "-y",
    "-i", entrada,
    "-vn", // sin video/carátula
    "-ac", "1", // mono
    "-c:a", "aac",
    "-b:a", "32k",
    "-t", String(MAX_SEGS_AUDIO), // recorte duro a 60 s
    "-movflags", "+faststart",
    salida,
  ]);

  if (!ok) {
    console.warn(`[AUDIO] No se pudo comprimir ${audio.archivo}; se guarda el original.`);
    eliminarArchivo(salidaNombre); // limpia una posible salida parcial
    return { archivo: audio.archivo, mime: audio.mime, duracion };
  }

  eliminarArchivo(audio.archivo);
  return { archivo: salidaNombre, mime: "audio/mp4", duracion };
}
