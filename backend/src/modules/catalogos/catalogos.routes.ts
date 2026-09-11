import { Router } from "express";
import { catalogoCompleto } from "./discapacidad.catalogo";

const router = Router();

/**
 * Catálogos de discapacidad y apoyos.
 *
 * Sin autenticación a propósito: son listas públicas, sin ningún dato de
 * ninguna persona, y el formulario de registro las necesita antes de que
 * exista la cuenta. Las apps traen una copia empaquetada y consultan esta
 * para quedarse al día.
 */
router.get("/discapacidad", (_req, res) => {
  // Cambian poco: una hora de caché ahorra una petición en cada arranque.
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(catalogoCompleto());
});

export default router;
