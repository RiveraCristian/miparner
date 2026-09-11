# ==========================================================================
# Miparner — panel de administración y landing.
#
# Se construye en GitHub Actions, nunca en el droplet: el build de Vite no
# cabe en 512 MB de RAM. Lo que llega al servidor es la imagen ya hecha.
#
# La imagen final es Caddy con los estáticos dentro. Caddy sirve el panel,
# reenvía /api y /socket.io al backend y gestiona el certificado HTTPS, todo
# en un solo proceso. Node no sobrevive a esta etapa.
# ==========================================================================

# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Capa de dependencias aparte: mientras package-lock.json no cambie, Actions
# reutiliza esta capa y el despliegue baja de minutos a segundos.
COPY package*.json ./
RUN npm ci

COPY . .
# `npm run build` corre `tsc --noEmit` antes de Vite: si el tipado no compila,
# el despliegue se detiene aquí y no llega nada roto al servidor.
RUN npm run build

# ---- runtime ----
FROM caddy:2.8-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 80 443
