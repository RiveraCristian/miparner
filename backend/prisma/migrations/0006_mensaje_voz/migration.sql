-- ==========================================================================
-- Miparner — 0006
-- Mensajes de voz en la conversación del acompañamiento. Un mensaje pasa a ser
-- de texto O de voz: el texto deja de ser obligatorio y se agregan los datos
-- del audio. El binario NO se guarda en la base (igual que los documentos):
-- aquí solo queda el nombre del archivo en disco, su duración en segundos y el
-- mime real para servirlo. Columnas nullable: los mensajes de texto ya
-- existentes no tienen audio.
-- ==========================================================================

ALTER TABLE "mensajes"
  ALTER COLUMN "mensaje_texto" DROP NOT NULL,
  ADD COLUMN "mensaje_audio_archivo"  VARCHAR(255),
  ADD COLUMN "mensaje_audio_duracion" INTEGER,
  ADD COLUMN "mensaje_audio_mime"     VARCHAR(60);
