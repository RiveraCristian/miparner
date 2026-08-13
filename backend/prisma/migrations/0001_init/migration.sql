-- ==========================================================================
-- Rumbo — migración inicial
-- PostGIS, tabla usuarios, tablas de negocio con auditoría, soft-delete,
-- triggers set_modified_at, índices GIST y bitácora de auditoría.
-- ==========================================================================

-- Extensión geoespacial
CREATE EXTENSION IF NOT EXISTS postgis;

-- --------------------------------------------------------------------------
-- Función global de auditoría: actualiza modified_at en cada UPDATE
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- usuarios (entidad central) — nunca se elimina físicamente
-- --------------------------------------------------------------------------
CREATE TABLE usuarios (
  usuario_id                  SERIAL PRIMARY KEY,
  usuario_correo              VARCHAR(255) UNIQUE NOT NULL,
  usuario_nombre              VARCHAR(255) NOT NULL,
  usuario_telefono            VARCHAR(30),
  usuario_password            VARCHAR(255),                       -- nullable: preparado para SSO
  usuario_rol                 VARCHAR(50)  NOT NULL,              -- deportista | voluntario | admin
  usuario_proveedor_auth      VARCHAR(50)  NOT NULL DEFAULT 'local',
  usuario_proveedor_id        VARCHAR(255),
  usuario_activo              BOOLEAN      NOT NULL DEFAULT TRUE,
  usuario_fecha_creacion      TIMESTAMP    NOT NULL DEFAULT NOW(),
  usuario_fecha_desactivacion TIMESTAMP
);

