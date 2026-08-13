import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { loadToken } from "./api";

let socket: Socket | null = null;

// Conexión con reconexión exponencial (backoff) según el pliego.
export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
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
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinRide(rideId: number) {
  socket?.emit("join_ride", { rideId });
}
export function leaveRide(rideId: number) {
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
}
