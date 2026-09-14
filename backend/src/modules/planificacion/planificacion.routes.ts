import { Router } from "express";
import { z } from "zod";
import { actorId, authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  actualizarBloqueSchema,
  crearBloqueSchema,
  guardarPlanSchema,
  idParamSchema,
  periodoParamSchema,
} from "./planificacion.schemas";
import * as plan from "./planificacion.service";

const router = Router();

// La agenda es del deportista: solo él la ve y la edita. El voluntario no
// necesita saber cuándo entrena alguien a quien todavía no acompaña.
router.use(authenticate, requireRole("deportista"));

/** Resumen del año, para la pantalla de logros. */
router.get(
  "/resumen/:anio",
  validate({ params: z.object({ anio: z.coerce.number().int().min(2024).max(2100) }) }),
  async (req, res, next) => {
    try {
      res.json(await plan.resumenAnual(actorId(req), Number(req.params.anio)));
    } catch (err) {
      next(err);
    }
  },
);

/** Plan de un mes con sus entrenamientos y el avance. */
router.get("/:anio/:mes", validate({ params: periodoParamSchema }), async (req, res, next) => {
  try {
    res.json(await plan.obtener(actorId(req), Number(req.params.anio), Number(req.params.mes)));
  } catch (err) {
    next(err);
  }
});

/** Crear el plan del mes o cambiar su objetivo. */
router.put(
  "/:anio/:mes",
  validate({ params: periodoParamSchema, body: guardarPlanSchema }),
  async (req, res, next) => {
    try {
      res.json(
        await plan.guardar(actorId(req), Number(req.params.anio), Number(req.params.mes), req.body),
      );
    } catch (err) {
      next(err);
    }
  },
);

/** Agregar un entrenamiento a la agenda del mes. */
router.post(
  "/:anio/:mes/bloques",
  validate({ params: periodoParamSchema, body: crearBloqueSchema }),
  async (req, res, next) => {
    try {
      res.status(201).json(
        await plan.agregarBloque(
          actorId(req),
          Number(req.params.anio),
          Number(req.params.mes),
          req.body,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

/** Cambiar un entrenamiento, o marcarlo cumplido u omitido. */
router.patch(
  "/bloques/:id",
  validate({ params: idParamSchema, body: actualizarBloqueSchema }),
  async (req, res, next) => {
    try {
      res.json(await plan.actualizarBloque(Number(req.params.id), actorId(req), req.body));
    } catch (err) {
      next(err);
    }
  },
);

router.delete("/bloques/:id", validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await plan.eliminarBloque(Number(req.params.id), actorId(req)));
  } catch (err) {
    next(err);
  }
});

export default router;
