import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { authenticate, actorId } from "../../middleware/auth";
import {
  actualizarPerfilSchema,
  cambiarPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schemas";
import * as authService from "./auth.service";

const router = Router();

// Limita intentos de login/registro para mitigar fuerza bruta.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Demasiados intentos, prueba más tarde" } },
});

router.post("/register", authLimiter, validate({ body: registerSchema }), async (req, res, next) => {
  try {
    res.status(201).json(await authService.register(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/login", authLimiter, validate({ body: loginSchema }), async (req, res, next) => {
  try {
    res.json(await authService.login(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", validate({ body: refreshSchema }), async (req, res, next) => {
  try {
    res.json(await authService.refresh(req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    res.json(await authService.me(actorId(req)));
  } catch (err) {
    next(err);
  }
});

// Edita la propia cuenta.
router.patch("/me", authenticate, validate({ body: actualizarPerfilSchema }), async (req, res, next) => {
  try {
    res.json(await authService.actualizarPerfil(actorId(req), req.body));
  } catch (err) {
    next(err);
  }
});

// Cambia la propia contraseña.
router.patch("/password", authenticate, validate({ body: cambiarPasswordSchema }), async (req, res, next) => {
  try {
    res.json(await authService.cambiarPassword(actorId(req), req.body.actual, req.body.nueva));
  } catch (err) {
    next(err);
  }
});

export default router;
