# Miparner — plataforma de movilidad accesible

Conecta **deportistas** (con foco en accesibilidad universal) con **voluntarios**
que los acompañan/transportan a entrenamientos y competencias. Incluye
seguimiento en vivo, botón de pánico, validación OTP y gamificación.

> Identidad visual: **Manual de Identidad v1.0** (`miparner-logo.pdf`).
> Cómo está aplicado en el código: [`design/MARCA.md`](design/MARCA.md).
> Los assets de marca se generan desde el PDF con `design/scripts/gen_brand.py`.

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
miparner/
├── miparner-logo.pdf       # Manual de Identidad v1.0 (fuente de la marca)
├── backend/                # API + tiempo real (Node/Express/Prisma)
│   ├── prisma/             # schema.prisma + migraciones (PostGIS)
│   └── src/
│       ├── config/         # env validado
│       ├── lib/            # prisma, jwt, password, errores
│       ├── middleware/     # auth (inyecta usuario_id), validación, errores
│       ├── modules/        # auth, viajes, gamificación, seguridad
│       └── realtime/       # Socket.io
├── frontend/               # Web pública + panel de administración (React + Vite)
│   ├── public/brand/       # Logotipo, isotipo, favicon y app icons (SVG)
│   └── src/brand/          # Trazados del logotipo y componente <Logo>
├── mobile/                 # Apps React Native (Deportista / Voluntario)
│   └── shared/brand/       # Mismos trazados, para react-native-svg
├── design/                 # MARCA.md, prototipo y scripts de generación
├── docker-compose.yml      # frontend + backend (sin postgres)
└── .env.example
```

## Puesta en marcha (desarrollo)

Requisitos: Node 20+, PostgreSQL 14+ con PostGIS habilitado.

```bash
# 1. Crear la base y habilitar PostGIS (una vez, en el PostgreSQL del host)
createdb miparner
psql -d miparner -c "CREATE EXTENSION IF NOT EXISTS postgis;"

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
