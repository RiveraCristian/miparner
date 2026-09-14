# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
# openssl es requerido por los engines de Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# El seed vive en prisma/, fuera del rootDir del build principal, así que se
# compila aparte. Se ejecuta con `node` en el despliegue porque la imagen de
# producción no lleva tsx (es dependencia de desarrollo).
RUN npx tsc prisma/seed.ts --outDir dist-seed --module commonjs --target ES2022 --esModuleInterop --skipLibCheck --resolveJsonModule

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-seed ./dist-seed
COPY prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
