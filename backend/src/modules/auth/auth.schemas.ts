import { z } from "zod";

export const registerSchema = z.object({
  correo: z.string().email(),
  nombre: z.string().min(2).max(255),
  password: z.string().min(8).max(128),
  telefono: z.string().min(6).max(30).optional(),
  rol: z.enum(["deportista", "voluntario"]),
  // Perfil (opcional en el registro)
  disciplina: z.string().max(120).optional(),
  necesidades: z.array(z.string()).optional(),
  vehiculo: z.string().max(120).optional(),
  patente: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  correo: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
