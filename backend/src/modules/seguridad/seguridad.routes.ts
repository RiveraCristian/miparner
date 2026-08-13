import { Router } from "express";
import { authenticate, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { otpEnviarSchema, otpValidarSchema, panicoSchema } from "./seguridad.schemas";
import * as seguridad from "./seguridad.service";

const router = Router();
router.use(authenticate);

// Botón de pánico — responde 202 (procesamiento asíncrono / difusión inmediata)
router.post("/panico", validate({ body: panicoSchema }), async (req, res, next) => {
  try {
    const resultado = await seguridad.registrarPanico({ usuarioId: actorId(req), ...req.body });
    res.status(202).json(resultado);
  } catch (err) {
    next(err);
  }
});

// OTP: enviar código
router.post("/otp/enviar", validate({ body: otpEnviarSchema }), async (req, res, next) => {
  try {
    res.json(await seguridad.enviarCodigoOtp(actorId(req), req.body.canal));
  } catch (err) {
    next(err);
  }
});

// OTP: validar código
router.post("/otp/validar", validate({ body: otpValidarSchema }), async (req, res, next) => {
  try {
    res.json(await seguridad.validarCodigoOtp(actorId(req), req.body.codigo));
  } catch (err) {
    next(err);
  }
});

export default router;
