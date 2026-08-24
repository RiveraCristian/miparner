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

export const listarValidacionesQuerySchema = z.object({
  estado: z.enum(["pendiente", "aprobado", "rechazado"]).default("pendiente"),
});

/** Resolución de una cuenta. El rechazo siempre lleva motivo: la persona lo lee. */
export const resolverValidacionSchema = z
  .object({
    estado: z.enum(["aprobado", "rechazado"]),
    motivo: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.estado !== "rechazado" || (d.motivo?.length ?? 0) >= 5, {
    message: "Explica por qué se rechaza para que la persona pueda corregirlo",
    path: ["motivo"],
  });

export const revisarDocumentoSchema = z.object({
  estado: z.enum(["aprobado", "rechazado"]),
  observacion: z.string().trim().max(500).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
