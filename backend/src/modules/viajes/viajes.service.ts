import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { emitToRide, RIDE_EVENTS } from "../../realtime/socket";
import { otorgarPuntosPorViaje } from "../gamificacion/gamificacion.service";
import type { SolicitarDto } from "./viajes.schemas";

interface Actor {
  usuarioId: number;
  rol: string;
}

interface ViajeRow {
  viaje_id: number;
  viaje_deportista_id: number;
  viaje_voluntario_id: number | null;
  viaje_estado: string;
  origen_lat: number;
  origen_lng: number;
  destino_lat: number;
  destino_lng: number;
  viaje_origen_texto: string | null;
  viaje_destino_texto: string | null;
  viaje_necesidades: unknown;
  viaje_solicitado_at: Date;
  viaje_inicio_at: Date | null;
  viaje_fin_at: Date | null;
}

// Transiciones de estado permitidas.
const TRANSICIONES: Record<string, string[]> = {
  solicitado: ["cancelado"],
  asignado: ["en_camino", "cancelado"],
  en_camino: ["a_bordo", "cancelado"],
  a_bordo: ["finalizado", "cancelado"],
};

async function obtenerFila(viajeId: number): Promise<ViajeRow> {
  const filas = await prisma.$queryRaw<ViajeRow[]>`
    SELECT v.viaje_id, v.viaje_deportista_id, v.viaje_voluntario_id, v.viaje_estado,
           ST_Y(v.viaje_origen::geometry)  AS origen_lat,
           ST_X(v.viaje_origen::geometry)  AS origen_lng,
           ST_Y(v.viaje_destino::geometry) AS destino_lat,
           ST_X(v.viaje_destino::geometry) AS destino_lng,
           v.viaje_origen_texto, v.viaje_destino_texto, v.viaje_necesidades,
           v.viaje_solicitado_at, v.viaje_inicio_at, v.viaje_fin_at
      FROM viajes v
     WHERE v.viaje_id = ${viajeId} AND v.is_deleted = false`;
  const fila = filas[0];
  if (!fila) throw AppError.notFound("Viaje no encontrado");
  return fila;
}

function mapViaje(v: ViajeRow) {
  return {
    viajeId: v.viaje_id,
    deportistaId: v.viaje_deportista_id,
    voluntarioId: v.viaje_voluntario_id,
    estado: v.viaje_estado,
    origen: { lat: v.origen_lat, lng: v.origen_lng, texto: v.viaje_origen_texto },
    destino: { lat: v.destino_lat, lng: v.destino_lng, texto: v.viaje_destino_texto },
    necesidades: v.viaje_necesidades ?? [],
    solicitadoAt: v.viaje_solicitado_at,
    inicioAt: v.viaje_inicio_at,
    finAt: v.viaje_fin_at,
  };
}

function assertPuedeVer(v: ViajeRow, actor: Actor) {
  const permitido =
    actor.rol === "admin" ||
    v.viaje_deportista_id === actor.usuarioId ||
    v.viaje_voluntario_id === actor.usuarioId;
  if (!permitido) throw AppError.forbidden("No puedes acceder a este viaje");
}

async function crearEvento(viajeId: number, tipo: string, actorId: number, detalle?: unknown) {
  await prisma.viajeEvento.create({
    data: {
      viajeEventoViajeId: viajeId,
      viajeEventoTipo: tipo,
      viajeEventoDetalle: (detalle ?? undefined) as never,
      createdBy: actorId,
    },
  });
}

// --- Solicitar viaje (deportista) ---
export async function solicitar(deportistaId: number, dto: SolicitarDto) {
  const filas = await prisma.$queryRaw<{ viaje_id: number }[]>`
    INSERT INTO viajes (
      viaje_deportista_id, viaje_estado, viaje_origen, viaje_destino,
      viaje_origen_texto, viaje_destino_texto, viaje_necesidades, created_by
    ) VALUES (
      ${deportistaId}, 'solicitado',
      ST_SetSRID(ST_MakePoint(${dto.origen.lng}, ${dto.origen.lat}), 4326),
      ST_SetSRID(ST_MakePoint(${dto.destino.lng}, ${dto.destino.lat}), 4326),
      ${dto.origenTexto ?? null}, ${dto.destinoTexto ?? null},
      ${JSON.stringify(dto.necesidades ?? [])}::jsonb, ${deportistaId}
    ) RETURNING viaje_id`;
  const viajeId = filas[0].viaje_id;
  await crearEvento(viajeId, "solicitado", deportistaId);
  return mapViaje(await obtenerFila(viajeId));
}

export async function getDetalle(viajeId: number, actor: Actor) {
  const fila = await obtenerFila(viajeId);
  assertPuedeVer(fila, actor);
  const eventos = await prisma.viajeEvento.findMany({
    where: { viajeEventoViajeId: viajeId },
    orderBy: { viajeEventoId: "asc" },
    select: { viajeEventoTipo: true, viajeEventoDetalle: true, createdAt: true },
  });
  return { ...mapViaje(fila), eventos };
}

