import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { eliminarArchivo, rutaDe } from "../../lib/uploads";
import { comprimirAudio } from "../../lib/audio";
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
  mensajeAudioArchivo: true,
  mensajeAudioDuracion: true,
  mensajeAudioMime: true,
  mensajeModeradoAt: true,
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

/**
 * Envía un mensaje de voz. El binario ya quedó en disco (lo guardó multer);
 * aquí solo se registra el metadato. Si la conversación no admite el mensaje,
 * se borra el archivo para no dejar huérfanos.
 */
export async function enviarVoz(
  viajeId: number,
  actor: Actor,
  audio: { archivo: string; mime: string; duracion: number },
) {
  const { esParticipante, contraparte } = await contexto(viajeId, actor);
  if (!esParticipante) {
    eliminarArchivo(audio.archivo);
    throw AppError.forbidden("Solo el deportista y su voluntario pueden escribir");
  }
  if (!contraparte) {
    eliminarArchivo(audio.archivo);
    throw AppError.conflict("Todavía no hay un voluntario asignado a este acompañamiento");
  }

  // Recomprime a voz liviana y recorta a 60 s antes de dejarlo en la base.
  const comprimido = await comprimirAudio(audio);

  const mensaje = await prisma.mensaje.create({
    data: {
      mensajeViajeId: viajeId,
      mensajeEmisorId: actor.usuarioId,
      mensajeReceptorId: contraparte.usuarioId,
      mensajeAudioArchivo: comprimido.archivo,
      mensajeAudioDuracion: comprimido.duracion,
      mensajeAudioMime: comprimido.mime,
      createdBy: actor.usuarioId,
    },
    select: SELECT_MENSAJE,
  });

  emitToRide(viajeId, RIDE_EVENTS.MESSAGE_NEW, mensaje);
  emitToUsuario(contraparte.usuarioId, RIDE_EVENTS.MESSAGE_NEW, mensaje);
  return mensaje;
}

/**
 * Ubicación en disco del audio de un mensaje, validando que quien lo pide
 * participe en el acompañamiento (o sea admin). Reutiliza `contexto`, que
 * lanza si no corresponde.
 */
export async function audioDe(viajeId: number, mensajeId: number, actor: Actor) {
  await contexto(viajeId, actor);
  const mensaje = await prisma.mensaje.findFirst({
    where: { mensajeId, mensajeViajeId: viajeId },
    select: { mensajeAudioArchivo: true, mensajeAudioMime: true },
  });
  if (!mensaje?.mensajeAudioArchivo) throw AppError.notFound("Este mensaje no tiene audio");
  return {
    ruta: rutaDe(mensaje.mensajeAudioArchivo),
    mime: mensaje.mensajeAudioMime ?? "audio/mp4",
  };
}

/**
 * Un participante denuncia un mensaje de voz por lenguaje inapropiado. No se
 * puede reportar el audio propio ni un mensaje de texto. Es idempotente: si ya
 * hay un reporte pendiente del mismo usuario sobre ese audio, no crea otro.
 */
export async function reportar(
  viajeId: number,
  mensajeId: number,
  actor: Actor,
  motivo?: string,
) {
  await contexto(viajeId, actor);
  const mensaje = await prisma.mensaje.findFirst({
    where: { mensajeId, mensajeViajeId: viajeId },
    select: { mensajeId: true, mensajeEmisorId: true, mensajeAudioArchivo: true },
  });
  if (!mensaje) throw AppError.notFound("Mensaje no encontrado");
  if (!mensaje.mensajeAudioArchivo) {
    throw AppError.badRequest("Este mensaje no tiene un audio que reportar");
  }
  if (mensaje.mensajeEmisorId === actor.usuarioId) {
    throw AppError.badRequest("No puedes reportar tu propio audio");
  }

  const existente = await prisma.reporteAudio.findFirst({
    where: {
      reporteMensajeId: mensajeId,
      reporteReportanteId: actor.usuarioId,
      reporteEstado: "pendiente",
    },
    select: { reporteId: true },
  });
  if (existente) return { reporteId: existente.reporteId, yaReportado: true };

  const r = await prisma.reporteAudio.create({
    data: {
      reporteOrigen: "mensaje",
      reporteMensajeId: mensajeId,
      reporteViajeId: viajeId,
      reporteReportanteId: actor.usuarioId,
      reporteMotivo: motivo ?? null,
      createdBy: actor.usuarioId,
    },
    select: { reporteId: true },
  });
  return { reporteId: r.reporteId, yaReportado: false };
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
