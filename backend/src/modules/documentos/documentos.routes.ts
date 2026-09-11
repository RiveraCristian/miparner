import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { MulterError } from "multer";
import { authenticate, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { AppError } from "../../lib/http-error";
import { env } from "../../config/env";
import { eliminarArchivo, recibirDocumento } from "../../lib/uploads";
import { documentosDelRol } from "./documentos.catalogo";
import { idParamSchema, subirDocumentoSchema } from "./documentos.schemas";
import * as documentos from "./documentos.service";

const router = Router();
router.use(authenticate);

// Subir documentos es caro y sensible: se limita por IP.
const subidaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Demasiadas subidas, prueba más tarde" } },
});

/** Envuelve a multer para que sus errores viajen como AppError. */
function recibirArchivo(req: Request, res: Response, next: NextFunction) {
  recibirDocumento(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          AppError.badRequest(`El archivo supera el máximo de ${env.UPLOAD_MAX_MB} MB`),
        );
      }
      return next(AppError.badRequest("No pudimos recibir el archivo"));
    }
    if (err) return next(err);
    next();
  });
}

// Qué documentos me piden y en qué va mi validación.
router.get("/requeridos", async (req, res, next) => {
  try {
    res.json(await documentos.estadoValidacion(actorId(req)));
  } catch (err) {
    next(err);
  }
});

// Catálogo por rol (sin datos personales): útil antes de terminar el registro.
router.get("/catalogo", (req, res) => {
  res.json(documentosDelRol(req.usuario!.rol));
});

router.get("/me", async (req, res, next) => {
  try {
    res.json(await documentos.listarMios(actorId(req)));
  } catch (err) {
    next(err);
  }
});

// Subida (multipart/form-data: campo `archivo` + campo `tipo`).
router.post("/", subidaLimiter, recibirArchivo, validate({ body: subirDocumentoSchema }), async (req, res, next) => {
  try {
    if (!req.file) throw AppError.badRequest("Adjunta el archivo del documento");
    res.status(201).json(await documentos.subir(actorId(req), req.body.tipo, req.file));
  } catch (err) {
    next(err);
  }
});

// Descarga del binario (dueño o administrador).
router.get("/:id/archivo", validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { ruta, mime, nombre } = await documentos.archivoDe(Number(req.params.id), {
      usuarioId: req.usuario!.usuarioId,
      rol: req.usuario!.rol,
    });
    res.type(mime);
    // `inline`: el panel lo previsualiza sin forzar una descarga.
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(nombre)}"`);
    res.sendFile(ruta, (err) => {
      if (err) next(AppError.notFound("El archivo ya no está disponible"));
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await documentos.eliminar(Number(req.params.id), actorId(req)));
  } catch (err) {
    next(err);
  }
});

/**
 * Si algo falla después de recibir el archivo (validación del tipo, permisos,
 * base de datos), el binario ya está en disco: se descarta para no dejar
 * huérfanos que nadie va a poder consultar ni borrar.
 */
router.use((err: unknown, req: Request, _res: Response, next: NextFunction) => {
  if (req.file) eliminarArchivo(req.file.filename);
  next(err);
});

export default router;
