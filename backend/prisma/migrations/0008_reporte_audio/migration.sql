-- ==========================================================================
-- Miparner — 0008
-- Reportes de audio inapropiado + moderación.
--
-- Un usuario puede denunciar un audio con lenguaje inapropiado. El audio puede
-- ser un mensaje de voz del chat (origen "mensaje") o la nota de voz de la
-- solicitud (origen "solicitud"). El equipo admin revisa la cola y puede
-- "retirar" el audio: se borra el binario del disco y se sella la columna
-- *_moderado_at del registro de origen para que la app muestre "audio retirado"
-- en vez del reproductor (y lo distinga de un mensaje de texto / sin nota).
-- ==========================================================================

-- Sellos de moderación en los dos orígenes de audio.
ALTER TABLE "mensajes"
  ADD COLUMN "mensaje_moderado_at" TIMESTAMP(3);

ALTER TABLE "viajes"
  ADD COLUMN "viaje_comentario_moderado_at" TIMESTAMP(3);

-- Cola de reportes.
CREATE TABLE "reportes_audio" (
  "reporte_id"            SERIAL       NOT NULL,
  "reporte_origen"        VARCHAR(20)  NOT NULL,
  "reporte_mensaje_id"    INTEGER,
  "reporte_viaje_id"      INTEGER,
  "reporte_reportante_id" INTEGER      NOT NULL,
  "reporte_motivo"        VARCHAR(500),
  "reporte_estado"        VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
  "reporte_resolucion"    VARCHAR(500),
  "reporte_resuelto_por"  INTEGER,
  "reporte_resuelto_at"   TIMESTAMP(3),
  "created_by"            INTEGER      NOT NULL,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "modified_by"          INTEGER,
  "modified_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reportes_audio_pkey" PRIMARY KEY ("reporte_id")
);

CREATE INDEX "reportes_audio_reporte_estado_idx"     ON "reportes_audio"("reporte_estado");
CREATE INDEX "reportes_audio_reporte_mensaje_id_idx" ON "reportes_audio"("reporte_mensaje_id");
CREATE INDEX "reportes_audio_reporte_viaje_id_idx"   ON "reportes_audio"("reporte_viaje_id");

ALTER TABLE "reportes_audio"
  ADD CONSTRAINT "reportes_audio_reporte_mensaje_id_fkey"
  FOREIGN KEY ("reporte_mensaje_id") REFERENCES "mensajes"("mensaje_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reportes_audio"
  ADD CONSTRAINT "reportes_audio_reporte_viaje_id_fkey"
  FOREIGN KEY ("reporte_viaje_id") REFERENCES "viajes"("viaje_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reportes_audio"
  ADD CONSTRAINT "reportes_audio_reporte_reportante_id_fkey"
  FOREIGN KEY ("reporte_reportante_id") REFERENCES "usuarios"("usuario_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
