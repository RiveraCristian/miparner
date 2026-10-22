import { z } from "zod";

export const enviarMensajeSchema = z.object({
  texto: z.string().trim().min(1, "Escribe un mensaje").max(1000),
});

export const viajeParamSchema = z.object({
  viajeId: z.coerce.number().int().positive(),
});

// La duración llega como campo de texto del multipart: coerce desde string.
// Tope de 60 s (1 min): el backend además recorta el binario a esa duración.
export const enviarVozSchema = z.object({
  duracion: z.coerce.number().int().min(1).max(60),
});

export const audioParamSchema = z.object({
  viajeId: z.coerce.number().int().positive(),
  mensajeId: z.coerce.number().int().positive(),
});

// Reporte de un audio inapropiado. El motivo es opcional (la app manda un
// texto por defecto, pero el usuario podría no escribir nada).
export const reportarVozSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

export type EnviarMensajeDto = z.infer<typeof enviarMensajeSchema>;
