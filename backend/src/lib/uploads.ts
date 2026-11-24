/**
 * Recepción de documentos de validación.
 *
 * Los archivos NO se guardan en la base: en disco queda el binario con un
 * nombre aleatorio y en `usuario_documento` el metadato. El nombre original
 * que trae el dispositivo nunca toca el sistema de archivos (evita rutas
 * relativas y colisiones).
 *
 * En producción sobre Cloud Run el contenedor es efímero: `UPLOADS_DIR` debe
 * apuntar a un volumen montado o migrarse a Cloud Storage. La única parte a
 * cambiar es `rutaDe` / el storage de este archivo.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { env } from "../config/env";
import { AppError } from "./http-error";

/** Tipos aceptados: foto del documento o PDF escaneado. */
const MIMES_PERMITIDOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
};

/**
 * Nombres distintos para los mismos formatos. Los proveedores de archivos de
 * Android no se ponen de acuerdo: hay galerías que dicen `image/jpg` y
 * teléfonos que guardan las fotos como `image/heif`. Rechazarlos por el nombre
 * dejaba a la persona sin poder subir una foto perfectamente válida.
 */
const ALIAS_MIME: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/heif": "image/heic",
  "image/heic-sequence": "image/heic",
  "image/heif-sequence": "image/heic",
  "application/x-pdf": "application/pdf",
};

/**
 * El dispositivo no supo decir qué es (pasa con archivos de Drive o de
 * WhatsApp). No se rechaza de entrada: decide el contenido, en
 * `verificarDocumento`.
 */
const MIMES_GENERICOS = new Set(["", "application/octet-stream", "binary/octet-stream"]);

function normalizarMime(mime: string | undefined): string {
  const m = (mime ?? "").trim().toLowerCase();
  return ALIAS_MIME[m] ?? m;
}

const MENSAJE_FORMATO =
  "Formato no admitido. Sube una foto (JPG, PNG, WEBP o HEIC) o un PDF del documento.";

export function asegurarDirectorio() {
  fs.mkdirSync(env.uploadsDir, { recursive: true });
}

/** Ruta absoluta de un archivo ya almacenado. */
export function rutaDe(archivo: string): string {
  // `path.basename` corta cualquier intento de salir del directorio.
  return path.join(env.uploadsDir, path.basename(archivo));
}

export function eliminarArchivo(archivo: string) {
  fs.rm(rutaDe(archivo), { force: true }, () => {
    /* el borrado del binario es best-effort: el registro ya quedó marcado */
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    asegurarDirectorio();
    cb(null, env.uploadsDir);
  },
  // Sin extensión todavía: la pone `verificarDocumento` cuando sabe, por el
  // contenido, qué es de verdad.
  filename: (_req, _file, cb) => {
    cb(null, randomUUID());
  },
});

/** Middleware para un único archivo en el campo `archivo`. */
export const recibirDocumento = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const mime = normalizarMime(file.mimetype);
    // Un tipo declarado y ajeno (vídeo, Word, ZIP…) se corta aquí, sin
    // escribir nada en disco. Los genéricos pasan y los juzga el contenido.
    if (!MIMES_PERMITIDOS[mime] && !MIMES_GENERICOS.has(mime)) {
      return cb(AppError.badRequest(MENSAJE_FORMATO));
    }
    cb(null, true);
  },
}).single("archivo");

/**
 * Qué es el archivo según sus primeros bytes, no según lo que dice el
 * teléfono. El mime que manda el dispositivo es una pista y a veces miente:
 * el selector de fotos de Android recomprime a JPEG pero conserva el nombre
 * `.heic`, y los archivos de la nube llegan como `application/octet-stream`.
 * Mirar la firma es a la vez más tolerante con esos casos y más estricto con
 * lo que de verdad importa: que no se guarde nada que no sea una imagen o un
 * PDF.
 */
function detectarTipo(cabecera: Buffer): string | null {
  const ascii = (desde: number, hasta: number) => cabecera.subarray(desde, hasta).toString("latin1");

  if (cabecera[0] === 0xff && cabecera[1] === 0xd8 && cabecera[2] === 0xff) return "image/jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  // HEIC/HEIF: caja `ftyp` en el byte 4 con una marca de la familia HEIF.
  if (ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|heif)$/.test(ascii(8, 12))) {
    return "image/heic";
  }
  // La especificación de PDF admite basura antes de la cabecera dentro del
  // primer KB, y algunos escáneres la dejan.
  if (ascii(0, cabecera.length).includes("%PDF-")) return "application/pdf";
  return null;
}

/**
 * Va justo después de `recibirDocumento`. Comprueba el contenido real del
 * archivo, le pone la extensión que le corresponde y corrige `mimetype`, que
 * es lo que se guarda y lo que usa el panel para previsualizarlo.
 */
export async function verificarDocumento(req: Request, _res: Response, next: NextFunction) {
  const archivo = req.file;
  if (!archivo) return next();

  try {
    const cabecera = Buffer.alloc(1024);
    const fh = await fs.promises.open(archivo.path, "r");
    let leidos = 0;
    try {
      ({ bytesRead: leidos } = await fh.read(cabecera, 0, cabecera.length, 0));
    } finally {
      await fh.close();
    }

    const mime = leidos > 0 ? detectarTipo(cabecera.subarray(0, leidos)) : null;
    if (!mime) {
      eliminarArchivo(archivo.filename);
      return next(
        AppError.badRequest(
          leidos === 0
            ? "El archivo llegó vacío. Vuelve a elegirlo e inténtalo otra vez."
            : MENSAJE_FORMATO,
        ),
      );
    }

    const nombre = `${path.parse(archivo.filename).name}${MIMES_PERMITIDOS[mime]}`;
    const destino = rutaDe(nombre);
    await fs.promises.rename(archivo.path, destino);
    archivo.filename = nombre;
    archivo.path = destino;
    archivo.mimetype = mime;
    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Audio de los mensajes de voz del chat. Mismo disco y mismo esquema de nombre
// aleatorio que los documentos; solo cambian los formatos aceptados. Los
// grabadores nativos entregan m4a/aac en Android/iOS; aceptamos además los
// contenedores habituales por si el dispositivo reporta otro mime.
// ---------------------------------------------------------------------------
const MIMES_AUDIO: Record<string, string> = {
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/aacp": ".aac",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
};

const storageAudio = multer.diskStorage({
  destination: (_req, _file, cb) => {
    asegurarDirectorio();
    cb(null, env.uploadsDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${MIMES_AUDIO[file.mimetype] ?? ".m4a"}`);
  },
});

/** Middleware para un único mensaje de voz en el campo `audio`. */
export const recibirAudioMensaje = multer({
  storage: storageAudio,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!MIMES_AUDIO[file.mimetype]) {
      return cb(AppError.badRequest("Formato de audio no admitido"));
    }
    cb(null, true);
  },
}).single("audio");

/**
 * Envuelve a `recibirAudioMensaje` para que los errores de multer viajen como
 * AppError. Lo comparten el chat de voz y la nota de voz de la solicitud.
 */
export function recibirAudio(req: Request, res: Response, next: NextFunction) {
  recibirAudioMensaje(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(AppError.badRequest(`El audio supera el máximo de ${env.UPLOAD_MAX_MB} MB`));
      }
      return next(AppError.badRequest("No pudimos recibir el audio"));
    }
    if (err) return next(err);
    next();
  });
}
