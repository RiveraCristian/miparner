import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { emitToRide, emitToUsuario, RIDE_EVENTS } from "../../realtime/socket";

interface Actor {
  usuarioId: number;
  rol: string;
}

const SELECT_MENSAJE = {
  mensajeId: true,
  mensajeViajeId: true,
  mensajeEmisorId: true,
  mensajeReceptorId: true,
  mensajeTexto: true,
  mensajeLeidoAt: true,
  createdAt: true,
} as const;

/**
 * La conversación vive dentro de un acompañamiento: solo hablan el deportista
 * y el voluntario asignado. El administrador puede leerla (auditoría) pero no
 * participa en ella.
 */
async function contexto(viajeId: number, actor: Actor) {
  const viaje = await prisma.viaje.findUnique({
    where: { viajeId },
    select: {
      viajeId: true,
      viajeEstado: true,
      viajeDeportistaId: true,
      viajeVoluntarioId: true,
      isDeleted: true,
      deportista: { select: { usuarioId: true, usuarioNombre: true, usuarioRol: true } },
      voluntario: { select: { usuarioId: true, usuarioNombre: true, usuarioRol: true } },
    },
  });
  if (!viaje || viaje.isDeleted) throw AppError.notFound("Acompañamiento no encontrado");

  const esDeportista = viaje.viajeDeportistaId === actor.usuarioId;
  const esVoluntario = viaje.viajeVoluntarioId === actor.usuarioId;
  if (!esDeportista && !esVoluntario && actor.rol !== "admin") {
    throw AppError.forbidden("No participas en este acompañamiento");
  }

  const contraparte = esDeportista ? viaje.voluntario : esVoluntario ? viaje.deportista : null;
  return { viaje, esParticipante: esDeportista || esVoluntario, contraparte };
}

/** Historial de la conversación. Al abrirla, lo recibido queda leído. */
export async function listar(viajeId: number, actor: Actor) {
  const { viaje, esParticipante, contraparte } = await contexto(viajeId, actor);

  const mensajes = await prisma.mensaje.findMany({
    where: { mensajeViajeId: viajeId },
    orderBy: { mensajeId: "asc" },
    take: 200,
    select: SELECT_MENSAJE,
  });

  if (esParticipante) {
    await prisma.mensaje.updateMany({
      where: { mensajeViajeId: viajeId, mensajeReceptorId: actor.usuarioId, mensajeLeidoAt: null },
      data: { mensajeLeidoAt: new Date(), modifiedBy: actor.usuarioId },
    });
  }

  return {
    viajeId,
    estado: viaje.viajeEstado,
    // Con quién se habla. Nulo mientras no haya voluntario asignado.
    contraparte: contraparte
      ? { usuarioId: contraparte.usuarioId, nombre: contraparte.usuarioNombre, rol: contraparte.usuarioRol }
      : null,
    mensajes,
  };
}

/** Envía un mensaje y lo empuja por socket a la sala del viaje y al receptor. */
export async function enviar(viajeId: number, actor: Actor, texto: string) {
  const { esParticipante, contraparte } = await contexto(viajeId, actor);
  if (!esParticipante) throw AppError.forbidden("Solo el deportista y su voluntario pueden escribir");
  if (!contraparte) {
    throw AppError.conflict("Todavía no hay un voluntario asignado a este acompañamiento");
  }

  const mensaje = await prisma.mensaje.create({
    data: {
      mensajeViajeId: viajeId,
      mensajeEmisorId: actor.usuarioId,
      mensajeReceptorId: contraparte.usuarioId,
      mensajeTexto: texto,
      createdBy: actor.usuarioId,
    },
    select: SELECT_MENSAJE,
  });

  emitToRide(viajeId, RIDE_EVENTS.MESSAGE_NEW, mensaje);
  emitToUsuario(contraparte.usuarioId, RIDE_EVENTS.MESSAGE_NEW, mensaje);
  return mensaje;
}

/** Marca como leídos los mensajes recibidos en un acompañamiento. */
export async function marcarLeidos(viajeId: number, actor: Actor) {
  const { esParticipante } = await contexto(viajeId, actor);
  if (!esParticipante) return { leidos: 0 };

  const res = await prisma.mensaje.updateMany({
    where: { mensajeViajeId: viajeId, mensajeReceptorId: actor.usuarioId, mensajeLeidoAt: null },
    data: { mensajeLeidoAt: new Date(), modifiedBy: actor.usuarioId },
  });
  return { leidos: res.count };
}

/** Contador para los distintivos de la app: total y desglose por viaje. */
export async function noLeidos(usuarioId: number) {
  const filas = await prisma.mensaje.groupBy({
    by: ["mensajeViajeId"],
    where: { mensajeReceptorId: usuarioId, mensajeLeidoAt: null },
    _count: { _all: true },
  });
  return {
    total: filas.reduce((a, f) => a + f._count._all, 0),
    porViaje: Object.fromEntries(filas.map((f) => [f.mensajeViajeId, f._count._all])),
  };
}
