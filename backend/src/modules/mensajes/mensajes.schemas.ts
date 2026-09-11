import { z } from "zod";

export const enviarMensajeSchema = z.object({
  texto: z.string().trim().min(1, "Escribe un mensaje").max(1000),
});

export const viajeParamSchema = z.object({
  viajeId: z.coerce.number().int().positive(),
});

export type EnviarMensajeDto = z.infer<typeof enviarMensajeSchema>;
