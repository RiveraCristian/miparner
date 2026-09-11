import { z } from "zod";

export const listarUsuariosQuerySchema = z.object({
  rol: z.enum(["deportista", "voluntario", "admin"]).optional(),
});

export const estadoUsuarioSchema = z.object({
  activo: z.boolean(),
});

/** Alta de una cuenta desde el panel. */
export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(255),
  correo: z.string().trim().email(),
  password: z.string().min(8).max(128),
  telefono: z.string().trim().min(6).max(30).optional(),
  rol: z.enum(["deportista", "voluntario", "admin"]),
});

/** Edición de los datos de una cuenta desde el panel. Todos los campos son
 *  opcionales, pero debe venir al menos uno. El teléfono admite null para borrarlo. */
export const actualizarUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(2).max(255).optional(),
    correo: z.string().trim().email().optional(),
    telefono: z.string().trim().min(6).max(30).nullable().optional(),
    rol: z.enum(["deportista", "voluntario", "admin"]).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "No hay cambios que guardar",
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
    // Constancia de la acreditación, sobre todo cuando fue por videollamada.
    nota: z.string().trim().max(500).optional(),
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
