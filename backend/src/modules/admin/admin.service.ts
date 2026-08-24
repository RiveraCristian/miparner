import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { documentosDelRol } from "../documentos/documentos.catalogo";

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
      usuarioEstadoValidacion: true,
      usuarioFechaCreacion: true,
      voluntarioPerfil: { select: { voluntarioValidado: true } },
      _count: { select: { documentos: { where: { isDeleted: false } } } },
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
      viajeComentario: true,
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
  const [
    porEstado,
    porRol,
    voluntariosEnLinea,
    panicosActivos,
    totalViajes,
    validacionesPendientes,
  ] = await Promise.all([
    prisma.viaje.groupBy({ by: ["viajeEstado"], _count: { _all: true }, where: { isDeleted: false } }),
    prisma.usuario.groupBy({ by: ["usuarioRol"], _count: { _all: true } }),
    prisma.voluntarioPerfil.count({ where: { voluntarioEnLinea: true } }),
    prisma.panicoAlerta.count({ where: { panicoEstado: "activa" } }),
    prisma.viaje.count({ where: { isDeleted: false } }),
    prisma.usuario.count({
      where: { usuarioEstadoValidacion: "pendiente", usuarioRol: { not: "admin" } },
    }),
  ]);

  return {
    totalViajes,
    voluntariosEnLinea,
    panicosActivos,
    validacionesPendientes,
    viajesPorEstado: Object.fromEntries(porEstado.map((e) => [e.viajeEstado, e._count._all])),
    usuariosPorRol: Object.fromEntries(porRol.map((r) => [r.usuarioRol, r._count._all])),
  };
}

// ============================================================
// Validación de cuentas
// ============================================================

const SELECT_DOCUMENTO = {
  documentoId: true,
  documentoTipo: true,
  documentoNombreOriginal: true,
  documentoMime: true,
  documentoTamano: true,
  documentoEstado: true,
  documentoObservacion: true,
  documentoRevisadoAt: true,
  createdAt: true,
} as const;

/**
 * Cola de validación: cuentas en el estado pedido, con los documentos que
 * subieron y qué les falta todavía. Las cuentas de administración no entran.
 */
export async function listarValidaciones(estado: string) {
  const usuarios = await prisma.usuario.findMany({
    where: { usuarioEstadoValidacion: estado, usuarioRol: { not: "admin" } },
    orderBy: { usuarioFechaCreacion: "asc" },
    take: 200,
    select: {
      usuarioId: true,
      usuarioNombre: true,
      usuarioCorreo: true,
      usuarioTelefono: true,
      usuarioRol: true,
      usuarioActivo: true,
      usuarioEstadoValidacion: true,
      usuarioMotivoRechazo: true,
      usuarioFechaCreacion: true,
      usuarioValidadoAt: true,
      deportistaPerfil: { select: { deportistaDisciplina: true, deportistaNecesidades: true } },
      voluntarioPerfil: {
        select: { voluntarioVehiculo: true, voluntarioPatente: true, voluntarioValidado: true },
      },
      documentos: {
        where: { isDeleted: false },
        orderBy: { documentoId: "desc" },
        select: SELECT_DOCUMENTO,
      },
    },
  });

  return usuarios.map((u) => {
    const requeridos = documentosDelRol(u.usuarioRol);
    const subidos = new Set(u.documentos.map((d) => d.documentoTipo));
    const faltantes = requeridos.filter((r) => r.obligatorio && !subidos.has(r.tipo));
    return {
      ...u,
      requeridos,
      faltantes: faltantes.map((f) => f.tipo),
      // Sin todos los documentos obligatorios no hay nada que revisar.
      listaParaRevision: faltantes.length === 0,
    };
  });
}

/**
 * Aprueba o rechaza una cuenta.
 *
 * Al aprobar, los documentos vigentes que seguían pendientes quedan aprobados
 * y, si es voluntario, se sincroniza `voluntario_validado` (lo usa el
 * matchmaking geoespacial). La cuenta no se elimina ni se desactiva aquí: el
 * rechazo solo bloquea la operación y explica por qué.
 */
export async function resolverValidacion(
  adminId: number,
  usuarioId: number,
  estado: "aprobado" | "rechazado",
  motivo?: string,
) {
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId },
    select: { usuarioId: true, usuarioRol: true },
  });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");
  if (usuario.usuarioRol === "admin") {
    throw AppError.badRequest("Las cuentas de administración no se validan");
  }

  const aprobado = estado === "aprobado";

  if (aprobado) {
    const requeridos = documentosDelRol(usuario.usuarioRol).filter((r) => r.obligatorio);
    const subidos = await prisma.usuarioDocumento.findMany({
      where: { documentoUsuarioId: usuarioId, isDeleted: false },
      select: { documentoTipo: true },
    });
    const tipos = new Set(subidos.map((d) => d.documentoTipo));
    const faltan = requeridos.filter((r) => !tipos.has(r.tipo));
    if (faltan.length) {
      throw AppError.badRequest(
        "Faltan documentos por subir: " + faltan.map((f) => f.titulo).join(", "),
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const actualizado = await tx.usuario.update({
      where: { usuarioId },
      data: {
        usuarioEstadoValidacion: estado,
        usuarioValidadoPor: adminId,
        usuarioValidadoAt: new Date(),
        usuarioMotivoRechazo: aprobado ? null : (motivo ?? null),
      },
      select: { usuarioId: true, usuarioEstadoValidacion: true, usuarioMotivoRechazo: true },
    });

    await tx.usuarioDocumento.updateMany({
      where: { documentoUsuarioId: usuarioId, isDeleted: false, documentoEstado: "pendiente" },
      data: {
        documentoEstado: estado,
        documentoRevisadoPor: adminId,
        documentoRevisadoAt: new Date(),
        modifiedBy: adminId,
      },
    });

    if (usuario.usuarioRol === "voluntario") {
      await tx.voluntarioPerfil.updateMany({
        where: { voluntarioUsuarioId: usuarioId },
        data: {
          voluntarioValidado: aprobado,
          // Un voluntario rechazado deja de estar disponible para el matchmaking.
          ...(aprobado ? {} : { voluntarioEnLinea: false }),
          modifiedBy: adminId,
        },
      });
    }

    return actualizado;
  });
}

/** Revisión documento a documento: permite pedir de nuevo solo uno. */
export async function revisarDocumento(
  adminId: number,
  documentoId: number,
  estado: "aprobado" | "rechazado",
  observacion?: string,
) {
  const doc = await prisma.usuarioDocumento.findUnique({ where: { documentoId } });
  if (!doc || doc.isDeleted) throw AppError.notFound("Documento no encontrado");

  return prisma.usuarioDocumento.update({
    where: { documentoId },
    data: {
      documentoEstado: estado,
      documentoObservacion: observacion ?? null,
      documentoRevisadoPor: adminId,
      documentoRevisadoAt: new Date(),
      modifiedBy: adminId,
    },
    select: SELECT_DOCUMENTO,
  });
}
