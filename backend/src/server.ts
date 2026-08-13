import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./realtime/socket";
import { prisma } from "./lib/prisma";

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`Rumbo backend escuchando en http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

// Cierre ordenado
async function shutdown(signal: string) {
  console.log(`\n${signal} recibido, cerrando...`);
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
