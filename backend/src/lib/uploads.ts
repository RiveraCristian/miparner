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
import multer from "multer";
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
