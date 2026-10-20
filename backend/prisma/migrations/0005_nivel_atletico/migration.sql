-- ==========================================================================
-- Miparner — 0005
-- Nivel atlético autodeclarado del deportista, elegido al crear el perfil:
-- principiante | intermedio | avanzado. Nullable porque las cuentas que ya
-- existen no lo tienen y es opcional como el resto de la caracterización.
-- OJO: distinto de deportista_nivel (entero de gamificación).
-- ==========================================================================

ALTER TABLE "deportista_perfil"
  ADD COLUMN "deportista_nivel_atletico" VARCHAR(20);
