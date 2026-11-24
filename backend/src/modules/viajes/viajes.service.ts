import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { eliminarArchivo, rutaDe } from "../../lib/uploads";
import { comprimirAudio } from "../../lib/audio";
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
  viaje_comentario: string | null;
  viaje_programado_at: Date | null;
  viaje_duracion_est_min: number | null;
  viaje_solicitado_at: Date;
  viaje_inicio_at: Date | null;
  viaje_fin_at: Date | null;
}

// Transiciones de estado permitidas.
/*
 * Transiciones permitidas.
 *
 * 'a_bordo' se llamaba así por pensar el servicio como un viaje en vehículo,
 * pero un acompañamiento puede ser a pie, en metro o en silla de ruedas y
 * entonces no hay ningún "bordo". 'en_accion' describe lo que de verdad pasa:
 * las dos personas ya están juntas y en marcha.
 *
 * Cancelar está disponible en todos los estados menos el final, y para las dos
 * partes: al voluntario le puede surgir algo igual que al deportista, y
 * obligarle a seguir sería peor que dejar al otro buscar a alguien más.
 */
const TRANSICIONES: Record<string, string[]> = {
  solicitado: ["cancelado"],
  asignado: ["en_camino", "cancelado"],
  en_camino: ["en_accion", "cancelado"],
  en_accion: ["finalizado", "cancelado"],
};

async function obtenerFila(viajeId: number): Promise<ViajeRow> {
  const filas = await prisma.$queryRaw<ViajeRow[]>`
    SELECT v.viaje_id, v.viaje_deportista_id, v.viaje_voluntario_id, v.viaje_estado,
           ST_Y(v.viaje_origen::geometry)  AS origen_lat,
           ST_X(v.viaje_origen::geometry)  AS origen_lng,
           ST_Y(v.viaje_destino::geometry) AS destino_lat,
           ST_X(v.viaje_destino::geometry) AS destino_lng,
           v.viaje_origen_texto, v.viaje_destino_texto, v.viaje_necesidades,
           v.viaje_comentario,
           v.viaje_programado_at, v.viaje_duracion_est_min,
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
    comentario: v.viaje_comentario,
    programadoAt: v.viaje_programado_at,
    duracionEstMin: v.viaje_duracion_est_min,
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
      viaje_origen_texto, viaje_destino_texto, viaje_destino_direccion, viaje_necesidades,
      viaje_comentario, viaje_programado_at, viaje_duracion_est_min, created_by
    ) VALUES (
      ${deportistaId}, 'solicitado',
      ST_SetSRID(ST_MakePoint(${dto.origen.lng}, ${dto.origen.lat}), 4326),
      ST_SetSRID(ST_MakePoint(${dto.destino.lng}, ${dto.destino.lat}), 4326),
      ${dto.origenTexto ?? null}, ${dto.destinoTexto ?? null},
      ${dto.destinoDireccion?.length ? dto.destinoDireccion : null},
      ${JSON.stringify(dto.necesidades ?? [])}::jsonb,
      ${dto.comentario?.length ? dto.comentario : null},
      ${dto.programadoAt ? new Date(dto.programadoAt) : null},
      ${dto.duracionEstMin ?? null}, ${deportistaId}
    ) RETURNING viaje_id`;
  const viajeId = filas[0].viaje_id;
  await crearEvento(viajeId, "solicitado", deportistaId);
  return mapViaje(await obtenerFila(viajeId));
}

/**
 * Adjunta (o reemplaza) la nota de voz de la solicitud. Solo el deportista
 * dueño puede hacerlo. El binario ya quedó en disco (lo guardó multer); si
 * había una nota previa se borra para no dejar archivos huérfanos.
 */
