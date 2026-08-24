import { Router } from "express";
import { authenticate, requireRole, actorId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  atenderPanicoSchema,
  estadoUsuarioSchema,
  idParamSchema,
  listarUsuariosQuerySchema,
  listarValidacionesQuerySchema,
  resolverValidacionSchema,
  revisarDocumentoSchema,
  validarVoluntarioSchema,
} from "./admin.schemas";
import * as admin from "./admin.service";

const router = Router();
router.use(authenticate, requireRole("admin"));

// Usuarios (CRUD básico)
router.get("/usuarios", validate({ query: listarUsuariosQuerySchema }), async (req, res, next) => {
  try {
    res.json(await admin.listarUsuarios(req.query.rol as string | undefined));
  } catch (err) {
    next(err);
  }
});

const cambiarActivo = [
  validate({ body: estadoUsuarioSchema }),
  async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    try {
      res.json(await admin.setEstadoUsuario(Number(req.params.id), req.body.activo));
    } catch (err) {
      next(err);
    }
  },
] as const;
// Activar/desactivar usuario. /estado y /activo son equivalentes.
router.patch("/usuarios/:id/estado", ...cambiarActivo);
router.patch("/usuarios/:id/activo", ...cambiarActivo);

// --- Validación de cuentas (deportistas y voluntarios) ---

// Cola de revisión. Por defecto, las cuentas pendientes.
router.get("/validaciones", validate({ query: listarValidacionesQuerySchema }), async (req, res, next) => {
  try {
    res.json(await admin.listarValidaciones(String(req.query.estado ?? "pendiente")));
  } catch (err) {
    next(err);
  }
});

// Aprobar o rechazar la cuenta completa.
router.patch(
  "/usuarios/:id/validacion",
  validate({ params: idParamSchema, body: resolverValidacionSchema }),
  async (req, res, next) => {
    try {
      res.json(
        await admin.resolverValidacion(
          actorId(req),
          Number(req.params.id),
          req.body.estado,
          req.body.motivo,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

// Revisar un documento suelto (permite pedir de nuevo solo ese).
router.patch(
  "/documentos/:id",
  validate({ params: idParamSchema, body: revisarDocumentoSchema }),
  async (req, res, next) => {
    try {
      res.json(
        await admin.revisarDocumento(
          actorId(req),
          Number(req.params.id),
          req.body.estado,
          req.body.observacion,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

// Validación rápida del perfil de voluntario (interruptor heredado)
router.patch("/voluntarios/:id/validar", validate({ body: validarVoluntarioSchema }), async (req, res, next) => {
  try {
    res.json(await admin.validarVoluntario(actorId(req), Number(req.params.id), req.body.validado));
  } catch (err) {
    next(err);
  }
});

// Auditoría de viajes
router.get("/viajes", async (_req, res, next) => {
  try {
    res.json(await admin.auditarViajes());
  } catch (err) {
    next(err);
  }
});

// Log de pánico
router.get("/panicos", async (_req, res, next) => {
  try {
    res.json(await admin.logPanicos());
  } catch (err) {
    next(err);
  }
});

router.patch("/panicos/:id", validate({ body: atenderPanicoSchema }), async (req, res, next) => {
  try {
    res.json(await admin.atenderPanico(actorId(req), Number(req.params.id), req.body.estado));
  } catch (err) {
    next(err);
  }
});

// Métricas de flota
router.get("/metricas", async (_req, res, next) => {
  try {
    res.json(await admin.metricas());
  } catch (err) {
    next(err);
  }
});

export default router;
