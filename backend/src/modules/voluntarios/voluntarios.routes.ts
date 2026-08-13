import { Router } from "express";
import { authenticate, requireRole, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { estadoSchema, ubicacionSchema } from "./voluntarios.schemas";
import * as voluntarios from "./voluntarios.service";

const router = Router();

router.use(authenticate, requireRole("voluntario"));

// Interruptor en línea / fuera de línea
router.patch("/me/estado", validate({ body: estadoSchema }), async (req, res, next) => {
  try {
    res.json(await voluntarios.setEstado(actorId(req), req.body.enLinea));
  } catch (err) {
    next(err);
  }
});

// Reporte de ubicación (coordenadas en segundo plano). PATCH y PUT equivalentes.
const actualizarUbicacion = [
  validate({ body: ubicacionSchema }),
  async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    try {
      res.json(await voluntarios.setUbicacion(actorId(req), req.body.lat, req.body.lng));
    } catch (err) {
      next(err);
    }
  },
] as const;
router.patch("/me/ubicacion", ...actualizarUbicacion);
router.put("/me/ubicacion", ...actualizarUbicacion);

// Viajes solicitados cercanos al voluntario
router.get("/me/solicitudes", async (req, res, next) => {
  try {
    const radio = Number(req.query.radio ?? 8000);
    res.json(await voluntarios.solicitudesCercanas(actorId(req), radio));
  } catch (err) {
    next(err);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    res.json(await voluntarios.getPerfil(actorId(req)));
  } catch (err) {
    next(err);
  }
});

export default router;