export async function listarMios(actor: Actor) {
  const viajes = await prisma.viaje.findMany({
    where: {
      isDeleted: false,
      OR: [{ viajeDeportistaId: actor.usuarioId }, { viajeVoluntarioId: actor.usuarioId }],
    },
    orderBy: { viajeSolicitadoAt: "desc" },
    take: 50,
    select: {
      viajeId: true,
      viajeEstado: true,
      viajeDeportistaId: true,
      viajeVoluntarioId: true,
      viajeOrigenTexto: true,
      viajeDestinoTexto: true,
      viajeSolicitadoAt: true,
    },
  });
  return viajes;
}

// --- Matchmaking: voluntarios cercanos al origen (ST_DWithin) ---
export async function candidatos(viajeId: number, actor: Actor, radio: number) {
  const fila = await obtenerFila(viajeId);
  assertPuedeVer(fila, actor);

  return prisma.$queryRaw<
    { usuarioId: number; nombre: string; vehiculo: string | null; distanciaM: number }[]
  >`
    SELECT vp.voluntario_usuario_id AS "usuarioId",
           u.usuario_nombre         AS "nombre",
           vp.voluntario_vehiculo   AS "vehiculo",
           ST_Distance(vp.voluntario_ubicacion, v.viaje_origen)::int AS "distanciaM"
      FROM viajes v
      JOIN voluntario_perfil vp
        ON vp.voluntario_en_linea = true
       AND vp.voluntario_validado = true
       AND vp.voluntario_ubicacion IS NOT NULL
      JOIN usuarios u
        ON u.usuario_id = vp.voluntario_usuario_id AND u.usuario_activo = true
     WHERE v.viaje_id = ${viajeId}
       AND ST_DWithin(vp.voluntario_ubicacion, v.viaje_origen, ${radio})
     ORDER BY "distanciaM" ASC
     LIMIT 10`;
}

// --- Voluntario acepta el viaje ---
export async function aceptar(viajeId: number, voluntarioId: number) {
  const fila = await obtenerFila(viajeId);
  if (fila.viaje_estado !== "solicitado" || fila.viaje_voluntario_id) {
    throw AppError.conflict("El viaje ya no está disponible");
  }
  await prisma.viaje.update({
    where: { viajeId },
    data: { viajeVoluntarioId: voluntarioId, viajeEstado: "asignado", modifiedBy: voluntarioId },
  });
  await crearEvento(viajeId, "asignado", voluntarioId);
  emitToRide(viajeId, RIDE_EVENTS.TRIP_STATUS_CHANGE, {
    rideId: viajeId,
    estado: "asignado",
    voluntarioId,
    at: new Date().toISOString(),
  });
  return mapViaje(await obtenerFila(viajeId));
}

// --- Cambio de estado (voluntario / deportista / admin) ---
export async function cambiarEstado(viajeId: number, actor: Actor, estado: string) {
  const fila = await obtenerFila(viajeId);
  assertPuedeVer(fila, actor);

  const permitidas = TRANSICIONES[fila.viaje_estado] ?? [];
  if (!permitidas.includes(estado)) {
    throw AppError.badRequest(`Transición no permitida: ${fila.viaje_estado} → ${estado}`);
  }

  const data: Record<string, unknown> = { viajeEstado: estado, modifiedBy: actor.usuarioId };
  if (estado === "en_camino") data.viajeInicioAt = new Date();
  if (estado === "finalizado" || estado === "cancelado") data.viajeFinAt = new Date();

  await prisma.viaje.update({ where: { viajeId }, data });
  await crearEvento(viajeId, estado, actor.usuarioId);

  emitToRide(viajeId, RIDE_EVENTS.TRIP_STATUS_CHANGE, {
    rideId: viajeId,
    estado,
    at: new Date().toISOString(),
  });

  // Al finalizar: otorgar puntos de gamificación a ambos.
  if (estado === "finalizado") {
    await otorgarPuntosPorViaje(fila.viaje_deportista_id, fila.viaje_voluntario_id);
  }

  return mapViaje(await obtenerFila(viajeId));
}

// --- Registrar posición (persistencia diferida + emisión) ---
export async function registrarPosicion(viajeId: number, actor: Actor, lat: number, lng: number) {
  const fila = await obtenerFila(viajeId);
  assertPuedeVer(fila, actor);
  await prisma.$executeRaw`
    INSERT INTO viaje_evento (viaje_evento_viaje_id, viaje_evento_tipo, viaje_evento_posicion, created_by)
    VALUES (${viajeId}, 'position_update', ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), ${actor.usuarioId})`;
  emitToRide(viajeId, RIDE_EVENTS.POSITION_UPDATE, {
    rideId: viajeId,
    usuarioId: actor.usuarioId,
    lat,
    lng,
    at: new Date().toISOString(),
  });
  return { ok: true };
}

// --- Soft delete (deportista dueño o admin) ---
export async function eliminar(viajeId: number, actor: Actor) {
  const fila = await obtenerFila(viajeId);
  if (actor.rol !== "admin" && fila.viaje_deportista_id !== actor.usuarioId) {
    throw AppError.forbidden();
  }
  await prisma.viaje.update({
    where: { viajeId },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy: actor.usuarioId },
  });
  return { ok: true };
}
