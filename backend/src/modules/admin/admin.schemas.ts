import { z } from "zod";

export const listarUsuariosQuerySchema = z.object({
  rol: z.enum(["deportista", "voluntario", "admin"]).optional(),
});

export const estadoUsuarioSchema = z.object({
  activo: z.boolean(),
});

export const validarVoluntarioSchema = z.object({
  validado: z.boolean(),
});

export const atenderPanicoSchema = z.object({
  estado: z.enum(["atendida", "falsa"]),
});
