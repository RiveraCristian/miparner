import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { esSesionCerrada, renovarToken, tokenVigente } from "./api";

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

  // El token que viajó en el último intento: si el servidor lo rechaza, es
  // ése el que hay que renovar (y no otro que ya se haya renovado entretanto).
  let tokenEnviado: string | null = null;
  const propio = io(SOCKET_URL, {
    transports: ["websocket"],
    // Función y no objeto: socket.io la llama en cada intento de conexión. Con
    // un objeto fijo, una reconexión media hora después mandaba el token de
    // acceso del arranque, ya vencido (dura quince minutos), y el servidor la
    // rechazaba.
    auth: (cb) => {
      tokenVigente()
        .then((token) => {
          tokenEnviado = token;
          cb({ token });
        })
        .catch(() => cb({ token: null }));
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
  });
  socket = propio;
  let reintentosRechazo = 0;

  // En cada (re)conexión, volver a entrar a todas las salas activas.
  propio.on("connect", () => {
    reintentosRechazo = 0;
    for (const rideId of salasActivas) propio.emit("join_ride", { rideId });
  });

  /*
   * Si el servidor rechaza el handshake (token vencido o revocado), socket.io
   * no reintenta por su cuenta: sin esto la persona se quedaba sin seguimiento
   * en vivo ni avisos de mensajes hasta reabrir la app. Se fuerza una
   * renovación y se vuelve a conectar con espera creciente. Si la renovación
   * la rechaza el servidor, la sesión se cierra y `disconnectSocket` corta el
   * ciclo.
   */
  propio.on("connect_error", (err) => {
    if (propio.active || err.message !== "unauthorized") return;
    const espera = Math.min(1000 * 2 ** reintentosRechazo, 30_000);
    reintentosRechazo++;
    void (async () => {
      try {
        await renovarToken(tokenEnviado);
      } catch (e) {
        if (esSesionCerrada(e)) return;
      }
      setTimeout(() => {
        if (socket === propio && !propio.connected) propio.connect();
      }, espera);
    })();
  });

  return propio;
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
