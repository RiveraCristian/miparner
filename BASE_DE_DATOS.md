# Crear la base de datos de Miparner (PostgreSQL + PostGIS)

Guía paso a paso para dejar la base lista en tu equipo Windows. La base corre
**fuera de Docker** (regla del proyecto). Solo la haces una vez.

Requisitos: PostgreSQL 14+ con la extensión **PostGIS** disponible. Ya tienes
PostgreSQL 18 instalado (`psql --version`).

> Todos los comandos van en **PowerShell**. Si `psql` no se reconoce, agrégalo al
> PATH o usa la ruta completa, por ejemplo:
> `& "C:\Program Files\PostgreSQL\18\bin\psql.exe"`

---

## 1. Verificar que PostGIS está instalado

PostGIS viene con el instalador de PostgreSQL (marca "Spatial extensions" en Stack
Builder si no lo hiciste). Para comprobarlo:

```powershell
psql -U postgres -c "SELECT name FROM pg_available_extensions WHERE name = 'postgis';"
```

Si devuelve una fila con `postgis`, estás listo. Si no aparece, instala PostGIS con
**Stack Builder** (menú inicio → PostgreSQL 18 → Application Stack Builder →
Spatial Extensions → PostGIS).

---

## 2. Crear la base, el usuario y la extensión

Te pedirá la contraseña del superusuario `postgres` (la que definiste al instalar).

```powershell
# 1) Base de datos
psql -U postgres -c "CREATE DATABASE miparner;"

# 2) Usuario de la aplicación (cambia la contraseña por una tuya)
psql -U postgres -c "CREATE USER miparner_user WITH PASSWORD 'miparner_pass';"

# 3) Permisos sobre la base
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE miparner TO miparner_user;"

# 4) Habilitar PostGIS y dar permisos sobre el schema public
#    (en PostgreSQL 15+ el schema public ya no es abierto por defecto)
psql -U postgres -d miparner -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -U postgres -d miparner -c "GRANT ALL ON SCHEMA public TO miparner_user;"
psql -U postgres -d miparner -c "ALTER DATABASE miparner OWNER TO miparner_user;"
```

Verifica que PostGIS quedó activa:

```powershell
psql -U postgres -d miparner -c "SELECT postgis_full_version();"
```

---

## 3. Configurar la conexión del backend

En `backend/.env` (ya existe para desarrollo) confirma que `DATABASE_URL` coincide
con el usuario, la contraseña y la base que creaste:

```
DATABASE_URL="postgresql://miparner_user:miparner_pass@localhost:5432/miparner?schema=public"
```

> Si tu contraseña tiene caracteres especiales (`@ : / #`), hay que **URL-encodearla**.
> Ejemplo: `P@ss/1` → `P%40ss%2F1`.

---

## 4. Aplicar la migración y los datos base

Desde la carpeta `backend/`:

```powershell
cd backend
npx prisma migrate deploy   # crea todas las tablas, triggers e índices GIST
npm run db:seed             # admin + insignias + premios base
```

Si todo salió bien verás `Seed completado. Admin: admin@miparner.cl`.

Credenciales del admin inicial (cámbialas después del primer ingreso):
- correo: `admin@miparner.cl`
- clave: `Cambiar123!`

---

## 5. Levantar el backend y probar

```powershell
npm run dev
```

En otra terminal:

```powershell
# salud del servicio
curl http://localhost:4000/health

# salud de la base (debe responder db: up)
curl http://localhost:4000/health/db
```

También puedes inspeccionar los datos con Prisma Studio:

```powershell
npm run prisma:studio
```

---

## 6. Verificar que las tablas y PostGIS quedaron bien

```powershell
# Listar tablas
psql -U miparner_user -d miparner -c "\dt"

# Confirmar columnas geography y sus índices GIST
psql -U miparner_user -d miparner -c "\d viajes"
```

Debes ver `viaje_origen` y `viaje_destino` como `geography(Point,4326)` y los
índices `idx_viaje_origen`, `idx_viaje_destino`.

---

## 7. Bases creadas antes del cambio de nombre

Si tu base local todavía se llama `rumbo` y el rol `rumbo_user` (nombres previos a
la marca Miparner), hay un script que los renombra. Necesita **superusuario**: el rol
de la aplicación no tiene `CREATEDB` ni `CREATEROLE`.

```powershell
# 1. Detener el backend, para que no reconecte mientras se renombra
# 2. Renombrar base y rol (pide la clave de postgres)
psql -U postgres -h localhost -f design/scripts/renombrar-bd-a-miparner.sql

# 3. Apuntar el backend al nombre nuevo, en backend/.env
#    DATABASE_URL="postgresql://miparner_user:miparner_pass@localhost:5432/miparner?schema=public"

# 4. Comprobar
cd backend; npm run dev        # y abrir http://localhost:4000/health/db
```

La propiedad de las tablas se conserva —va por OID, no por nombre—, así que no hay
que volver a otorgar permisos. El script repone la contraseña de forma explícita,
porque PostgreSQL la borra al renombrar un rol si estaba cifrada con MD5.

> La migración `0001_init/migration.sql` conserva el nombre antiguo en un comentario
> de la primera línea. **No se edita a propósito**: Prisma guarda una suma de
> verificación de cada migración aplicada y cambiar el archivo haría que
> `prisma migrate` la reporte como modificada.

---

## Problemas frecuentes

| Síntoma | Causa / solución |
|--------|-------------------|
| `psql: command not found` | Agrega `C:\Program Files\PostgreSQL\18\bin` al PATH o usa la ruta completa. |
| `type "geography" does not exist` | No corriste `CREATE EXTENSION postgis;` en la base `miparner` (paso 2.4). |
| `password authentication failed` | Revisa usuario/clave en `DATABASE_URL` y que la clave esté URL-encodeada. |
| `permission denied for schema public` | Falta `GRANT ALL ON SCHEMA public TO miparner_user;` (PostgreSQL 15+). |
| `P1001: Can't reach database server` | PostgreSQL no está corriendo, o el puerto/host no coincide. |
| Migración ya aplicada y quieres reempezar | `psql -U postgres -c "DROP DATABASE miparner;"` y repite desde el paso 2. |

---

## Producción (referencia)

En GCP se usa **Cloud SQL (PostgreSQL + PostGIS)** en el proyecto de datos, y la app
se conecta por **socket** (no por IP):

```
DATABASE_URL="postgresql://USER:PASS@localhost/miparner?host=/cloudsql/PROYECTO:REGION:INSTANCIA"
```

La creación de la instancia y la habilitación de PostGIS se hacen una vez en Cloud SQL;
las migraciones corren en el pipeline de GitHub Actions con `prisma migrate deploy`.
