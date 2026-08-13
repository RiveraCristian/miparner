import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Destino del backend. Por defecto el puerto documentado; se puede apuntar a otro
// con BACKEND_URL cuando el 4000 esté ocupado por otro proyecto.
//   BACKEND_URL=http://localhost:4100 npm run dev
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/socket.io": { target: BACKEND, ws: true },
    },
  },
});
