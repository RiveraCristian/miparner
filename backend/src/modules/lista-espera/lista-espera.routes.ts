import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticate, requireRole, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as espera from "./lista-espera.service";

/* --------------------------------------------------------------- Público */

export const listaEsperaPublicaRouter = Router();

// Formulario abierto en internet: el límite es lo único que impide que se
// llene de basura automatizada.
const limitador = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: { code: "rate_limited", message: "Demasiados envíos. Prueba más tarde." },
  },
});

const apuntarseSchema = z.object({
  nombre: z.string().trim().min(2, "Dinos cómo te llamas").max(255),
  correo: z.string().trim().email("Revisa el correo").max(255),
  telefono: z.string().trim().max(30).optional().or(z.literal("")),
  comuna: z.string().trim().max(120).optional().or(z.literal("")),
  interes: z.enum(["deportista", "voluntario", "organizacion", "otro"]),
  mensaje: z.string().trim().max(1000).optional().or(z.literal("")),
  // Casilla obligatoria: sin autorización no se guarda nada.
  aceptaContacto: z.literal(true, {
    errorMap: () => ({ message: "Necesitamos tu autorización para escribirte" }),
  }),
});

listaEsperaPublicaRouter.post("/", limitador, validate({ body: apuntarseSchema }), async (req, res, next) => {
  try {
    res.status(201).json(
      await espera.apuntarse({
        ...req.body,
        ip: req.ip,
      }),
    );
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------- Panel */

const router = Router();
router.use(authenticate, requireRole("admin"));

router.get("/", validate({ query: z.object({ estado: z.string().optional() }) }), async (req, res, next) => {
  try {
    res.json(await espera.listar(req.query.estado as string | undefined));
  } catch (err) {
    next(err);
  }
});

router.get("/resumen", async (_req, res, next) => {
  try {
    res.json(await espera.resumen());
  } catch (err) {
    next(err);
  }
});

const marcarSchema = z.object({
  estado: z.enum(["nuevo", "contactado", "convertido", "descartado"]),
  nota: z.string().trim().max(500).optional(),
});

router.patch(
  "/:id",
  validate({ params: z.object({ id: z.coerce.number().int().positive() }), body: marcarSchema }),
  async (req, res, next) => {
    try {
      res.json(await espera.marcar(actorId(req), Number(req.params.id), req.body.estado, req.body.nota));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
