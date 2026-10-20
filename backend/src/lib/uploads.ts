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
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${MIMES_PERMITIDOS[file.mimetype] ?? ""}`);
  },
});

/** Middleware para un único archivo en el campo `archivo`. */
export const recibirDocumento = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!MIMES_PERMITIDOS[file.mimetype]) {
      return cb(
        AppError.badRequest(
          "Formato no admitido. Sube una foto (JPG, PNG o WEBP) o un PDF del documento.",
        ),
      );
    }
    cb(null, true);
  },
}).single("archivo");

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
