import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { hashPassword } from "../../lib/password";
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
      usuarioTelefono: true,
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

/**
 * Crea una cuenta desde el panel, con su perfil según el rol. Distinto del
 * registro público: lo hace un administrador, admite el rol "admin" y no emite
 * tokens de sesión.
 */
export async function crearUsuario(
  adminId: number,
  dto: {
    nombre: string;
    correo: string;
    password: string;
    telefono?: string;
    rol: "deportista" | "voluntario" | "admin";
  },
) {
  const existe = await prisma.usuario.findUnique({ where: { usuarioCorreo: dto.correo } });
  if (existe) throw AppError.conflict("El correo ya está registrado");

  const passwordHash = await hashPassword(dto.password);

  return prisma.$transaction(async (tx) => {
    const nuevo = await tx.usuario.create({
      data: {
        usuarioCorreo: dto.correo,
        usuarioNombre: dto.nombre,
        usuarioTelefono: dto.telefono ?? null,
        usuarioPassword: passwordHash,
        usuarioRol: dto.rol,
        usuarioProveedorAuth: "local",
      },
    });

    if (dto.rol === "deportista") {
      await tx.deportistaPerfil.create({
        data: { deportistaUsuarioId: nuevo.usuarioId, deportistaNecesidades: [], createdBy: adminId },
      });
    } else if (dto.rol === "voluntario") {
      await tx.voluntarioPerfil.create({
        data: { voluntarioUsuarioId: nuevo.usuarioId, createdBy: adminId },
      });
    }

    return {
      usuarioId: nuevo.usuarioId,
      usuarioNombre: nuevo.usuarioNombre,
      usuarioCorreo: nuevo.usuarioCorreo,
      usuarioTelefono: nuevo.usuarioTelefono,
      usuarioRol: nuevo.usuarioRol,
      usuarioActivo: nuevo.usuarioActivo,
    };
  });
}

/**
 * Edita los datos de una cuenta desde el panel (nombre, correo, teléfono, rol).
 * Si cambia el rol, crea el perfil correspondiente si aún no existe, para que la
 * cuenta quede consistente. La cuenta nunca se elimina desde aquí.
 */
export async function actualizarUsuario(
  adminId: number,
  id: number,
  dto: {
    nombre?: string;
    correo?: string;
    telefono?: string | null;
    rol?: "deportista" | "voluntario" | "admin";
  },
) {
  const usuario = await prisma.usuario.findUnique({ where: { usuarioId: id } });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");

  if (dto.correo && dto.correo !== usuario.usuarioCorreo) {
    const existe = await prisma.usuario.findUnique({ where: { usuarioCorreo: dto.correo } });
    if (existe) throw AppError.conflict("El correo ya está registrado");
  }

  return prisma.$transaction(async (tx) => {
    const actualizado = await tx.usuario.update({
      where: { usuarioId: id },
      data: {
        ...(dto.nombre !== undefined ? { usuarioNombre: dto.nombre } : {}),
        ...(dto.correo !== undefined ? { usuarioCorreo: dto.correo } : {}),
        ...(dto.telefono !== undefined ? { usuarioTelefono: dto.telefono } : {}),
        ...(dto.rol !== undefined ? { usuarioRol: dto.rol } : {}),
      },
      select: {
        usuarioId: true,
        usuarioNombre: true,
        usuarioCorreo: true,
        usuarioTelefono: true,
        usuarioRol: true,
        usuarioActivo: true,
      },
    });

    // Al cambiar de rol, asegura que exista el perfil del nuevo rol.
    if (dto.rol && dto.rol !== usuario.usuarioRol) {
      if (dto.rol === "deportista") {
        const perfil = await tx.deportistaPerfil.findUnique({ where: { deportistaUsuarioId: id } });
        if (!perfil) {
          await tx.deportistaPerfil.create({
            data: { deportistaUsuarioId: id, deportistaNecesidades: [], createdBy: adminId },
          });
        }
      } else if (dto.rol === "voluntario") {
        const perfil = await tx.voluntarioPerfil.findUnique({ where: { voluntarioUsuarioId: id } });
        if (!perfil) {
          await tx.voluntarioPerfil.create({
            data: { voluntarioUsuarioId: id, createdBy: adminId },
          });
        }
      }
    }

    return actualizado;
  });
}

/**
 * Elimina una cuenta de forma permanente.
 *
 * Reglas de seguridad:
 *  · No se puede eliminar la propia cuenta ni al último administrador activo.
 *  · Si la cuenta tiene historial compartido (acompañamientos o alertas), no se
 *    borra: se pide desactivarla para conservar los registros (un acompañamiento
 *    pertenece a dos personas). Las cuentas sin historial sí se eliminan, con
 *    todos sus datos propios.
 */
export async function eliminarUsuario(adminId: number, id: number) {
  if (id === adminId) throw AppError.badRequest("No puedes eliminar tu propia cuenta");

  const usuario = await prisma.usuario.findUnique({ where: { usuarioId: id } });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");

  if (usuario.usuarioRol === "admin") {
    const admins = await prisma.usuario.count({
      where: { usuarioRol: "admin", usuarioActivo: true },
    });
    if (admins <= 1) throw AppError.badRequest("No puedes eliminar al único administrador");
  }

  const [viajes, panicos] = await Promise.all([
    prisma.viaje.count({ where: { OR: [{ viajeDeportistaId: id }, { viajeVoluntarioId: id }] } }),
    prisma.panicoAlerta.count({ where: { panicoUsuarioId: id } }),
  ]);
  if (viajes > 0 || panicos > 0) {
    throw AppError.badRequest(
      "Esta cuenta tiene historial de acompañamientos o alertas. Desactívala en vez de eliminarla para conservar los registros.",
    );
  }

  await prisma.$transaction(async (tx) => {
    // Suelta las referencias donde esta persona actuó sobre otras cuentas.
    await tx.usuario.updateMany({ where: { usuarioValidadoPor: id }, data: { usuarioValidadoPor: null } });
    await tx.usuarioDocumento.updateMany({
      where: { documentoRevisadoPor: id },
      data: { documentoRevisadoPor: null },
    });

    // Borra lo que le pertenece.
    await tx.mensaje.deleteMany({ where: { OR: [{ mensajeEmisorId: id }, { mensajeReceptorId: id }] } });
    await tx.usuarioDocumento.deleteMany({ where: { documentoUsuarioId: id } });
    await tx.canje.deleteMany({ where: { canjeUsuarioId: id } });
    await tx.usuarioInsignia.deleteMany({ where: { usuarioInsigniaUsuarioId: id } });
    await tx.otpCodigo.deleteMany({ where: { otpUsuarioId: id } });
    await tx.refreshToken.deleteMany({ where: { refreshTokenUsuarioId: id } });
    await tx.deportistaPerfil.deleteMany({ where: { deportistaUsuarioId: id } });
    await tx.voluntarioPerfil.deleteMany({ where: { voluntarioUsuarioId: id } });

    await tx.usuario.delete({ where: { usuarioId: id } });
  });

  return { ok: true, usuarioId: id };
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
