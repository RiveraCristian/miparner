import { z } from "zod";

/** "HH:MM" en 24 horas. Es lo que envía el selector de hora de la app. */
const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Usa el formato HH:MM, por ejemplo 09:30");

/** "AAAA-MM-DD". Se valida aparte que caiga dentro del mes del plan. */
const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD");

export const periodoParamSchema = z.object({
  anio: z.coerce.number().int().min(2024).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

export const guardarPlanSchema = z.object({
  objetivo: z.string().trim().max(500).optional(),
  // Meta de horas del mes. 200 h ya son casi 7 h diarias: más es un error.
  horasObjetivo: z.number().int().min(0).max(200).default(0),
});

export const crearBloqueSchema = z.object({
  fecha,
  horaInicio: hora,
  duracionMin: z.number().int().min(15).max(600),
  disciplina: z.string().trim().max(120).optional(),
  lugar: z.string().trim().max(255).optional(),
  notas: z.string().trim().max(500).optional(),
});

export const actualizarBloqueSchema = z
  .object({
    fecha: fecha.optional(),
    horaInicio: hora.optional(),
    duracionMin: z.number().int().min(15).max(600).optional(),
    disciplina: z.string().trim().max(120).optional(),
    lugar: z.string().trim().max(255).optional(),
    notas: z.string().trim().max(500).optional(),
    estado: z.enum(["planificado", "cumplido", "omitido"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No hay nada que cambiar" });

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type GuardarPlanDto = z.infer<typeof guardarPlanSchema>;
export type CrearBloqueDto = z.infer<typeof crearBloqueSchema>;
export type ActualizarBloqueDto = z.infer<typeof actualizarBloqueSchema>;
