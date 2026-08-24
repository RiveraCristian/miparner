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
| Validación de cuentas | Documentos subidos por la persona + aprobación en el panel |
| Mensajería | Chat deportista ↔ voluntario, acotado al acompañamiento |
| Mapas | MapLibre GL + teselas de OpenFreeMap (OpenStreetMap), sin clave de API |
| Seguimiento en vivo | GPS del dispositivo → Socket.io (sala del viaje) + rastro en `viaje_evento` |
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
npx prisma migrate deploy    # 0001 (PostGIS, auditoría, triggers) + 0002 (validación, documentos, mensajes)
npx prisma generate
npm run dev                  # API en http://localhost:4000
```

## Validación de cuentas

Nadie opera en Miparner sin que el equipo lo haya validado. El registro deja la
cuenta **activa pero pendiente**: la persona entra, ve su perfil y sube su
respaldo, pero no puede pedir ni aceptar acompañamientos.

| Rol | Documentos obligatorios |
|-----|-------------------------|
| Deportista | Credencial de discapacidad |
| Voluntario | Cédula de identidad + certificado de alumno regular |

Qué se le pide a cada rol lo define
[`backend/src/modules/documentos/documentos.catalogo.ts`](backend/src/modules/documentos/documentos.catalogo.ts):
es la única fuente de verdad y las apps solo dibujan lo que llega en
`GET /api/v1/documentos/requeridos`.

El ciclo es: registro → `pendiente` → la persona sube sus documentos → el panel
(**Administración › Validaciones**) los revisa → `aprobado` o `rechazado` con
motivo. Un rechazo se explica en la app y, al volver a subir el documento, la
cuenta regresa sola a la cola. Aprobar a un voluntario sincroniza
`voluntario_validado`, que es lo que mira el matchmaking geoespacial.

Los archivos **no** viven en la base: en disco queda el binario con un nombre
aleatorio (`UPLOADS_DIR`, por defecto `backend/uploads/`, nunca versionado) y en
`usuario_documento` el metadato. Se sirven solo por endpoint autenticado, al
dueño y a los administradores. En Cloud Run el contenedor es efímero: montar un
volumen o cambiar `backend/src/lib/uploads.ts` por Cloud Storage.

## Mensajería

El deportista y su voluntario se escriben dentro del acompañamiento: no hay
directorio de personas ni mensajes sueltos. La conversación se abre cuando hay
voluntario asignado, se guarda en `mensajes` (auditable desde el panel) y se
entrega en vivo por la sala de Socket.io del viaje (`mensaje_nuevo`), con una
sala por usuario para avisar aunque no tenga el chat abierto.

Además, al pedir acompañamiento el deportista escribe **un comentario libre** con
lo que necesita (`viaje_comentario`). El voluntario lo lee antes de aceptar.

## Mapas

Se usa **MapLibre GL** con el estilo vectorial de **OpenFreeMap**: código abierto,
datos de OpenStreetMap, sin clave de API, sin cuota y sin registro.

| Dónde | Paquete |
|-------|---------|
| Apps móviles | `@maplibre/maplibre-react-native` |
| Web (si se añade) | `maplibre-gl` — mismo estilo, misma URL |

El proveedor de teselas está en un solo sitio, `MAPA_ESTILO_URL` de
[`mobile/shared/config.ts`](mobile/shared/config.ts). Cambiar a MapTiler,
Protomaps o un servidor propio es cambiar esa URL.

## Seguimiento en vivo

Durante el acompañamiento los dos teléfonos comparten su posición real y cada
uno ve la del otro moverse en el mapa.

| | Deportista | Voluntario |
|---|---|---|
| Filtro de movimiento | 10 m | 10 m |
| Ve en el mapa | al voluntario y su recorrido | al deportista |
| Distancia entre ambos | «a X m de ti» | «X m hasta el punto de encuentro / el destino» |

Dos canales, a propósito:

- **Socket** en cada lectura del GPS — es lo que mueve el punto en el mapa de la
  otra persona. Es efímero: si se pierde un evento, el siguiente lo corrige.
- **REST** (`POST /viajes/:id/posicion`) cada 30 s o 120 m — deja el rastro en
  `viaje_evento` para la auditoría y el módulo de seguridad. Va espaciado porque
  cada llamada escribe una fila.

Con el GPS activo, el **botón de pánico** manda dónde está la persona ahora, no
dónde pidió el acompañamiento. Y el voluntario en línea publica su posición cada
minuto (o cada 200 m), que es lo que alimenta el matchmaking geoespacial.

Todo el acceso al GPS pasa por [`mobile/shared/ubicacion.ts`](mobile/shared/ubicacion.ts):
un solo archivo, con el sensor compartido por conteo de suscriptores para que
dos pantallas abiertas no lo enciendan dos veces.

**La sala de un viaje está autorizada en el servidor.** `join_ride` comprueba
contra la base que quien entra sea el deportista, su voluntario o un
administrador; emitir posición a una sala exige lo mismo. Sin esa comprobación,
cualquier cuenta registrada podría escuchar la ubicación en vivo de cualquier
acompañamiento.

## Convenciones de datos

- Identificadores en `snake_case` con formato `prefijo_entidad_atributo`.
- Toda tabla de negocio: `created_by`, `created_at`, `modified_by`, `modified_at`
  (trigger `set_modified_at` en cada UPDATE).
- Entidades críticas (viajes, premios): soft delete (`is_deleted`, `deleted_at`, `deleted_by`).
- Usuarios nunca se eliminan físicamente; se desactivan.
- Los documentos de validación son dato personal sensible: llevan soft delete y
  su binario nunca se versiona.
- `usuario_password` es *nullable* y hay columnas de proveedor para habilitar Google SSO
  sin reescribir el modelo.
