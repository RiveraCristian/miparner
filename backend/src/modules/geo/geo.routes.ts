import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as geo from "./geo.service";

const router = Router();
router.use(authenticate);

// Se escribe letra a letra desde la app, así que el límite es generoso; lo que
// protege a Nominatim de verdad es el freno y la caché del servicio.
const limitador = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Demasiadas búsquedas seguidas" } },
});

const buscarSchema = z.object({
  q: z.string().trim().min(3, "Escribe al menos tres letras").max(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

router.get("/buscar", limitador, validate({ query: buscarSchema }), async (req, res, next) => {
  try {
    const { q, lat, lng } = req.query as unknown as { q: string; lat?: number; lng?: number };
    const cerca = lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
    res.json(await geo.buscarDireccion(q, cerca));
  } catch (err) {
    next(err);
  }
});

export default router;
