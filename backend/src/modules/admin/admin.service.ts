import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";

export async function listarUsuarios(rol?: string) {
  return prisma.usuario.findMany({
    where: rol ? { usuarioRol: rol } : undefined,
    orderBy: { usuarioId: "desc" },
    take: 200,
    select: {
      usuarioId: true,
      usuarioCorreo: true,
      usuarioNombre: true,
      usuarioRol: true,
      usuarioActivo: true,
      usuarioFechaCreacion: true,
      voluntarioPerfil: { select: { voluntarioValidado: true } },
    },
  });
}

export async function setEstadoUsuario(id: number, activo: boolean) {
  const usuario = await prisma.usuario.findUnique({ where: { usuarioId: id } });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");
  // Nunca se elimina físicamente: se activa/desactiva.
  return prisma.usuario.update({
    where: { usuarioId: id },
    data: {
      usuarioActivo: activo,
      usuarioFechaDesactivacion: activo ? null : new Date(),
    },
    select: { usuarioId: true, usuarioActivo: true },
  });
}

export async function validarVoluntario(adminId: number, usuarioId: number, validado: boolean) {
  const perfil = await prisma.voluntarioPerfil.findUnique({ where: { voluntarioUsuarioId: usuarioId } });
  if (!perfil) throw AppError.notFound("Perfil de voluntario no encontrado");
  return prisma.voluntarioPerfil.update({
    where: { voluntarioUsuarioId: usuarioId },
    data: { voluntarioValidado: validado, modifiedBy: adminId },
    select: { voluntarioUsuarioId: true, voluntarioValidado: true },
  });
}

export async function auditarViajes() {
  return prisma.viaje.findMany({
    orderBy: { viajeId: "desc" },
    take: 100,
    select: {
      viajeId: true,
      viajeEstado: true,
      viajeOrigenTexto: true,
      viajeDestinoTexto: true,
      viajeDeportistaId: true,
      viajeVoluntarioId: true,
      viajeSolicitadoAt: true,
      viajeFinAt: true,
      isDeleted: true,
      deportista: { select: { usuarioNombre: true } },
      voluntario: { select: { usuarioNombre: true } },
    },
  });
}

export async function logPanicos() {
  return prisma.panicoAlerta.findMany({
    orderBy: { panicoId: "desc" },
    take: 100,
    select: {
      panicoId: true,
      panicoEstado: true,
      panicoViajeId: true,
      createdAt: true,
      usuario: { select: { usuarioNombre: true, usuarioTelefono: true } },
    },
  });
}

export async function atenderPanico(adminId: number, id: number, estado: "atendida" | "falsa") {
  const panico = await prisma.panicoAlerta.findUnique({ where: { panicoId: id } });
  if (!panico) throw AppError.notFound("Alerta no encontrada");
  return prisma.panicoAlerta.update({
    where: { panicoId: id },
    data: { panicoEstado: estado, panicoAtendidoPor: adminId, modifiedBy: adminId },
    select: { panicoId: true, panicoEstado: true },
  });
}

// Métricas de flota para el panel
export async function metricas() {
  const [porEstado, porRol, voluntariosEnLinea, panicosActivos, totalViajes] = await Promise.all([
    prisma.viaje.groupBy({ by: ["viajeEstado"], _count: { _all: true }, where: { isDeleted: false } }),
    prisma.usuario.groupBy({ by: ["usuarioRol"], _count: { _all: true } }),
    prisma.voluntarioPerfil.count({ where: { voluntarioEnLinea: true } }),
    prisma.panicoAlerta.count({ where: { panicoEstado: "activa" } }),
    prisma.viaje.count({ where: { isDeleted: false } }),
  ]);

  return {
    totalViajes,
    voluntariosEnLinea,
    panicosActivos,
    viajesPorEstado: Object.fromEntries(porEstado.map((e) => [e.viajeEstado, e._count._all])),
    usuariosPorRol: Object.fromEntries(porRol.map((r) => [r.usuarioRol, r._count._all])),
  };
}
