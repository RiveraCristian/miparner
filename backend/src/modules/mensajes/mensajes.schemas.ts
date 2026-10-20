import { z } from "zod";

export const enviarMensajeSchema = z.object({
  texto: z.string().trim().min(1, "Escribe un mensaje").max(1000),
});

export const viajeParamSchema = z.object({
  viajeId: z.coerce.number().int().positive(),
});

// La duración llega como campo de texto del multipart: coerce desde string.
export const enviarVozSchema = z.object({
  duracion: z.coerce.number().int().min(1).max(600),
});

export const audioParamSchema = z.object({
  viajeId: z.coerce.number().int().positive(),
  mensajeId: z.coerce.number().int().positive(),
});

export type EnviarMensajeDto = z.infer<typeof enviarMensajeSchema>;
