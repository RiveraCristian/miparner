import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { loadToken } from "./api";

let socket: Socket | null = null;

/**
 * Salas de viaje a las que el cliente pertenece ahora mismo.
 *
 * El backend pierde la pertenencia a la sala cuando el socket se reconecta
 * (cada reconexión es un socket nuevo, con su lista de salas vacía). Si no
 * volvemos a unirnos, quien solo escucha —el deportista siguiendo a su
 * voluntario— deja de recibir `position_update` y "se pierde el seguimiento".
 * Por eso guardamos las salas activas y las re-unimos en cada `connect`.
 */
const salasActivas = new Set<number>();

// Conexión con reconexión exponencial (backoff) según el pliego.
export async function connectSocket(): Promise<Socket> {
  // Reutiliza el socket existente (conectado o reconectando): nunca dos.
  if (socket) return socket;

  const token = await loadToken();
  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
  });

  // En cada (re)conexión, volver a entrar a todas las salas activas.
  socket.on("connect", () => {
    for (const rideId of salasActivas) socket?.emit("join_ride", { rideId });
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinRide(rideId: number) {
  salasActivas.add(rideId);
  socket?.emit("join_ride", { rideId });
}
export function leaveRide(rideId: number) {
  salasActivas.delete(rideId);
  socket?.emit("leave_ride", { rideId });
}
export function emitPosition(rideId: number, lat: number, lng: number) {
  socket?.emit("position_update", { rideId, lat, lng });
}
export function emitPanic(rideId: number | undefined, lat?: number, lng?: number) {
  socket?.emit("panic_alert", { rideId, lat, lng });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  salasActivas.clear();
}
