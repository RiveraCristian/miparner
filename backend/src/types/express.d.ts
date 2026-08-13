import "express";

declare global {
  namespace Express {
    interface Request {
      // Inyectado por el middleware de autenticación.
      // Alimenta created_by / modified_by en las operaciones de escritura.
      usuario?: {
        usuarioId: number;
        rol: string;
      };
    }
  }
}

export {};
