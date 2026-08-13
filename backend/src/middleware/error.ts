import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/http-error";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "not_found", message: "Ruta no encontrada" } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "validation_error", message: "Datos inválidos", details: err.flatten().fieldErrors },
    });
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error("Base de datos no disponible:", err.message);
    return res.status(503).json({ error: { code: "db_unavailable", message: "Base de datos no disponible" } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: { code: "conflict", message: "Registro duplicado" } });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { code: "not_found", message: "Registro no encontrado" } });
    }
  }

  console.error("Error no controlado:", err);
  return res.status(500).json({ error: { code: "internal_error", message: "Error interno del servidor" } });
}
