#!/usr/bin/env bash
# ==========================================================================
# Miparner — arregla el acceso del contenedor a PostgreSQL.
#
#   ssh root@159.65.230.92
#   curl -fsSL https://raw.githubusercontent.com/RiveraCristian/miparner/main/deploy/arreglar-postgres.sh -o arreglar.sh
#   bash arreglar.sh
#
# Por qué hace falta: la primera versión de bootstrap-droplet.sh dejaba dos
# cabos sueltos que hacían fallar la migración con
# "P1001: Can't reach database server at host.docker.internal:5432".
#
#  1. listen_addresses no llegaba a aplicarse. Se escribía en conf.d, pero en
#     Debian/Ubuntu `include_dir = 'conf.d'` está declarado ARRIBA del todo en
#     postgresql.conf, y más abajo el propio archivo fija
#     `listen_addresses = 'localhost'`. Como gana la última línea leída, el
#     ajuste quedaba pisado. Aquí se usa ALTER SYSTEM, que escribe en
#     postgresql.auto.conf: ese se lee el último y gana siempre.
#
#  2. El cortafuegos bloqueaba el 5432. ufw deniega todo lo entrante, y el
#     tráfico que va del contenedor al host pasa por la cadena INPUT, así que
#     también lo filtra. Se abre solo para el rango privado de Docker, nunca
#     para internet.
#
# Es idempotente y no toca datos.
# ==========================================================================
set -euo pipefail

verde() { printf '\n\033[1;32m== %s\033[0m\n' "$*"; }
aviso() { printf '\033[1;33m   %s\033[0m\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "Ejecuta este script como root."; exit 1; }

PG_VER="$(ls /etc/postgresql | sort -V | tail -1)"

# --------------------------------------------------------------------------
verde "Antes del arreglo"
echo "   listen_addresses : $(sudo -u postgres psql -tAc 'SHOW listen_addresses;' 2>/dev/null || echo '?')"
echo "   escuchando en    : $(ss -ltnp 2>/dev/null | grep ':5432' | awk '{print $4}' | paste -sd' ' || echo 'nada')"
echo "   regla ufw 5432   : $(ufw status 2>/dev/null | grep -c '5432' || true) coincidencia(s)"

# --------------------------------------------------------------------------
verde "1/3  PostgreSQL escucha también en la red de Docker"
# ALTER SYSTEM escribe postgresql.auto.conf, que se lee después de todo lo
# demás: es la única forma de que no lo pise el postgresql.conf de la distro.
sudo -u postgres psql -qc "ALTER SYSTEM SET listen_addresses = '*';"
systemctl restart postgresql
aviso "listen_addresses = $(sudo -u postgres psql -tAc 'SHOW listen_addresses;')"

# --------------------------------------------------------------------------
verde "2/3  Cortafuegos: permitir el 5432 solo desde los contenedores"
# 172.16.0.0/12 cubre 172.16-172.31, que es donde Docker crea sus redes.
# Internet sigue sin poder tocar el 5432.
ufw allow from 172.16.0.0/12 to any port 5432 proto tcp comment 'PostgreSQL desde contenedores Docker' >/dev/null
ufw reload >/dev/null
aviso "abierto para 172.16.0.0/12 · cerrado desde internet"

# --------------------------------------------------------------------------
verde "3/3  Comprobación desde un contenedor, como lo hará el backend"
PUERTA="$(ip route | awk '/default/ {print $3; exit}')"
DOCKER_IP="$(ip -4 addr show docker0 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1)"
echo "   puerta de enlace: ${PUERTA:-?} · docker0: ${DOCKER_IP:-?}"

if docker run --rm --add-host host.docker.internal:host-gateway postgres:16-alpine \
     pg_isready -h host.docker.internal -p 5432 2>&1 | tail -1; then
  aviso "El contenedor alcanza PostgreSQL."
else
  aviso "Todavía no responde. Revisa: ss -ltnp | grep 5432   y   ufw status"
fi

cat <<'FINAL'

--------------------------------------------------------------------------
Listo. Ahora relanza el despliegue en GitHub:
  Actions > "Desplegar a DigitalOcean" > Run workflow (rama main)

O empuja cualquier commit a main.
--------------------------------------------------------------------------
FINAL
