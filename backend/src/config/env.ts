import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Carga backend/.env y, además, el .env de la raíz del monorepo (sin sobrescribir
// variables ya definidas en el entorno).
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio"),
  CORS_ORIGINS: z.string().default(""),

  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET es obligatorio"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET es obligatorio"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  OTP_TTL_MINUTES: z.coerce.number().default(5),
  OTP_LENGTH: z.coerce.number().default(6),

  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_FROM_NUMBER: z.string().default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Configuración de entorno inválida:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
};
