-- ==========================================================================
-- Miparner — 0004
-- 1. Acompañamientos programables: día y hora. Hasta ahora todo era inmediato,
--    y por eso el voluntario no veía cuándo era: el "cuándo" era siempre ahora.
-- 2. Dirección escrita a mano, con las coordenadas que devuelve el buscador.
-- 3. 'a_bordo' pasa a llamarse 'en_accion'.
-- 4. Lista de espera de la web, para contactar a quien se interese.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. viajes — programación
--    NULL significa "lo antes posible", que es como funcionaba todo hasta hoy:
--    así los acompañamientos que ya existen siguen siendo válidos.
-- --------------------------------------------------------------------------
ALTER TABLE viajes
  ADD COLUMN viaje_programado_at    TIMESTAMP,
  ADD COLUMN viaje_duracion_est_min INTEGER;

COMMENT ON COLUMN viajes.viaje_programado_at
  IS 'Cuándo quiere la persona el acompañamiento. NULL = lo antes posible.';

-- El voluntario busca por fecha, no solo por cercanía.
CREATE INDEX idx_viajes_programado ON viajes (viaje_programado_at)
  WHERE is_deleted = FALSE;

-- --------------------------------------------------------------------------
-- 2. 'a_bordo' -> 'en_accion'
--    "A bordo" venía de pensar el servicio como un viaje en vehículo. Pero un
--    acompañamiento puede ser a pie, en metro o en silla de ruedas, y entonces
--    no hay ningún "bordo". "En acción" describe lo que de verdad pasa: las dos
--    personas ya están juntas y en marcha.
-- --------------------------------------------------------------------------
UPDATE viajes       SET viaje_estado = 'en_accion'       WHERE viaje_estado = 'a_bordo';
UPDATE viaje_evento SET viaje_evento_tipo = 'en_accion'  WHERE viaje_evento_tipo = 'a_bordo';

-- --------------------------------------------------------------------------
-- 3. lista_espera — interesados desde la web
--    No son cuentas: es gente que deja su contacto para que el equipo les
--    escriba cuando el servicio llegue a su comuna o se abran cupos. Por eso
--    vive aparte de `usuarios` y no tiene contraseña ni rol.
-- --------------------------------------------------------------------------
CREATE TABLE lista_espera (
  espera_id         SERIAL PRIMARY KEY,
  espera_nombre     VARCHAR(255) NOT NULL,
  espera_correo     VARCHAR(255) NOT NULL,
  espera_telefono   VARCHAR(30),
  espera_comuna     VARCHAR(120),
  -- deportista | voluntario | organizacion | otro
  espera_interes    VARCHAR(30)  NOT NULL,
  espera_mensaje    VARCHAR(1000),
  -- nuevo | contactado | convertido | descartado
  espera_estado     VARCHAR(20)  NOT NULL DEFAULT 'nuevo',
  espera_nota       VARCHAR(500),
  espera_contactado_por INTEGER REFERENCES usuarios(usuario_id),
  espera_contactado_at  TIMESTAMP,
  -- Consentimiento: dejar el contacto es un dato personal, y la finalidad es
  -- justamente que les escribamos. Se guarda la prueba igual que en el registro.
  espera_acepta_contacto BOOLEAN NOT NULL DEFAULT TRUE,
  espera_ip         VARCHAR(45),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Una persona no se apunta dos veces con el mismo correo.
CREATE UNIQUE INDEX idx_espera_correo ON lista_espera (LOWER(espera_correo));
CREATE INDEX idx_espera_estado ON lista_espera (espera_estado);
CREATE INDEX idx_espera_comuna ON lista_espera (espera_comuna);

-- `created_by` no aplica: quien se apunta no tiene cuenta todavía, así que no
-- hay un usuario_id al que apuntar. `modified_by` sí, porque lo gestiona el
-- equipo desde el panel.

CREATE TRIGGER trg_set_modified_at_lista_espera BEFORE UPDATE ON lista_espera FOR EACH ROW EXECUTE FUNCTION set_modified_at();
