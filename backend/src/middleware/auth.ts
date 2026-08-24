import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/http-error";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

// Verifica el Bearer token e inyecta req.usuario. Este usuario_id alimenta
// automáticamente created_by / modified_by en las escrituras.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(AppError.unauthorized("Falta el token de acceso"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.usuario = { usuarioId: payload.sub, rol: payload.rol };
    return next();
  } catch {
    return next(AppError.unauthorized("Token inválido o expirado"));
  }
}

// Restringe el acceso por rol (deportista | voluntario | admin).
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) return next(AppError.unauthorized());
    if (!roles.includes(req.usuario.rol)) return next(AppError.forbidden());
    return next();
  };
}

/**
 * Exige que la cuenta esté aprobada por el panel de administración.
 *
 * El registro deja la cuenta activa pero en estado 'pendiente': la persona
 * puede entrar, subir sus documentos y ver en qué va su solicitud, pero no
 * puede operar (pedir o aceptar acompañamientos, ponerse en línea) hasta que
 * un administrador la apruebe.
 */
export async function requireValidado(req: Request, _res: Response, next: NextFunction) {
  if (!req.usuario) return next(AppError.unauthorized());
  if (req.usuario.rol === "admin") return next();

  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId: req.usuario.usuarioId },
    select: { usuarioEstadoValidacion: true, usuarioMotivoRechazo: true },
  });
  if (!usuario) return next(AppError.unauthorized());

  if (usuario.usuarioEstadoValidacion === "aprobado") return next();

  return next(
    new AppError(
      403,
      "cuenta_no_validada",
      usuario.usuarioEstadoValidacion === "rechazado"
        ? usuario.usuarioMotivoRechazo ??
          "Tu cuenta no fue aprobada. Revisa tus documentos y vuelve a enviarlos."
        : "Tu cuenta está en revisión. Te avisamos en cuanto el equipo valide tus documentos.",
      { estadoValidacion: usuario.usuarioEstadoValidacion },
    ),
  );
}

// Ayuda para obtener el actor autenticado en los servicios.
export function actorId(req: Request): number {
  if (!req.usuario) throw AppError.unauthorized();
  return req.usuario.usuarioId;
}
