import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";

export async function setEstado(usuarioId: number, enLinea: boolean) {
  const perfil = await prisma.voluntarioPerfil.findUnique({ where: { voluntarioUsuarioId: usuarioId } });
  if (!perfil) throw AppError.notFound("Perfil de voluntario no encontrado");

  return prisma.voluntarioPerfil.update({
    where: { voluntarioUsuarioId: usuarioId },
    data: { voluntarioEnLinea: enLinea, modifiedBy: usuarioId },
    select: { voluntarioUsuarioId: true, voluntarioEnLinea: true },
  });
}

// La ubicación es una columna geography: se actualiza con SQL crudo.
export async function setUbicacion(usuarioId: number, lat: number, lng: number) {
  const filas = await prisma.$executeRaw`
    UPDATE voluntario_perfil
       SET voluntario_ubicacion = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
           voluntario_ubicacion_at = NOW(),
           modified_by = ${usuarioId}
     WHERE voluntario_usuario_id = ${usuarioId}`;
  if (filas === 0) throw AppError.notFound("Perfil de voluntario no encontrado");
  return { ok: true, lat, lng };
}

// Viajes solicitados cercanos a la ubicación actual del voluntario (ST_DWithin).
export async function solicitudesCercanas(usuarioId: number, radio: number) {
  return prisma.$queryRaw<
    {
      viaje_id: number;
      deportista_nombre: string;
      viaje_necesidades: string[];
      origen_lat: number;
      origen_lng: number;
      viaje_origen_texto: string | null;
      destino_lat: number;
      destino_lng: number;
      viaje_destino_texto: string | null;
      distancia_m: number;
    }[]
  >`
    SELECT v.viaje_id                          AS "viaje_id",
           u.usuario_nombre                    AS "deportista_nombre",
           v.viaje_necesidades                 AS "viaje_necesidades",
           ST_Y(v.viaje_origen::geometry)      AS "origen_lat",
           ST_X(v.viaje_origen::geometry)      AS "origen_lng",
           v.viaje_origen_texto                AS "viaje_origen_texto",
           ST_Y(v.viaje_destino::geometry)     AS "destino_lat",
           ST_X(v.viaje_destino::geometry)     AS "destino_lng",
           v.viaje_destino_texto               AS "viaje_destino_texto",
           ST_Distance(v.viaje_origen, vp.voluntario_ubicacion)::int AS "distancia_m"
      FROM viajes v
      JOIN voluntario_perfil vp ON vp.voluntario_usuario_id = ${usuarioId}
      JOIN usuarios u ON u.usuario_id = v.viaje_deportista_id
     WHERE v.is_deleted = false
       AND v.viaje_estado = 'solicitado'
       AND v.viaje_voluntario_id IS NULL
       AND vp.voluntario_ubicacion IS NOT NULL
       AND ST_DWithin(v.viaje_origen, vp.voluntario_ubicacion, ${radio})
     ORDER BY "distancia_m" ASC
     LIMIT 20`;
}

export async function getPerfil(usuarioId: number) {
  const perfil = await prisma.voluntarioPerfil.findUnique({
    where: { voluntarioUsuarioId: usuarioId },
    include: { usuario: { select: { usuarioNombre: true, usuarioCorreo: true } } },
  });
  if (!perfil) throw AppError.notFound("Perfil de voluntario no encontrado");
  const { voluntarioUbicacion: _omit, ...rest } = perfil as typeof perfil & { voluntarioUbicacion?: unknown };
  return rest;
}