export async function adjuntarComentarioVoz(
  viajeId: number,
  deportistaId: number,
  audio: { archivo: string; mime: string; duracion: number },
) {
  const viaje = await prisma.viaje.findUnique({
    where: { viajeId },
    select: { viajeDeportistaId: true, isDeleted: true, viajeComentarioAudio: true },
  });
  if (!viaje || viaje.isDeleted) {
    eliminarArchivo(audio.archivo);
    throw AppError.notFound("Acompañamiento no encontrado");
  }
  if (viaje.viajeDeportistaId !== deportistaId) {
    eliminarArchivo(audio.archivo);
    throw AppError.forbidden("Solo puedes adjuntar una nota de voz a tu propia solicitud");
  }

  // Recomprime a voz liviana y recorta a 60 s antes de guardar.
  const comprimido = await comprimirAudio(audio);

  const anterior = viaje.viajeComentarioAudio;
  await prisma.viaje.update({
    where: { viajeId },
    data: {
      viajeComentarioAudio: comprimido.archivo,
      viajeComentarioAudioDuracion: comprimido.duracion,
      viajeComentarioAudioMime: comprimido.mime,
      // Una nota nueva reabre la posibilidad de oírla: limpia una moderación previa.
      viajeComentarioModeradoAt: null,
      modifiedBy: deportistaId,
    },
  });
  if (anterior) eliminarArchivo(anterior);

  return { viajeId, duracion: comprimido.duracion };
}

/**
 * Ubicación en disco de la nota de voz de una solicitud. La oye el dueño, el
 * voluntario asignado, el admin, o cualquier voluntario mientras la solicitud
 * siga abierta (para escucharla antes de aceptar, igual que la ve en la lista).
 */
export async function comentarioVozDe(viajeId: number, actor: Actor) {
  const viaje = await prisma.viaje.findUnique({
    where: { viajeId },
    select: {
      viajeDeportistaId: true,
      viajeVoluntarioId: true,
      viajeEstado: true,
      isDeleted: true,
      viajeComentarioAudio: true,
      viajeComentarioAudioMime: true,
    },
  });
  if (!viaje || viaje.isDeleted) throw AppError.notFound("Acompañamiento no encontrado");

  const esDueno = viaje.viajeDeportistaId === actor.usuarioId;
  const esAsignado = viaje.viajeVoluntarioId === actor.usuarioId;
  const esSolicitudAbierta =
    actor.rol === "voluntario" && viaje.viajeEstado === "solicitado" && viaje.viajeVoluntarioId === null;
  if (!esDueno && !esAsignado && !esSolicitudAbierta && actor.rol !== "admin") {
    throw AppError.forbidden("No puedes escuchar esta nota de voz");
  }

  if (!viaje.viajeComentarioAudio) throw AppError.notFound("Esta solicitud no tiene nota de voz");
  return {
    ruta: rutaDe(viaje.viajeComentarioAudio),
    mime: viaje.viajeComentarioAudioMime ?? "audio/mp4",
  };
}

/**
 * Denuncia la nota de voz de una solicitud por lenguaje inapropiado. La puede
 * reportar quien tiene derecho a oírla (voluntario asignado, voluntario de una
 * solicitud abierta o admin), nunca el propio deportista dueño. Idempotente por
 * usuario mientras el reporte siga pendiente.
 */
export async function reportarComentarioVoz(viajeId: number, actor: Actor, motivo?: string) {
  const viaje = await prisma.viaje.findUnique({
    where: { viajeId },
    select: {
      viajeDeportistaId: true,
      viajeVoluntarioId: true,
      viajeEstado: true,
      isDeleted: true,
      viajeComentarioAudio: true,
    },
  });
  if (!viaje || viaje.isDeleted) throw AppError.notFound("Acompañamiento no encontrado");
  if (!viaje.viajeComentarioAudio) throw AppError.badRequest("Esta solicitud no tiene nota de voz");

  const esDueno = viaje.viajeDeportistaId === actor.usuarioId;
  const esAsignado = viaje.viajeVoluntarioId === actor.usuarioId;
  const esSolicitudAbierta =
    actor.rol === "voluntario" && viaje.viajeEstado === "solicitado" && viaje.viajeVoluntarioId === null;
  if (esDueno) throw AppError.badRequest("No puedes reportar tu propia nota de voz");
  if (!esAsignado && !esSolicitudAbierta && actor.rol !== "admin") {
    throw AppError.forbidden("No puedes reportar esta nota de voz");
  }

  const existente = await prisma.reporteAudio.findFirst({
    where: {
      reporteOrigen: "solicitud",
      reporteViajeId: viajeId,
      reporteReportanteId: actor.usuarioId,
      reporteEstado: "pendiente",
    },
    select: { reporteId: true },
  });
  if (existente) return { reporteId: existente.reporteId, yaReportado: true };

  const r = await prisma.reporteAudio.create({
    data: {
      reporteOrigen: "solicitud",
      reporteViajeId: viajeId,
      reporteReportanteId: actor.usuarioId,
      reporteMotivo: motivo ?? null,
      createdBy: actor.usuarioId,
    },
    select: { reporteId: true },
  });
  return { reporteId: r.reporteId, yaReportado: false };
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
      viajeComentario: true,
      viajeProgramadoAt: true,
      viajeSolicitadoAt: true,
      viajeFinAt: true,
    },
  });
  return viajes;
}

