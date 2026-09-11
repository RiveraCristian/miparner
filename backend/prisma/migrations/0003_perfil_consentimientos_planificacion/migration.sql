-- ==========================================================================
-- Miparner — 0003
-- 1. Perfil del deportista ampliado: caracterización, apoyos y contacto de
--    emergencia. Sustituye al perfil mínimo que solo guardaba la disciplina.
-- 2. Consentimientos por finalidad (Ley 21.719), con la versión y la huella
--    del texto que la persona aceptó.
-- 3. Planificación mensual de entrenamientos del deportista.
-- 4. Verificación flexible: documento O videollamada con el equipo.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. deportista_perfil — caracterización
--    Los datos de discapacidad son SENSIBLES: solo se piden con el
--    consentimiento 'datos_sensibles_salud' otorgado, y el voluntario nunca
--    ve el tipo de discapacidad, solo los apoyos del trayecto.
-- --------------------------------------------------------------------------
ALTER TABLE deportista_perfil
  ADD COLUMN deportista_fecha_nacimiento    DATE,
  ADD COLUMN deportista_genero              VARCHAR(40),
  ADD COLUMN deportista_region              VARCHAR(120),
  ADD COLUMN deportista_comuna              VARCHAR(120),
  ADD COLUMN deportista_direccion           VARCHAR(255),
  ADD COLUMN deportista_tipos_discapacidad  JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN deportista_nivel_autonomia     VARCHAR(30),
  ADD COLUMN deportista_comunicacion        VARCHAR(30),
  ADD COLUMN deportista_observaciones       VARCHAR(1000),
  ADD COLUMN deportista_emergencia_nombre   VARCHAR(255),
  ADD COLUMN deportista_emergencia_telefono VARCHAR(30),
  ADD COLUMN deportista_emergencia_relacion VARCHAR(60);

-- La columna de apoyos ya existía con otro nombre. Se mantiene para no perder
-- los datos: `deportista_necesidades` pasa a guardar las claves del catálogo.
COMMENT ON COLUMN deportista_perfil.deportista_necesidades
  IS 'Apoyos que necesita durante el trayecto (claves de APOYOS). Esto SÍ lo ve el voluntario.';
COMMENT ON COLUMN deportista_perfil.deportista_tipos_discapacidad
  IS 'DATO SENSIBLE. Tipo de discapacidad. NUNCA se expone al voluntario.';

CREATE INDEX idx_deportista_comuna ON deportista_perfil (deportista_comuna);

-- --------------------------------------------------------------------------
-- 2. usuarios — vía de verificación
--    El deportista acredita con carnet, con certificado médico o, si no tiene
--    ninguno, pidiendo una videollamada con el equipo.
-- --------------------------------------------------------------------------
ALTER TABLE usuarios
  ADD COLUMN usuario_verificacion_via            VARCHAR(30),
  ADD COLUMN usuario_verificacion_disponibilidad VARCHAR(500),
  ADD COLUMN usuario_verificacion_nota           VARCHAR(500),
  ADD COLUMN usuario_verificacion_at             TIMESTAMP;

COMMENT ON COLUMN usuarios.usuario_verificacion_via
  IS 'documento | videollamada — cómo se acreditó o se quiere acreditar la cuenta.';

-- --------------------------------------------------------------------------
-- 3. usuario_consentimiento — Ley 21.719
--    Nunca se actualiza una fila para "cambiar de opinión": se inserta una
--    nueva. El historial completo es la prueba de qué autorizó cada persona y
--    cuándo, que es justo lo que hay que poder demostrar.
-- --------------------------------------------------------------------------
CREATE TABLE usuario_consentimiento (
  consentimiento_id         SERIAL PRIMARY KEY,
  consentimiento_usuario_id INTEGER     NOT NULL REFERENCES usuarios(usuario_id),
  consentimiento_finalidad  VARCHAR(60) NOT NULL,
  consentimiento_otorgado   BOOLEAN     NOT NULL,
  consentimiento_version    VARCHAR(20) NOT NULL,
  -- Huella del texto exacto que se mostró: si cambia la redacción, se sabe
  -- quién aceptó cuál y a quién hay que volver a preguntar.
  consentimiento_texto_hash VARCHAR(64) NOT NULL,
  consentimiento_canal      VARCHAR(30),
  consentimiento_ip         VARCHAR(45),
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_consentimiento_usuario   ON usuario_consentimiento (consentimiento_usuario_id);
CREATE INDEX idx_consentimiento_finalidad ON usuario_consentimiento (consentimiento_finalidad);
-- Consulta habitual: el estado vigente de cada finalidad de una persona.
CREATE INDEX idx_consentimiento_vigente
  ON usuario_consentimiento (consentimiento_usuario_id, consentimiento_finalidad, consentimiento_id DESC);

-- --------------------------------------------------------------------------
-- 4. plan_entrenamiento — planificación mensual del deportista
-- --------------------------------------------------------------------------
CREATE TABLE plan_entrenamiento (
  plan_id             SERIAL PRIMARY KEY,
  plan_deportista_id  INTEGER      NOT NULL REFERENCES usuarios(usuario_id),
  plan_anio           INTEGER      NOT NULL,
  plan_mes            INTEGER      NOT NULL CHECK (plan_mes BETWEEN 1 AND 12),
  plan_objetivo       VARCHAR(500),
  -- Meta de horas del mes; el avance se calcula sumando los bloques cumplidos.
  plan_horas_objetivo INTEGER      NOT NULL DEFAULT 0,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN   NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMP,
  deleted_by  INTEGER   REFERENCES usuarios(usuario_id)
);
-- Un plan vigente por persona y mes.
CREATE UNIQUE INDEX idx_plan_unico
    ON plan_entrenamiento (plan_deportista_id, plan_anio, plan_mes)
 WHERE is_deleted = FALSE;

-- --------------------------------------------------------------------------
-- 5. plan_bloque — cada entrenamiento planificado
-- --------------------------------------------------------------------------
CREATE TABLE plan_bloque (
  bloque_id          SERIAL PRIMARY KEY,
  bloque_plan_id     INTEGER     NOT NULL REFERENCES plan_entrenamiento(plan_id),
  bloque_fecha       DATE        NOT NULL,
  bloque_hora_inicio TIME        NOT NULL,
  bloque_duracion_min INTEGER    NOT NULL CHECK (bloque_duracion_min BETWEEN 15 AND 600),
  bloque_disciplina  VARCHAR(120),
  bloque_lugar       VARCHAR(255),
  -- planificado | cumplido | omitido
  bloque_estado      VARCHAR(20) NOT NULL DEFAULT 'planificado',
  bloque_notas       VARCHAR(500),
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bloque_plan  ON plan_bloque (bloque_plan_id);
CREATE INDEX idx_bloque_fecha ON plan_bloque (bloque_fecha);

-- --------------------------------------------------------------------------
-- Triggers de modified_at para las tablas nuevas
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_set_modified_at_usuario_consentimiento BEFORE UPDATE ON usuario_consentimiento FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_plan_entrenamiento     BEFORE UPDATE ON plan_entrenamiento     FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_plan_bloque            BEFORE UPDATE ON plan_bloque            FOR EACH ROW EXECUTE FUNCTION set_modified_at();
