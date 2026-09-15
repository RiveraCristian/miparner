import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { authenticate, actorId, requireRole } from "../../middleware/auth";
import {
  actualizarPerfilSchema,
  cambiarPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  perfilDeportistaSchema,
  eliminarCuentaSchema,
} from "./auth.schemas";
import * as authService from "./auth.service";
import { eliminarMiCuenta } from "./eliminar-cuenta.service";

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
    res.status(201).json(
      await authService.register(req.body, {
        canal: (req.get("x-miparner-canal") ?? "web").slice(0, 30),
        ip: (req.ip ?? "").slice(0, 45),
      }),
    );
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

// Caracterización del deportista (se edita desde el perfil de la app).
router.patch(
  "/me/perfil-deportista",
  authenticate,
  requireRole("deportista"),
  validate({ body: perfilDeportistaSchema }),
  async (req, res, next) => {
    try {
      res.json(await authService.actualizarPerfilDeportista(actorId(req), req.body));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Borrar la propia cuenta.
 *
 * Apple exige que toda app con registro permita borrar la cuenta desde dentro
 * (directriz 5.1.1), y la Ley 21.719 reconoce el derecho de supresión. Lleva
 * limitador porque es irreversible.
 */
router.delete(
  "/me",
  authLimiter,
  authenticate,
  validate({ body: eliminarCuentaSchema }),
  async (req, res, next) => {
    try {
      res.json(await eliminarMiCuenta(actorId(req), req.body.password));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
