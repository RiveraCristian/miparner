import { Router } from "express";
import { authenticate, requireRole, requireValidado, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { AppError } from "../../lib/http-error";
import { recibirAudio } from "../../lib/uploads";
import {
  cambiarEstadoSchema,
  candidatosQuerySchema,
  comentarioVozSchema,
  posicionSchema,
  reportarVozSchema,
  solicitarSchema,
} from "./viajes.schemas";
import { mensajesDeViajeRouter } from "../mensajes/mensajes.routes";
import * as viajes from "./viajes.service";

const router = Router();
router.use(authenticate);

// Conversación entre el deportista y su voluntario.
router.use("/:viajeId/mensajes", mensajesDeViajeRouter);

function actor(req: import("express").Request) {
  return { usuarioId: req.usuario!.usuarioId, rol: req.usuario!.rol };
}

// Solicitar viaje (solo deportista)
router.post("/", requireRole("deportista"), requireValidado, validate({ body: solicitarSchema }), async (req, res, next) => {
  try {
    res.status(201).json(await viajes.solicitar(actorId(req), req.body));
  } catch (err) {
    next(err);
  }
});

// Adjuntar la nota de voz de la solicitud (solo el deportista dueño).
// multipart/form-data: campo `audio` + campo `duracion`.
router.post(
  "/:id/comentario-voz",
  requireRole("deportista"),
  requireValidado,
  recibirAudio,
  async (req, res, next) => {
    try {
      if (!req.file) throw AppError.badRequest("Adjunta el audio de la nota");
      const { duracion } = comentarioVozSchema.parse(req.body);
      res.status(201).json(
        await viajes.adjuntarComentarioVoz(Number(req.params.id), actorId(req), {
          archivo: req.file.filename,
          mime: req.file.mimetype,
          duracion,
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// Escuchar la nota de voz de la solicitud (dueño, voluntario o admin).
router.get("/:id/comentario-voz", async (req, res, next) => {
  try {
    const { ruta, mime } = await viajes.comentarioVozDe(Number(req.params.id), actor(req));
    res.type(mime);
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(ruta, (err) => {
      if (err) next(AppError.notFound("La nota de voz ya no está disponible"));
    });
  } catch (err) {
    next(err);
  }
});

// Reportar la nota de voz de la solicitud por lenguaje inapropiado.
router.post(
  "/:id/comentario-voz/reportar",
  validate({ body: reportarVozSchema }),
  async (req, res, next) => {
    try {
      res.status(201).json(
        await viajes.reportarComentarioVoz(Number(req.params.id), actor(req), req.body.motivo),
      );
    } catch (err) {
      next(err);
    }
  },
);

// Mis viajes (deportista o voluntario)
router.get("/", async (req, res, next) => {
  try {
    res.json(await viajes.listarMios(actor(req)));
  } catch (err) {
    next(err);
  }
});

// Detalle
router.get("/:id", async (req, res, next) => {
  try {
    res.json(await viajes.getDetalle(Number(req.params.id), actor(req)));
  } catch (err) {
    next(err);
  }
});

// Candidatos cercanos (matchmaking)
router.get("/:id/candidatos", validate({ query: candidatosQuerySchema }), async (req, res, next) => {
  try {
    const radio = Number(req.query.radio ?? 5000);
    res.json(await viajes.candidatos(Number(req.params.id), actor(req), radio));
  } catch (err) {
    next(err);
  }
});

// Voluntario acepta el viaje
router.post("/:id/aceptar", requireRole("voluntario"), requireValidado, async (req, res, next) => {
  try {
    res.json(await viajes.aceptar(Number(req.params.id), actorId(req)));
  } catch (err) {
    next(err);
  }
});

// Cambiar estado del viaje
router.patch("/:id/estado", validate({ body: cambiarEstadoSchema }), async (req, res, next) => {
  try {
    res.json(await viajes.cambiarEstado(Number(req.params.id), actor(req), req.body.estado));
  } catch (err) {
    next(err);
  }
});

// Registrar posición
router.post("/:id/posicion", validate({ body: posicionSchema }), async (req, res, next) => {
  try {
    res.json(await viajes.registrarPosicion(Number(req.params.id), actor(req), req.body.lat, req.body.lng));
  } catch (err) {
    next(err);
  }
});

// Soft delete
router.delete("/:id", async (req, res, next) => {
  try {
    res.json(await viajes.eliminar(Number(req.params.id), actor(req)));
  } catch (err) {
    next(err);
  }
});

export default router;
