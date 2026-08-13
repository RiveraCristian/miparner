import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/http-error";
import { verifyAccessToken } from "../lib/jwt";

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

// Ayuda para obtener el actor autenticado en los servicios.
export function actorId(req: Request): number {
  if (!req.usuario) throw AppError.unauthorized();
  return req.usuario.usuarioId;
}
