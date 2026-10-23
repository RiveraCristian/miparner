-- ==========================================================================
-- Miparner — 0007
-- Nota de voz opcional en la solicitud de acompañamiento. El deportista puede
-- contar "qué necesita" grabándolo, además del comentario de texto que ya
-- existía. El binario NO va en la base (como documentos y mensajes de voz):
-- aquí solo el nombre del archivo en disco, la duración en segundos y el mime.
-- Columnas nullable: las solicitudes ya creadas no tienen nota de voz.
-- ==========================================================================

ALTER TABLE "viajes"
  ADD COLUMN "viaje_comentario_audio"          VARCHAR(255),
  ADD COLUMN "viaje_comentario_audio_duracion" INTEGER,
  ADD COLUMN "viaje_comentario_audio_mime"     VARCHAR(60);
