import { z } from "zod";

const punto = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const solicitarSchema = z.object({
  origen: punto,
  destino: punto,
  origenTexto: z.string().max(255).optional(),
  destinoTexto: z.string().max(255).optional(),
  necesidades: z.array(z.string()).max(10).optional(),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(["en_camino", "a_bordo", "finalizado", "cancelado"]),
});

export const posicionSchema = punto;

export const candidatosQuerySchema = z.object({
  radio: z.coerce.number().int().min(100).max(50000).default(5000), // metros
});

export type SolicitarDto = z.infer<typeof solicitarSchema>;
export type CambiarEstadoDto = z.infer<typeof cambiarEstadoSchema>;
