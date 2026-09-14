import { z } from "zod";
import { TIPOS_VALIDOS } from "./documentos.catalogo";

export const subirDocumentoSchema = z.object({
  // Llega por multipart junto al archivo, por eso es string plano.
  tipo: z.enum(TIPOS_VALIDOS as unknown as [string, ...string[]]),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type SubirDocumentoDto = z.infer<typeof subirDocumentoSchema>;

/** Solicitud de acreditación por videollamada. */
export const pedirVideollamadaSchema = z.object({
  disponibilidad: z
    .string()
    .trim()
    .min(5, "Cuéntanos qué días y horas te vienen bien")
    .max(500),
});
