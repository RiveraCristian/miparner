import { z } from "zod";

export const estadoSchema = z.object({
  enLinea: z.boolean(),
});

export const ubicacionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type EstadoDto = z.infer<typeof estadoSchema>;
export type UbicacionDto = z.infer<typeof ubicacionSchema>;
