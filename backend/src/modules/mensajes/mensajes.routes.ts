import { Router } from "express";
import { authenticate, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { enviarMensajeSchema, viajeParamSchema } from "./mensajes.schemas";
import * as mensajes from "./mensajes.service";

function actor(req: import("express").Request) {
  return { usuarioId: req.usuario!.usuarioId, rol: req.usuario!.rol };
}

/**
 * Conversación de un acompañamiento.
 * Se monta anidado: /api/v1/viajes/:viajeId/mensajes
 * (mergeParams para heredar :viajeId del router padre).
 */
export const mensajesDeViajeRouter = Router({ mergeParams: true });

mensajesDeViajeRouter.get("/", validate({ params: viajeParamSchema }), async (req, res, next) => {
  try {
    res.json(await mensajes.listar(Number(req.params.viajeId), actor(req)));
  } catch (err) {
    next(err);
  }
});

mensajesDeViajeRouter.post(
  "/",
  validate({ params: viajeParamSchema, body: enviarMensajeSchema }),
  async (req, res, next) => {
    try {
      res.status(201).json(await mensajes.enviar(Number(req.params.viajeId), actor(req), req.body.texto));
    } catch (err) {
      next(err);
    }
  },
);

mensajesDeViajeRouter.post("/leidos", validate({ params: viajeParamSchema }), async (req, res, next) => {
  try {
    res.json(await mensajes.marcarLeidos(Number(req.params.viajeId), actor(req)));
  } catch (err) {
    next(err);
  }
});

/** Router global: /api/v1/mensajes */
const router = Router();
router.use(authenticate);

// Distintivo de mensajes sin leer en toda la app.
router.get("/no-leidos", async (req, res, next) => {
  try {
    res.json(await mensajes.noLeidos(actorId(req)));
  } catch (err) {
    next(err);
  }
});

export default router;
