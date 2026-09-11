-- ==========================================================================
-- Miparner — 0002
-- 1. Validación de cuenta por el panel de administración (deportistas y
--    voluntarios): la cuenta se activa al registrarse, pero queda 'pendiente'
--    hasta que un admin la apruebe.
-- 2. Documentos de respaldo que la persona sube para esa validación
--    (carnet de discapacidad, carnet de identidad, certificado de estudios).
-- 3. Mensajería entre el deportista y el voluntario de un acompañamiento.
-- 4. Comentario libre del deportista al pedir acompañamiento.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. usuarios: estado de validación
--    'pendiente' | 'aprobado' | 'rechazado'
-- --------------------------------------------------------------------------
ALTER TABLE usuarios
  ADD COLUMN usuario_estado_validacion VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  ADD COLUMN usuario_validado_por      INTEGER REFERENCES usuarios(usuario_id),
  ADD COLUMN usuario_validado_at       TIMESTAMP,
  ADD COLUMN usuario_motivo_rechazo    VARCHAR(500);

-- Las cuentas que ya existían son anteriores a este requisito: no se bloquean.
-- Los voluntarios conservan el estado que ya tenían en voluntario_validado.
UPDATE usuarios SET usuario_estado_validacion = 'aprobado'
 WHERE usuario_rol IN ('admin', 'deportista');

UPDATE usuarios u SET usuario_estado_validacion = 'aprobado'
  FROM voluntario_perfil vp
 WHERE vp.voluntario_usuario_id = u.usuario_id
   AND vp.voluntario_validado = TRUE;

CREATE INDEX idx_usuarios_estado_validacion ON usuarios (usuario_estado_validacion);

-- --------------------------------------------------------------------------
-- 2. viajes: comentario libre del deportista ("qué necesito")
-- --------------------------------------------------------------------------
ALTER TABLE viajes ADD COLUMN viaje_comentario VARCHAR(1000);

-- --------------------------------------------------------------------------
-- 3. usuario_documento (entidad crítica: dato personal sensible → soft delete)
--    El archivo vive fuera de la base; aquí solo su metadato y su estado.
-- --------------------------------------------------------------------------
CREATE TABLE usuario_documento (
  documento_id              SERIAL PRIMARY KEY,
  documento_usuario_id      INTEGER      NOT NULL REFERENCES usuarios(usuario_id),
  documento_tipo            VARCHAR(40)  NOT NULL,   -- carnet_discapacidad | carnet_identidad | certificado_estudios
  documento_nombre_original VARCHAR(255) NOT NULL,
  documento_archivo         VARCHAR(255) NOT NULL,   -- nombre en disco (uuid + extensión)
  documento_mime            VARCHAR(100) NOT NULL,
  documento_tamano          INTEGER      NOT NULL,   -- bytes
  documento_estado          VARCHAR(20)  NOT NULL DEFAULT 'pendiente', -- pendiente | aprobado | rechazado
  documento_observacion     VARCHAR(500),
  documento_revisado_por    INTEGER REFERENCES usuarios(usuario_id),
  documento_revisado_at     TIMESTAMP,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN   NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMP,
  deleted_by  INTEGER   REFERENCES usuarios(usuario_id)
);
CREATE INDEX idx_documento_usuario ON usuario_documento (documento_usuario_id);
CREATE INDEX idx_documento_estado  ON usuario_documento (documento_estado);
-- Un solo documento vigente por persona y tipo: al resubir, el anterior se
-- marca is_deleted y queda en el historial.
CREATE UNIQUE INDEX idx_documento_vigente
    ON usuario_documento (documento_usuario_id, documento_tipo)
 WHERE is_deleted = FALSE;

-- --------------------------------------------------------------------------
-- 4. mensajes — conversación acotada a un acompañamiento
-- --------------------------------------------------------------------------
CREATE TABLE mensajes (
  mensaje_id          SERIAL PRIMARY KEY,
  mensaje_viaje_id    INTEGER       NOT NULL REFERENCES viajes(viaje_id),
  mensaje_emisor_id   INTEGER       NOT NULL REFERENCES usuarios(usuario_id),
  mensaje_receptor_id INTEGER       NOT NULL REFERENCES usuarios(usuario_id),
  mensaje_texto       VARCHAR(1000) NOT NULL,
  mensaje_leido_at    TIMESTAMP,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mensajes_viaje ON mensajes (mensaje_viaje_id, mensaje_id);
-- Contador de no leídos: solo interesan los que siguen sin leer.
CREATE INDEX idx_mensajes_no_leidos
    ON mensajes (mensaje_receptor_id)
 WHERE mensaje_leido_at IS NULL;

-- --------------------------------------------------------------------------
-- Triggers de modified_at para las tablas nuevas
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_set_modified_at_usuario_documento BEFORE UPDATE ON usuario_documento FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_mensajes          BEFORE UPDATE ON mensajes          FOR EACH ROW EXECUTE FUNCTION set_modified_at();
