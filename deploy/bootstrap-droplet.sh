#!/usr/bin/env bash
# ==========================================================================
# Miparner — preparación del droplet de DigitalOcean. Se ejecuta UNA vez.
#
#   ssh root@159.65.230.92
#   curl -fsSL https://raw.githubusercontent.com/RiveraCristian/miparner/main/deploy/bootstrap-droplet.sh -o bootstrap.sh
#   bash bootstrap.sh
#
# Deja el servidor listo para que GitHub Actions despliegue solo. Es idempotente:
# volver a ejecutarlo no rompe nada ni pierde datos.
#
# Pensado para el droplet más básico (512 MB / 1 vCPU / 10 GB). Ahí la memoria
# es el recurso escaso, así que el script crea swap y baja la configuración de
# PostgreSQL, que de fábrica asume una máquina mucho más grande.
#
# REGLA DEL PROYECTO: PostgreSQL corre nativo en el host, nunca en Docker.
# ==========================================================================
set -euo pipefail

BD_NOMBRE="miparner"
BD_USUARIO="miparner_user"
APP_DIR="/opt/miparner"
USUARIO_DEPLOY="deploy"
REPO_RAW="https://raw.githubusercontent.com/RiveraCristian/miparner/main"

verde() { printf '\n\033[1;32m== %s\033[0m\n' "$*"; }
aviso() { printf '\033[1;33m   %s\033[0m\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "Ejecuta este script como root."; exit 1; }

# --------------------------------------------------------------------------
verde "1/9  Swap de 2 GB"
# En 512 MB de RAM el swap no es un lujo: es lo que evita que el kernel mate el
# backend cuando coinciden un pico de la API y una consulta de PostgreSQL.
if swapon --show | grep -q '/swapfile'; then
  aviso "Ya existe, se deja como está."
else
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  aviso "2 GB de swap activos."
fi

# Con poca RAM conviene que el kernel use el swap antes de llegar al límite,
# pero sin castigar el rendimiento: 20 es el punto medio habitual.
sysctl -qw vm.swappiness=20
grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=20' >> /etc/sysctl.conf

# --------------------------------------------------------------------------
verde "2/9  Paquetes base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw openssl

# --------------------------------------------------------------------------
verde "3/9  Docker"
if command -v docker >/dev/null 2>&1; then
  aviso "Ya instalado: $(docker --version)"
else
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Los logs de Docker se comen un disco de 10 GB sin avisar.
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
systemctl restart docker

# --------------------------------------------------------------------------
verde "4/9  PostgreSQL + PostGIS"
if command -v psql >/dev/null 2>&1; then
  aviso "Ya instalado: $(psql --version)"
else
  apt-get install -y -qq postgresql postgresql-contrib
fi
PG_VER="$(ls /etc/postgresql | sort -V | tail -1)"
apt-get install -y -qq "postgresql-${PG_VER}-postgis-3"
aviso "PostgreSQL ${PG_VER} con PostGIS."

PG_CONF="/etc/postgresql/${PG_VER}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VER}/main/pg_hba.conf"

# --------------------------------------------------------------------------
verde "5/9  Ajuste de PostgreSQL para 512 MB"
# La configuración de fábrica asume una máquina bastante mayor. Sin bajarla,
# PostgreSQL reserva memoria que el backend necesita y acaban compitiendo.
mkdir -p "/etc/postgresql/${PG_VER}/main/conf.d"
cat > "/etc/postgresql/${PG_VER}/main/conf.d/10-miparner-512mb.conf" <<'CONF'
# Ajustes para un droplet de 512 MB. Ver deploy/bootstrap-droplet.sh.
shared_buffers = 48MB
effective_cache_size = 128MB
maintenance_work_mem = 32MB
work_mem = 2MB
max_connections = 20
# El backend abre pocas conexiones; más de 20 aquí solo reserva memoria ociosa.

# Escucha también en la red interna de Docker para que el contenedor del
# backend pueda conectarse. El cortafuegos impide el acceso desde internet.
listen_addresses = '*'
CONF
grep -q "conf.d" "$PG_CONF" || echo "include_dir = 'conf.d'" >> "$PG_CONF"

# Solo las redes privadas de Docker (172.16.0.0/12), y siempre con contraseña.
if ! grep -q "miparner-docker" "$PG_HBA"; then
  cat >> "$PG_HBA" <<'HBA'

# miparner-docker: acceso desde los contenedores del host. Nunca desde internet
# (el cortafuegos bloquea el 5432 hacia fuera).
host    all    all    172.16.0.0/12    scram-sha-256
HBA
fi
systemctl restart postgresql

# --------------------------------------------------------------------------
verde "6/9  Base de datos y usuario"
BD_PASS="$(openssl rand -hex 20)"   # hex: sin @ : / # que obliguen a URL-encodear
CREADA="no"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${BD_USUARIO}'" | grep -q 1; then
  aviso "El usuario ya existe: se le asigna una contraseña nueva."
  sudo -u postgres psql -qc "ALTER USER ${BD_USUARIO} WITH PASSWORD '${BD_PASS}';"
else
  sudo -u postgres psql -qc "CREATE USER ${BD_USUARIO} WITH PASSWORD '${BD_PASS}';"
  CREADA="si"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${BD_NOMBRE}'" | grep -q 1; then
  sudo -u postgres psql -qc "CREATE DATABASE ${BD_NOMBRE} OWNER ${BD_USUARIO};"
fi
sudo -u postgres psql -qd "${BD_NOMBRE}" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -qd "${BD_NOMBRE}" -c "GRANT ALL ON SCHEMA public TO ${BD_USUARIO};"
sudo -u postgres psql -qc "ALTER DATABASE ${BD_NOMBRE} OWNER TO ${BD_USUARIO};"
aviso "Base '${BD_NOMBRE}' lista con PostGIS."

# --------------------------------------------------------------------------
verde "7/9  Usuario de despliegue y llave SSH"
id -u "$USUARIO_DEPLOY" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$USUARIO_DEPLOY"
usermod -aG docker "$USUARIO_DEPLOY"

SSH_DIR="/home/${USUARIO_DEPLOY}/.ssh"
mkdir -p "$SSH_DIR"
LLAVE="${SSH_DIR}/id_ed25519"
LLAVE_NUEVA="no"
if [[ ! -f "$LLAVE" ]]; then
  ssh-keygen -t ed25519 -N "" -C "github-actions-miparner" -f "$LLAVE" >/dev/null
  cat "${LLAVE}.pub" >> "${SSH_DIR}/authorized_keys"
  LLAVE_NUEVA="si"
fi
chmod 700 "$SSH_DIR"; chmod 600 "${SSH_DIR}/authorized_keys"
chown -R "${USUARIO_DEPLOY}:${USUARIO_DEPLOY}" "$SSH_DIR"

mkdir -p "$APP_DIR"
chown -R "${USUARIO_DEPLOY}:${USUARIO_DEPLOY}" "$APP_DIR"
curl -fsSL "${REPO_RAW}/docker-compose.prod.yml" -o "${APP_DIR}/docker-compose.prod.yml" 2>/dev/null \
  && chown "${USUARIO_DEPLOY}:${USUARIO_DEPLOY}" "${APP_DIR}/docker-compose.prod.yml" \
  || aviso "No se pudo bajar docker-compose.prod.yml (aún no está en main). Lo subirá el despliegue."

# --------------------------------------------------------------------------
verde "8/9  Cortafuegos"
# El 22 SIEMPRE primero: activar ufw sin esa regla te deja fuera del servidor.
ufw allow 22/tcp   >/dev/null
ufw allow 80/tcp   >/dev/null
ufw allow 443/tcp  >/dev/null
ufw --force enable >/dev/null
aviso "Abiertos 22, 80 y 443. El 5432 queda cerrado desde internet."

# --------------------------------------------------------------------------
verde "9/9  Resumen"
DATABASE_URL="postgresql://${BD_USUARIO}:${BD_PASS}@host.docker.internal:5432/${BD_NOMBRE}?schema=public&connection_limit=5"

cat <<RESUMEN

--------------------------------------------------------------------------
Servidor listo. Ahora carga estos secretos en GitHub:
  Settings > Secrets and variables > Actions > New repository secret
--------------------------------------------------------------------------

DEPLOY_HOST         $(curl -fsS -4 ifconfig.me 2>/dev/null || echo "159.65.230.92")
DEPLOY_USER         ${USUARIO_DEPLOY}

DATABASE_URL
${DATABASE_URL}

JWT_ACCESS_SECRET
$(openssl rand -hex 32)

JWT_REFRESH_SECRET
$(openssl rand -hex 32)

RESUMEN

if [[ "$LLAVE_NUEVA" == "si" ]]; then
  cat <<LLAVETXT
DEPLOY_SSH_KEY      (copia TODO, incluidas las líneas BEGIN y END)

$(cat "$LLAVE")

LLAVETXT
else
  aviso "DEPLOY_SSH_KEY: la llave ya existía. Si no la guardaste, bórrala y vuelve a ejecutar:"
  aviso "  rm ${LLAVE} ${LLAVE}.pub && bash bootstrap.sh"
fi

cat <<'FINAL'
Faltan dos que defines tú:

MIPARNER_DOMINIO    tudominio.com      (vacío si aún usas la IP)
CORS_ORIGINS        https://tudominio.com

--------------------------------------------------------------------------
Después de cargarlos, un push a main despliega solo.

SEGURIDAD — dos cosas pendientes que dependen de ti:
  1. Cambia la contraseña de root:  passwd
  2. Cuando confirmes que entras con llave SSH, desactiva el acceso por
     contraseña (si lo haces antes, te quedas fuera del servidor):
       sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
       systemctl restart ssh
  3. Limpia esta pantalla: aquí quedaron impresos secretos.  clear
--------------------------------------------------------------------------
FINAL
