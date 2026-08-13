import { Router } from "express";
import { authenticate, requireRole, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  cambiarEstadoSchema,
  candidatosQuerySchema,
  posicionSchema,
  solicitarSchema,
} from "./viajes.schemas";
import * as viajes from "./viajes.service";

const router = Router();
router.use(authenticate);

function actor(req: import("express").Request) {
  return { usuarioId: req.usuario!.usuarioId, rol: req.usuario!.rol };
}

// Solicitar viaje (solo deportista)
router.post("/", requireRole("deportista"), validate({ body: solicitarSchema }), async (req, res, next) => {
  try {
    res.status(201).json(await viajes.solicitar(actorId(req), req.body));
  } catch (err) {
    next(err);
  }
});

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
router.post("/:id/aceptar", requireRole("voluntario"), async (req, res, next) => {
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
