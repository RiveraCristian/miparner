import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

// Eventos del canal tiempo real (salas por viaje).
export const RIDE_EVENTS = {
  JOIN: "join_ride",
  LEAVE: "leave_ride",
  POSITION_UPDATE: "position_update",
  TRIP_STATUS_CHANGE: "trip_status_change",
  PANIC_ALERT: "panic_alert",
  MESSAGE_NEW: "mensaje_nuevo",
} as const;

const rideRoom = (rideId: number | string) => `ride:${rideId}`;
const userRoom = (usuarioId: number) => `usuario:${usuarioId}`;
const ADMIN_ROOM = "admins";

interface SocketUser {
  usuarioId: number;
  rol: string;
}

let io: Server | null = null;

/**
 * ¿Esta persona participa en este acompañamiento?
 *
 * La sala de un viaje transporta la ubicación en vivo de personas vulnerables:
 * entrar a ella tiene que costar lo mismo que leer el viaje por REST. Solo el
 * deportista, su voluntario asignado y los administradores.
 */
async function puedeEntrarAlViaje(user: SocketUser, rideId: number): Promise<boolean> {
  if (user.rol === "admin") return true;
  const viaje = await prisma.viaje.findFirst({
    where: {
      viajeId: rideId,
      isDeleted: false,
      OR: [{ viajeDeportistaId: user.usuarioId }, { viajeVoluntarioId: user.usuarioId }],
    },
    select: { viajeId: true },
  });
  return viaje !== null;
}

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
    // Sala propia: permite avisar de un mensaje nuevo aunque la persona no
    // tenga abierta la pantalla del acompañamiento.
    socket.join(userRoom(user.usuarioId));

    /**
     * Viajes cuya pertenencia ya se comprobó en esta conexión.
     *
     * Sirve de caché y de autorización a la vez: emitir a una sala exige estar
     * en este conjunto. Se consulta la base una sola vez por viaje y socket,
     * así que un cliente que reporta posición antes de que termine el
     * `join_ride` no pierde el evento ni se salta la comprobación.
     */
    const salas = new Set<number>();

    async function asegurarSala(rideId: number): Promise<boolean> {
      if (salas.has(rideId)) return true;
      if (!(await puedeEntrarAlViaje(user, rideId))) return false;
      salas.add(rideId);
      socket.join(rideRoom(rideId));
      return true;
    }

    socket.on(RIDE_EVENTS.JOIN, async (payload: { rideId: number }, ack?: (r: unknown) => void) => {
      if (!payload?.rideId) return ack?.({ ok: false, error: "rideId requerido" });
      const ok = await asegurarSala(payload.rideId);
      ack?.(ok ? { ok: true } : { ok: false, error: "forbidden" });
    });

    socket.on(RIDE_EVENTS.LEAVE, (payload: { rideId: number }) => {
      if (!payload?.rideId) return;
      salas.delete(payload.rideId);
      socket.leave(rideRoom(payload.rideId));
    });

    // Posición del voluntario/deportista → se difunde a la sala del viaje.
    socket.on(
      RIDE_EVENTS.POSITION_UPDATE,
      async (payload: { rideId: number; lat: number; lng: number }) => {
        if (!payload?.rideId) return;
        if (!(await asegurarSala(payload.rideId))) return;
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
      async (payload: { rideId: number; estado: string }) => {
        if (!payload?.rideId) return;
        if (!(await asegurarSala(payload.rideId))) return;
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
      async (payload: { rideId?: number; lat?: number; lng?: number }) => {
        const evento = {
          usuarioId: user.usuarioId,
          rideId: payload?.rideId ?? null,
          lat: payload?.lat ?? null,
          lng: payload?.lng ?? null,
          at: new Date().toISOString(),
        };
        // A los administradores siempre: el pánico no se queda esperando una
        // comprobación de pertenencia.
        io?.to(ADMIN_ROOM).emit(RIDE_EVENTS.PANIC_ALERT, evento);
        if (payload?.rideId && (await asegurarSala(payload.rideId))) {
          io?.to(rideRoom(payload.rideId)).emit(RIDE_EVENTS.PANIC_ALERT, evento);
        }
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

// Aviso dirigido a una persona concreta, esté donde esté en la app.
export function emitToUsuario(usuarioId: number, event: string, data: unknown) {
  io?.to(userRoom(usuarioId)).emit(event, data);
}