/*
 * Destinos frecuentes del deportista.
 *
 * Antes el inicio mostraba tres botones escritos en el código ("Entrenamiento",
 * "Estadio", "Centro médico") que no decían qué lugar eran ni elegían nada: sólo
 * abrían el formulario vacío. Ahora salen de sus propios viajes, con nombre,
 * dirección y coordenadas, para que tocar uno deje el destino ya puesto.
 *
 * Cómo se agrupan, y por qué:
 *
 *  · Mismo nombre (sin distinguir mayúsculas) y coordenadas iguales a tres
 *    decimales, que son unos 100 m. Elegir dos veces el mismo lugar en el
 *    buscador da exactamente el mismo punto; el margen absorbe las variantes,
 *    y el nombre evita juntar dos sitios distintos que quedan enfrente.
 *  · De cada grupo se toman el nombre, el punto y la dirección del viaje más
 *    reciente: si el lugar cambió de nombre en el buscador, manda lo último.
 *  · Se ordena por cuántas veces se fue y, a igualdad, por la más reciente.
 *  · Se excluyen los viajes cancelados (muchas veces son un destino mal
 *    elegido) y los borrados. También los puntos marcados a mano en el mapa:
 *    su texto es siempre el mismo y como botón sería otra etiqueta genérica.
 */

/** Texto que la app pone al destino cuando se marca tocando el mapa. */
const TEXTO_PUNTO_MAPA = "Punto marcado en el mapa";
const MAX_DESTINOS_FRECUENTES = 4;

export async function destinosFrecuentes(deportistaId: number) {
  return prisma.$queryRaw<
    {
      nombre: string;
      direccion: string | null;
      lat: number;
      lng: number;
      veces: number;
      ultimaVez: Date;
    }[]
  >`
    WITH base AS (
      SELECT btrim(v.viaje_destino_texto)      AS nombre,
             v.viaje_destino_direccion         AS direccion,
             ST_Y(v.viaje_destino::geometry)   AS lat,
             ST_X(v.viaje_destino::geometry)   AS lng,
             v.viaje_solicitado_at             AS at
        FROM viajes v
       WHERE v.viaje_deportista_id = ${deportistaId}
         AND v.is_deleted = false
         AND v.viaje_estado <> 'cancelado'
         AND v.viaje_destino_texto IS NOT NULL
         AND btrim(v.viaje_destino_texto) <> ''
         AND btrim(v.viaje_destino_texto) <> ${TEXTO_PUNTO_MAPA}
    )
    SELECT (array_agg(nombre ORDER BY at DESC))[1]                                       AS nombre,
           (array_agg(direccion ORDER BY at DESC) FILTER (WHERE direccion IS NOT NULL))[1] AS direccion,
           (array_agg(lat ORDER BY at DESC))[1]                                          AS lat,
           (array_agg(lng ORDER BY at DESC))[1]                                          AS lng,
           count(*)::int                                                                 AS veces,
           max(at)                                                                       AS "ultimaVez"
      FROM base
     GROUP BY lower(nombre), round(lat::numeric, 3), round(lng::numeric, 3)
     ORDER BY veces DESC, "ultimaVez" DESC
     LIMIT ${MAX_DESTINOS_FRECUENTES}`;
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
