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
