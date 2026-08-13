import { Router } from "express";
import { authenticate, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { rankingQuerySchema } from "./gamificacion.schemas";
import * as gam from "./gamificacion.service";

const router = Router();
router.use(authenticate);

// Perfil de gamificación del usuario autenticado
router.get("/perfil", async (req, res, next) => {
  try {
    res.json(await gam.getPerfil(actorId(req)));
  } catch (err) {
    next(err);
  }
});

// Progreso (formato para apps móviles)
router.get("/mi-progreso", async (req, res, next) => {
  try {
    res.json(await gam.miProgreso(actorId(req)));
  } catch (err) {
    next(err);
  }
});

// Ranking / leaderboard (acepta ?tipo= o ?rol=)
router.get("/ranking", validate({ query: rankingQuerySchema }), async (req, res, next) => {
  try {
    const tipo = (req.query.tipo ?? req.query.rol ?? "deportista") as "deportista" | "voluntario";
    res.json(await gam.ranking(tipo));
  } catch (err) {
    next(err);
  }
});

// Catálogo de premios canjeables
router.get("/premios", async (_req, res, next) => {
  try {
    res.json(await gam.listarPremios());
  } catch (err) {
    next(err);
  }
});

// Canjear un premio
router.post("/premios/:id/canjear", async (req, res, next) => {
  try {
    res.status(201).json(await gam.canjear(actorId(req), Number(req.params.id)));
  } catch (err) {
    next(err);
  }
});

export default router;
