-- ===========================================================================
-- Renombra la base y el rol de la marca antigua a Miparner.
--
--   psql -U postgres -h localhost -f design/scripts/renombrar-bd-a-miparner.sql
--
-- Requiere superusuario: el rol de la aplicación no tiene CREATEDB ni CREATEROLE.
-- Hay que ejecutarlo conectado a OTRA base (conectarse como postgres cae en
-- «postgres», que es lo correcto): no se puede renombrar la base en uso.
--
-- Al terminar, actualizar backend/.env con:
--   DATABASE_URL="postgresql://miparner_user:miparner_pass@localhost:5432/miparner?schema=public"
-- ===========================================================================

\set ON_ERROR_STOP on

-- 1. El rol. La propiedad de las tablas se mantiene: va por OID, no por nombre,
--    así que no hay que volver a otorgar permisos.
ALTER ROLE rumbo_user RENAME TO miparner_user;

-- 2. Reponer la contraseña de forma explícita. PostgreSQL borra la contraseña al
--    renombrar un rol si estaba cifrada con MD5; con scram-sha-256 la conserva.
--    Fijarla aquí deja el resultado igual en los dos casos.
ALTER ROLE miparner_user WITH PASSWORD 'miparner_pass';

-- 3. Cortar las conexiones abiertas: no se puede renombrar una base en uso.
--    Detener antes el backend evita que tsx watch reconecte al instante.
SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
 WHERE datname = 'rumbo'
   AND pid <> pg_backend_pid();

-- 4. La base.
ALTER DATABASE rumbo RENAME TO miparner;

-- 5. Comprobación.
SELECT d.datname AS base, pg_get_userbyid(d.datdba) AS duenio
  FROM pg_database d
 WHERE d.datname IN ('rumbo', 'miparner');

SELECT rolname FROM pg_roles WHERE rolname IN ('rumbo_user', 'miparner_user');
