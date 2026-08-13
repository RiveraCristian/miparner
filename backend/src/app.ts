import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import healthRoutes from "./routes/health";
import authRoutes from "./modules/auth/auth.routes";
import viajesRoutes from "./modules/viajes/viajes.routes";
import voluntariosRoutes from "./modules/voluntarios/voluntarios.routes";
import seguridadRoutes from "./modules/seguridad/seguridad.routes";
import gamificacionRoutes from "./modules/gamificacion/gamificacion.routes";
import adminRoutes from "./modules/admin/admin.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.length ? env.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  if (!env.isProd) app.use(morgan("dev"));

  // Salud
  app.use("/health", healthRoutes);

  // API versionada
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/viajes", viajesRoutes);
  app.use("/api/v1/voluntarios", voluntariosRoutes);
  app.use("/api/v1/seguridad", seguridadRoutes);
  app.use("/api/v1/gamificacion", gamificacionRoutes);
  app.use("/api/v1/admin", adminRoutes);

  // 404 + manejador de errores (siempre al final)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
