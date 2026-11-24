-- ==========================================================================
-- Miparner — 0009
-- Dirección del destino, aparte de su nombre. Hasta ahora sólo se guardaba lo
-- que el buscador llama "nombre" ("Estadio Nacional"), y eso no basta para
-- reconocer un lugar: los destinos frecuentes del inicio se construyen con los
-- viajes anteriores, y "Estadio" sin calle ni comuna no dice cuál es.
-- Nullable: las solicitudes ya creadas no la tienen, y un punto marcado a mano
-- en el mapa tampoco trae dirección.
-- La tabla ya tiene su trigger de modified_at (0001): añadir una columna no
-- requiere otro.
-- ==========================================================================

ALTER TABLE "viajes"
  ADD COLUMN "viaje_destino_direccion" VARCHAR(255);
