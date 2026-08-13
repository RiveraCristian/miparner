# Rumbo — plataforma de movilidad accesible

Conecta **deportistas** (con foco en accesibilidad universal) con **voluntarios**
que los acompañan/transportan a entrenamientos y competencias. Incluye
seguimiento en vivo, botón de pánico, validación OTP y gamificación.

> El nombre **Rumbo** y el logo son *placeholder*. El branding definitivo es un
> entregable aparte.

## Arquitectura

| Capa | Tecnología |
|------|------------|
| Apps móviles | React Native CLI — app Deportista y app Voluntario |
| Backend / API Gateway | Node.js + Express + TypeScript |
| Tiempo real | Socket.io (salas por viaje) |
| ORM | Prisma |
| Base de datos | PostgreSQL + PostGIS (**fuera de Docker**) |
| Geolocalización | `geography(Point,4326)` + `ST_DWithin` indexado (GIST) |
| Seguridad | JWT + bcrypt, OTP vía Twilio, botón de pánico |
| Contenedores | Docker + Docker Compose (sin PostgreSQL) |
| Despliegue | GCP Cloud Run + Artifact Registry + GitHub Actions |

```
Acceso_condominios/
├── backend/                # API + tiempo real (Node/Express/Prisma)
│   ├── prisma/             # schema.prisma + migraciones (PostGIS)
│   └── src/
│       ├── config/         # env validado
│       ├── lib/            # prisma, jwt, password, errores
│       ├── middleware/     # auth (inyecta usuario_id), validación, errores
│       ├── modules/        # auth, viajes, gamificación, seguridad
│       └── realtime/       # Socket.io
├── mobile/                 # Apps React Native (Deportista / Voluntario) — próxima fase
├── design/                 # Prototipo de diseño (azul)
├── docker-compose.yml      # backend (sin postgres)
└── .env.example
```

## Puesta en marcha (desarrollo)

Requisitos: Node 20+, PostgreSQL 14+ con PostGIS habilitado.

```bash
# 1. Crear la base y habilitar PostGIS (una vez, en el PostgreSQL del host)
createdb rumbo
psql -d rumbo -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 2. Variables de entorno
cp .env.example .env         # completar DATABASE_URL y secretos

# 3. Backend
cd backend
npm install
npx prisma migrate deploy    # aplica la migración 0001 (PostGIS, auditoría, triggers)
npx prisma generate
npm run dev                  # API en http://localhost:4000
```

## Convenciones de datos

- Identificadores en `snake_case` con formato `prefijo_entidad_atributo`.
- Toda tabla de negocio: `created_by`, `created_at`, `modified_by`, `modified_at`
  (trigger `set_modified_at` en cada UPDATE).
- Entidades críticas (viajes, premios): soft delete (`is_deleted`, `deleted_at`, `deleted_by`).
- Usuarios nunca se eliminan físicamente; se desactivan.
- `usuario_password` es *nullable* y hay columnas de proveedor para habilitar Google SSO
  sin reescribir el modelo.
