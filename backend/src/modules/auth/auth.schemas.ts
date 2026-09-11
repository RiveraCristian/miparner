import { z } from "zod";
import {
  esApoyo,
  esAutonomia,
  esComunicacion,
  esTipoDiscapacidad,
} from "../catalogos/discapacidad.catalogo";

/** Fecha "AAAA-MM-DD" que además tiene que ser una fecha real y pasada. */
const fechaNacimiento = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return false;
    const edad = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return edad >= 5 && edad <= 110;
  }, "Revisa tu fecha de nacimiento");

/** Caracterización del deportista. Todo opcional salvo lo que pida la app. */
export const perfilDeportistaSchema = z.object({
  disciplina: z.string().trim().max(120).optional(),
  fechaNacimiento: fechaNacimiento.optional(),
  genero: z.string().trim().max(40).optional(),
  region: z.string().trim().max(120).optional(),
  comuna: z.string().trim().max(120).optional(),
  direccion: z.string().trim().max(255).optional(),
  // DATO SENSIBLE: solo se guarda con el consentimiento explícito otorgado.
  tiposDiscapacidad: z.array(z.string().refine(esTipoDiscapacidad, "Tipo desconocido")).max(9).optional(),
  // Apoyos del trayecto: esto sí lo ve el voluntario.
  apoyos: z.array(z.string().refine(esApoyo, "Apoyo desconocido")).max(30).optional(),
  nivelAutonomia: z.string().refine(esAutonomia, "Nivel desconocido").optional(),
  comunicacion: z.string().refine(esComunicacion, "Forma de comunicación desconocida").optional(),
  observaciones: z.string().trim().max(1000).optional(),
  emergenciaNombre: z.string().trim().max(255).optional(),
  emergenciaTelefono: z.string().trim().max(30).optional(),
  emergenciaRelacion: z.string().trim().max(60).optional(),
});

/** Decisiones de consentimiento tomadas en el formulario de registro. */
const consentimientosSchema = z
  .array(z.object({ finalidad: z.string().min(1).max(60), otorgado: z.boolean() }))
  .max(20);

export const registerSchema = z.object({
  correo: z.string().email(),
  nombre: z.string().min(2).max(255),
  password: z.string().min(8).max(128),
  telefono: z.string().min(6).max(30).optional(),
  rol: z.enum(["deportista", "voluntario"]),
  // Sin las finalidades obligatorias no hay base legal para crear la cuenta.
  consentimientos: consentimientosSchema.default([]),
  // Perfil del deportista
  perfil: perfilDeportistaSchema.optional(),
  // Compatibilidad con la versión anterior del formulario.
  disciplina: z.string().max(120).optional(),
  necesidades: z.array(z.string()).optional(),
  // Perfil del voluntario
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

/** Edición de la propia cuenta. Al menos un campo; el teléfono admite null. */
export const actualizarPerfilSchema = z
  .object({
    nombre: z.string().trim().min(2).max(255).optional(),
    correo: z.string().trim().email().optional(),
    telefono: z.string().trim().min(6).max(30).nullable().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "No hay cambios que guardar",
  });

/** Cambio de contraseña: pide la actual para confirmar identidad. */
export const cambiarPasswordSchema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(8).max(128),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
export type ActualizarPerfilDto = z.infer<typeof actualizarPerfilSchema>;
export type CambiarPasswordDto = z.infer<typeof cambiarPasswordSchema>;

export type PerfilDeportistaDto = z.infer<typeof perfilDeportistaSchema>;
