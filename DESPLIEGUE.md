# Despliegue en DigitalOcean

Miparner corre en un droplet con despliegue continuo: **un push a `main` publica
la versión nueva**, sin entrar al servidor.

```
push a main
   └─ GitHub Actions ─ construye backend + frontend ─> imágenes en GHCR
        └─ por SSH al droplet ─ descarga, migra la base, arranca
```

Las imágenes se construyen en Actions y **nunca en el droplet**: la máquina
tiene 512 MB de RAM y el build de Vite no cabe ahí.

| Pieza | Dónde vive |
|---|---|
| Caddy (panel web + proxy + HTTPS) | contenedor, puertos 80 y 443 |
| Backend (API + tiempo real) | contenedor, sin puerto público |
| PostgreSQL + PostGIS | **nativo en el droplet**, fuera de Docker |
| Documentos de validación | volumen `uploads`, sobrevive a los despliegues |
| Certificado TLS | volumen `caddy_data`, se renueva solo |

PostgreSQL va fuera de Docker porque lo exige el `CLAUDE.md` (sección 2.1).

---

## Puesta en marcha (una sola vez)

### 1. Apuntar el dominio

En GoDaddy: *Mis productos → dominio → DNS → Administrar zonas*.

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| A | `@` | `159.65.230.92` | 600 |
| CNAME | `www` | `@` | 600 |

Borra cualquier registro A o de reenvío que ya exista en `@`: dos registros
compitiendo mandan el tráfico a sitios distintos al azar. **No uses el
"Reenvío de dominio" de GoDaddy**, es una redirección HTTP y rompe el
certificado.

No hace falta cambiar los nameservers a DigitalOcean. Si lo hicieras, tardaría
hasta 48 h en propagar y perderías el correo del dominio hasta recrear los MX.

Comprueba antes de seguir:

```bash
nslookup tudominio.com
```

Hasta que no devuelva `159.65.230.92`, no sigas: Let's Encrypt bloquea por una
hora tras 5 intentos fallidos de validación.

### 2. Preparar el droplet

```bash
ssh root@159.65.230.92
curl -fsSL https://raw.githubusercontent.com/RiveraCristian/miparner/main/deploy/bootstrap-droplet.sh -o bootstrap.sh
bash bootstrap.sh
```

Instala Docker, PostgreSQL con PostGIS, crea 2 GB de swap, ajusta PostgreSQL
para 512 MB, crea el usuario `deploy` con su llave SSH y cierra el cortafuegos
dejando solo 22, 80 y 443.

Al terminar **imprime los secretos en pantalla**. Cópialos antes de cerrar.

Es idempotente: puedes volver a ejecutarlo sin perder datos.

### 3. Cargar los secretos en GitHub

*Settings → Secrets and variables → Actions → New repository secret*

| Secreto | De dónde sale |
|---|---|
| `DEPLOY_HOST` | `159.65.230.92` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | lo imprime el script (entero, con las líneas BEGIN y END) |
| `DATABASE_URL` | lo imprime el script |
| `JWT_ACCESS_SECRET` | lo imprime el script |
| `JWT_REFRESH_SECRET` | lo imprime el script |
| `MIPARNER_DOMINIO` | `tudominio.com` (vacío si aún usas la IP) |
| `CORS_ORIGINS` | `https://tudominio.com` |
| `MIPARNER_EMAIL_TLS` | tu correo, para los avisos de Let's Encrypt |

### 4. Primer despliegue

Fusiona a `main`. El workflow arranca solo y, al terminar, comprueba que
`/health` responde antes de darse por bueno.

### 5. Cerrar el acceso por contraseña

Cuando confirmes que entras con llave SSH:

```bash
passwd                                    # cambia la contraseña de root
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Hazlo **después** de comprobar que la llave funciona, o te quedas fuera.

---

## Operación

```bash
ssh deploy@159.65.230.92
cd /opt/miparner

docker compose -f docker-compose.prod.yml ps        # qué está corriendo
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml restart backend
free -h                                             # memoria y swap
```

**Volver a una versión anterior.** Cada despliegue etiqueta las imágenes con el
hash del commit:

```bash
docker compose -f docker-compose.prod.yml pull
docker tag ghcr.io/riveracristian/miparner-backend:<sha> ghcr.io/riveracristian/miparner-backend:latest
docker compose -f docker-compose.prod.yml up -d
```

Ojo: eso revierte el código, **no la base de datos**. Una migración ya aplicada
sigue aplicada.

---

## Respaldos

Nada de esto es automático todavía. Dos cosas que perderías si se borra el droplet:

```bash
# Base de datos
sudo -u postgres pg_dump miparner | gzip > ~/miparner-$(date +%F).sql.gz

# Documentos de validación (credenciales de discapacidad, cédulas)
docker run --rm -v miparner_uploads:/u -v ~:/respaldo alpine \
  tar czf /respaldo/uploads-$(date +%F).tar.gz -C /u .
```

Descárgalos con `scp` a tu equipo. Con 10 GB de disco no conviene acumularlos
en el servidor.

---

## Apps móviles

Las apps siguen apuntando al entorno de desarrollo. Para que hablen con el
servidor hay que cambiar `mobile/shared/config.ts`:

```ts
export const API_URL = "https://tudominio.com/api/v1";
export const SOCKET_URL = "https://tudominio.com";
```

Con HTTPS no hace falta ninguna excepción en Android. Si te quedaras en HTTP
por IP, sí: Android bloquea el tráfico sin cifrar desde la versión 9.

---

## Límites de esta máquina

512 MB de RAM reparte así, en reposo:

| | |
|---|---|
| Ubuntu | ~90 MB |
| Docker | ~90 MB |
| PostgreSQL | ~90 MB |
| Backend (Node + Prisma) | ~180 MB |
| Caddy | ~35 MB |
| **Total** | **~485 MB de 512** |

Va justo, y por eso hay 2 GB de swap: es lo que evita que el kernel mate el
backend en un pico. Sirve para pruebas con poco tráfico, que es el uso previsto.

Señales de que se quedó corta: `free -h` con el swap casi lleno, o el backend
reiniciándose solo (`docker compose ps` muestra los reinicios). El arreglo más
barato es subir el droplet a 1 GB desde el panel de DigitalOcean — son 2 USD más
al mes y no hay que reconfigurar nada.
