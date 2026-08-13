import { z } from "zod";

export const rankingQuerySchema = z.object({
  rol: z.enum(["deportista", "voluntario"]).optional(),
  tipo: z.enum(["deportista", "voluntario"]).optional(),
});

export const premioSchema = z.object({
  nombre: z.string().min(2).max(150),
  descripcion: z.string().max(255).optional(),
  costoPuntos: z.number().int().min(1),
  stock: z.number().int().min(0).default(0),
});
