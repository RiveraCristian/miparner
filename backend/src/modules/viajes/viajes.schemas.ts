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
  // Lo que la persona necesita, con sus palabras. Lo lee el voluntario antes
  // de aceptar, así que va en el mismo formulario de la solicitud.
  comentario: z.string().trim().max(1000).optional(),
  /*
   * Cuándo lo quiere. Ausente significa "lo antes posible", que es como
   * funcionaba todo antes: así las apps viejas siguen sirviendo.
   *
   * No se aceptan fechas pasadas ni más allá de 90 días: lo primero es un
   * error de quien lo pide, y lo segundo llena la lista del voluntario de
   * cosas que no puede atender.
   */
  programadoAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .refine(
      (v) => !v || new Date(v).getTime() > Date.now() - 5 * 60 * 1000,
      "La fecha ya pasó",
    )
    .refine(
      (v) => !v || new Date(v).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000,
      "No se puede programar con más de 90 días",
    ),
  duracionEstMin: z.number().int().min(15).max(600).optional(),
});

// La duración llega como campo de texto del multipart: coerce desde string.
// Tope de 60 s (1 min): el backend además recorta el binario a esa duración.
export const comentarioVozSchema = z.object({
  duracion: z.coerce.number().int().min(1).max(60),
});

// Reporte de la nota de voz de la solicitud por lenguaje inapropiado.
export const reportarVozSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(["en_camino", "en_accion", "finalizado", "cancelado"]),
});

export const posicionSchema = punto;

export const candidatosQuerySchema = z.object({
  radio: z.coerce.number().int().min(100).max(50000).default(5000), // metros
});

export type SolicitarDto = z.infer<typeof solicitarSchema>;
export type CambiarEstadoDto = z.infer<typeof cambiarEstadoSchema>;