-- --------------------------------------------------------------------------
-- deportista_perfil (1:1 con usuario)
-- --------------------------------------------------------------------------
CREATE TABLE deportista_perfil (
  deportista_perfil_id   SERIAL PRIMARY KEY,
  deportista_usuario_id  INTEGER NOT NULL UNIQUE REFERENCES usuarios(usuario_id),
  deportista_disciplina  VARCHAR(120),
  deportista_necesidades JSONB   NOT NULL DEFAULT '[]',
  deportista_puntos      INTEGER NOT NULL DEFAULT 0,
  deportista_nivel       INTEGER NOT NULL DEFAULT 1,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- voluntario_perfil (1:1 con usuario) — última ubicación conocida
-- --------------------------------------------------------------------------
CREATE TABLE voluntario_perfil (
  voluntario_perfil_id    SERIAL PRIMARY KEY,
  voluntario_usuario_id   INTEGER NOT NULL UNIQUE REFERENCES usuarios(usuario_id),
  voluntario_vehiculo     VARCHAR(120),
  voluntario_patente      VARCHAR(20),
  voluntario_en_linea     BOOLEAN NOT NULL DEFAULT FALSE,
  voluntario_validado     BOOLEAN NOT NULL DEFAULT FALSE,
  voluntario_puntos       INTEGER NOT NULL DEFAULT 0,
  voluntario_nivel        INTEGER NOT NULL DEFAULT 1,
  voluntario_ubicacion    geography(Point, 4326),
  voluntario_ubicacion_at TIMESTAMP,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- viajes (entidad crítica) — soft delete
-- --------------------------------------------------------------------------
CREATE TABLE viajes (
  viaje_id            SERIAL PRIMARY KEY,
  viaje_deportista_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  viaje_voluntario_id INTEGER REFERENCES usuarios(usuario_id),
  viaje_estado        VARCHAR(30) NOT NULL DEFAULT 'solicitado',
  viaje_origen        geography(Point, 4326) NOT NULL,
  viaje_destino       geography(Point, 4326) NOT NULL,
  viaje_origen_texto  VARCHAR(255),
  viaje_destino_texto VARCHAR(255),
  viaje_necesidades   JSONB NOT NULL DEFAULT '[]',
  viaje_ruta_snapshot JSONB,
  viaje_solicitado_at TIMESTAMP NOT NULL DEFAULT NOW(),
  viaje_inicio_at     TIMESTAMP,
  viaje_fin_at        TIMESTAMP,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN   NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMP,
  deleted_by  INTEGER   REFERENCES usuarios(usuario_id)
);
CREATE INDEX idx_viajes_estado ON viajes (viaje_estado);

-- --------------------------------------------------------------------------
-- viaje_evento (línea de tiempo / posiciones)
-- --------------------------------------------------------------------------
CREATE TABLE viaje_evento (
  viaje_evento_id       SERIAL PRIMARY KEY,
  viaje_evento_viaje_id INTEGER NOT NULL REFERENCES viajes(viaje_id),
  viaje_evento_tipo     VARCHAR(40) NOT NULL,
  viaje_evento_posicion geography(Point, 4326),
  viaje_evento_detalle  JSONB,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_viaje_evento_viaje ON viaje_evento (viaje_evento_viaje_id);

-- --------------------------------------------------------------------------
-- panico_alertas (Módulo de Seguridad)
-- --------------------------------------------------------------------------
CREATE TABLE panico_alertas (
  panico_id          SERIAL PRIMARY KEY,
  panico_usuario_id  INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  panico_viaje_id    INTEGER REFERENCES viajes(viaje_id),
  panico_ubicacion   geography(Point, 4326),
  panico_estado      VARCHAR(20) NOT NULL DEFAULT 'activa',
  panico_atendido_por INTEGER REFERENCES usuarios(usuario_id),
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_panico_estado ON panico_alertas (panico_estado);

-- --------------------------------------------------------------------------
-- otp_codigos (token 6 dígitos, TTL 5 min)
-- --------------------------------------------------------------------------
CREATE TABLE otp_codigos (
  otp_id         SERIAL PRIMARY KEY,
  otp_usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  otp_codigo     VARCHAR(10) NOT NULL,
  otp_canal      VARCHAR(10) NOT NULL DEFAULT 'sms',
  otp_expira_at  TIMESTAMP NOT NULL,
  otp_usado      BOOLEAN NOT NULL DEFAULT FALSE,
  otp_intentos   INTEGER NOT NULL DEFAULT 0,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otp_usuario ON otp_codigos (otp_usuario_id);

-- --------------------------------------------------------------------------
-- refresh_tokens
-- --------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  refresh_token_id         SERIAL PRIMARY KEY,
  refresh_token_usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  refresh_token_hash       VARCHAR(255) NOT NULL,
  refresh_token_expira_at  TIMESTAMP NOT NULL,
  refresh_token_revocado   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_usuario ON refresh_tokens (refresh_token_usuario_id);

-- --------------------------------------------------------------------------
-- Gamificación
-- --------------------------------------------------------------------------
CREATE TABLE insignias (
  insignia_id          SERIAL PRIMARY KEY,
  insignia_codigo      VARCHAR(60) UNIQUE NOT NULL,
  insignia_nombre      VARCHAR(120) NOT NULL,
  insignia_descripcion VARCHAR(255),
  insignia_icono       VARCHAR(60),
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE usuario_insignias (
  usuario_insignia_id          SERIAL PRIMARY KEY,
  usuario_insignia_usuario_id  INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  usuario_insignia_insignia_id INTEGER NOT NULL REFERENCES insignias(insignia_id),
  usuario_insignia_obtenida_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_insignia_usuario_id, usuario_insignia_insignia_id)
);

CREATE TABLE premios (
  premio_id          SERIAL PRIMARY KEY,
  premio_nombre      VARCHAR(150) NOT NULL,
  premio_descripcion VARCHAR(255),
  premio_costo_puntos INTEGER NOT NULL,
  premio_stock       INTEGER NOT NULL DEFAULT 0,
  premio_activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN   NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMP,
  deleted_by  INTEGER   REFERENCES usuarios(usuario_id)
);

CREATE TABLE canjes (
  canje_id             SERIAL PRIMARY KEY,
  canje_usuario_id     INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  canje_premio_id      INTEGER NOT NULL REFERENCES premios(premio_id),
  canje_puntos_gastados INTEGER NOT NULL,
  canje_estado         VARCHAR(20) NOT NULL DEFAULT 'solicitado',
  created_by  INTEGER   NOT NULL REFERENCES usuarios(usuario_id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  modified_by INTEGER   REFERENCES usuarios(usuario_id),
  modified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_canjes_usuario ON canjes (canje_usuario_id);

-- --------------------------------------------------------------------------
-- Bitácora de auditoría
-- --------------------------------------------------------------------------
CREATE TABLE audit_log (
  audit_id             BIGSERIAL PRIMARY KEY,
  audit_tabla          VARCHAR(100) NOT NULL,
  audit_registro_id    INTEGER NOT NULL,
  audit_operacion      VARCHAR(10) NOT NULL,
  audit_usuario_id     INTEGER REFERENCES usuarios(usuario_id),
  audit_valor_anterior JSONB,
  audit_valor_nuevo    JSONB,
  audit_timestamp      TIMESTAMP NOT NULL DEFAULT NOW(),
  audit_ip             VARCHAR(45)
);
CREATE INDEX idx_audit_tabla_registro ON audit_log (audit_tabla, audit_registro_id);
CREATE INDEX idx_audit_timestamp      ON audit_log (audit_timestamp);
CREATE INDEX idx_audit_usuario        ON audit_log (audit_usuario_id);

-- --------------------------------------------------------------------------
-- Índices espaciales (GIST) para matchmaking y tracking
-- --------------------------------------------------------------------------
CREATE INDEX idx_voluntario_ubicacion ON voluntario_perfil USING GIST (voluntario_ubicacion);
CREATE INDEX idx_viaje_origen         ON viajes            USING GIST (viaje_origen);
CREATE INDEX idx_viaje_destino        ON viajes            USING GIST (viaje_destino);
CREATE INDEX idx_viaje_evento_pos     ON viaje_evento      USING GIST (viaje_evento_posicion);
CREATE INDEX idx_panico_ubicacion     ON panico_alertas    USING GIST (panico_ubicacion);

-- --------------------------------------------------------------------------
-- Triggers de modified_at (una por tabla de negocio)
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_set_modified_at_deportista_perfil BEFORE UPDATE ON deportista_perfil FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_voluntario_perfil BEFORE UPDATE ON voluntario_perfil FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_viajes            BEFORE UPDATE ON viajes            FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_viaje_evento      BEFORE UPDATE ON viaje_evento      FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_panico_alertas    BEFORE UPDATE ON panico_alertas    FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_otp_codigos       BEFORE UPDATE ON otp_codigos       FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_refresh_tokens    BEFORE UPDATE ON refresh_tokens    FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_insignias         BEFORE UPDATE ON insignias         FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_usuario_insignias BEFORE UPDATE ON usuario_insignias FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_premios           BEFORE UPDATE ON premios           FOR EACH ROW EXECUTE FUNCTION set_modified_at();
CREATE TRIGGER trg_set_modified_at_canjes            BEFORE UPDATE ON canjes            FOR EACH ROW EXECUTE FUNCTION set_modified_at();
