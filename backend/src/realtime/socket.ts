import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "../lib/jwt";

// Eventos del canal tiempo real (salas por viaje).
export const RIDE_EVENTS = {
  JOIN: "join_ride",
  LEAVE: "leave_ride",
  POSITION_UPDATE: "position_update",
  TRIP_STATUS_CHANGE: "trip_status_change",
  PANIC_ALERT: "panic_alert",
} as const;

const rideRoom = (rideId: number | string) => `ride:${rideId}`;
const ADMIN_ROOM = "admins";

interface SocketUser {
  usuarioId: number;
  rol: string;
}

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins.length ? env.corsOrigins : true, credentials: true },
  });

  // Autenticación del handshake: token en auth.token o Authorization.
  io.use((socket, next) => {
    const raw =
      (socket.handshake.auth?.token as string | undefined) ??
      socket.handshake.headers.authorization?.replace("Bearer ", "");
    if (!raw) return next(new Error("unauthorized"));
    try {
      const payload = verifyAccessToken(raw);
      (socket.data as { user: SocketUser }).user = { usuarioId: payload.sub, rol: payload.rol };
      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket.data as { user: SocketUser }).user;
    if (user.rol === "admin") socket.join(ADMIN_ROOM);

    socket.on(RIDE_EVENTS.JOIN, (payload: { rideId: number }, ack?: (r: unknown) => void) => {
      if (!payload?.rideId) return ack?.({ ok: false, error: "rideId requerido" });
      socket.join(rideRoom(payload.rideId));
      ack?.({ ok: true });
    });

    socket.on(RIDE_EVENTS.LEAVE, (payload: { rideId: number }) => {
      if (payload?.rideId) socket.leave(rideRoom(payload.rideId));
    });

    // Posición del voluntario/deportista → se difunde a la sala del viaje.
    socket.on(
      RIDE_EVENTS.POSITION_UPDATE,
      (payload: { rideId: number; lat: number; lng: number }) => {
        if (!payload?.rideId) return;
        socket.to(rideRoom(payload.rideId)).emit(RIDE_EVENTS.POSITION_UPDATE, {
          rideId: payload.rideId,
          usuarioId: user.usuarioId,
          lat: payload.lat,
          lng: payload.lng,
          at: new Date().toISOString(),
        });
      },
    );

    // Cambio de estado del viaje → se difunde a la sala.
    socket.on(
      RIDE_EVENTS.TRIP_STATUS_CHANGE,
      (payload: { rideId: number; estado: string }) => {
        if (!payload?.rideId) return;
        io?.to(rideRoom(payload.rideId)).emit(RIDE_EVENTS.TRIP_STATUS_CHANGE, {
          rideId: payload.rideId,
          estado: payload.estado,
          at: new Date().toISOString(),
        });
      },
    );

    // Alerta de pánico → sala del viaje + administradores.
    socket.on(
      RIDE_EVENTS.PANIC_ALERT,
      (payload: { rideId?: number; lat?: number; lng?: number }) => {
        const evento = {
          usuarioId: user.usuarioId,
          rideId: payload?.rideId ?? null,
          lat: payload?.lat ?? null,
          lng: payload?.lng ?? null,
          at: new Date().toISOString(),
        };
        if (payload?.rideId) io?.to(rideRoom(payload.rideId)).emit(RIDE_EVENTS.PANIC_ALERT, evento);
        io?.to(ADMIN_ROOM).emit(RIDE_EVENTS.PANIC_ALERT, evento);
      },
    );
  });

  return io;
}

// Permite a los servicios REST empujar eventos a las salas (p. ej. al asignar
// un voluntario o registrar un pánico por endpoint asíncrono).
export function emitToRide(rideId: number, event: string, data: unknown) {
  io?.to(rideRoom(rideId)).emit(event, data);
}

export function emitToAdmins(event: string, data: unknown) {
  io?.to(ADMIN_ROOM).emit(event, data);
}
