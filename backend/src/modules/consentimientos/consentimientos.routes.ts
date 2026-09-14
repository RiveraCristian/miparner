import { Router, type Request } from "express";
import { z } from "zod";
import { authenticate, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  DERECHOS_TITULAR,
  VERSION_POLITICA,
  finalidadesDeRol,
} from "./consentimientos.catalogo";
import * as consentimientos from "./consentimientos.service";

const router = Router();

/** Canal e IP quedan registrados junto a cada decisión, como exige la ley. */
function contexto(req: Request) {
  return {
    canal: (req.get("x-miparner-canal") ?? "web").slice(0, 30),
    ip: (req.ip ?? "").slice(0, 45),
  };
}

export const decisionesSchema = z.object({
  decisiones: z
    .array(z.object({ finalidad: z.string().min(1).max(60), otorgado: z.boolean() }))
    .min(1)
    .max(20),
});

const revocarSchema = z.object({
  finalidad: z.string().min(1).max(60),
});

const rolQuerySchema = z.object({
  rol: z.enum(["deportista", "voluntario"]).default("deportista"),
});

/* --------------------------------------------------------------- Públicas */

/**
 * Textos que hay que mostrar ANTES de crear la cuenta. Sin autenticación a
 * propósito: quien todavía no se registró tiene derecho a leer qué se hará con
 * sus datos antes de entregarlos.
 */
router.get("/finalidades", validate({ query: rolQuerySchema }), (req, res) => {
  res.json({
    version: VERSION_POLITICA,
    derechos: DERECHOS_TITULAR,
    finalidades: finalidadesDeRol(String(req.query.rol ?? "deportista")),
  });
});

/* ------------------------------------------------------------ Autenticadas */

router.use(authenticate);

/** Qué tengo autorizado ahora mismo. */
router.get("/me", async (req, res, next) => {
  try {
    res.json(await consentimientos.vigentes(actorId(req)));
  } catch (err) {
    next(err);
  }
});

/** Cambiar decisiones (por ejemplo, activar avisos opcionales). */
router.post("/me", validate({ body: decisionesSchema }), async (req, res, next) => {
  try {
    res.json(await consentimientos.registrar(actorId(req), req.body.decisiones, contexto(req)));
  } catch (err) {
    next(err);
  }
});

/** Revocar una finalidad. Si es obligatoria, la cuenta queda desactivada. */
router.post("/me/revocar", validate({ body: revocarSchema }), async (req, res, next) => {
  try {
    res.json(await consentimientos.revocar(actorId(req), req.body.finalidad, contexto(req)));
  } catch (err) {
    next(err);
  }
});

/** Derechos de acceso y portabilidad: descarga de todos mis datos. */
router.get("/me/mis-datos", async (req, res, next) => {
  try {
    const datos = await consentimientos.exportarDatos(actorId(req));
    res.setHeader("Content-Disposition", 'attachment; filename="miparner-mis-datos.json"');
    res.type("application/json").send(JSON.stringify(datos, null, 2));
  } catch (err) {
    next(err);
  }
});

export default router;
