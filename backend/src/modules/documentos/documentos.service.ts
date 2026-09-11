import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { eliminarArchivo, rutaDe } from "../../lib/uploads";
import { admiteVideollamada, evaluarGrupos, tipoPermitidoParaRol } from "./documentos.catalogo";

/** Campos que se devuelven al dueño y al panel: nunca la ruta en disco. */
const SELECT_PUBLICO = {
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

export async function listarMios(usuarioId: number) {
  return prisma.usuarioDocumento.findMany({
    where: { documentoUsuarioId: usuarioId, isDeleted: false },
    orderBy: { documentoId: "desc" },
    select: SELECT_PUBLICO,
  });
}

/**
 * Estado completo de la validación de una persona: qué documentos le piden,
 * cuáles ya subió y si su solicitud está lista para revisión.
 */
export async function estadoValidacion(usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId },
    select: {
      usuarioRol: true,
      usuarioEstadoValidacion: true,
      usuarioMotivoRechazo: true,
      usuarioValidadoAt: true,
      usuarioVerificacionVia: true,
      usuarioVerificacionDisponibilidad: true,
      usuarioVerificacionNota: true,
    },
  });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");

  const subidos = await listarMios(usuarioId);
  const porTipo = new Map(subidos.map((d) => [d.documentoTipo, d]));

  const { grupos, faltantes, completo } = evaluarGrupos(
    usuario.usuarioRol,
    subidos.map((d) => d.documentoTipo),
    usuario.usuarioVerificacionVia,
  );

  return {
    estadoValidacion: usuario.usuarioEstadoValidacion,
    motivoRechazo: usuario.usuarioMotivoRechazo,
    validadoAt: usuario.usuarioValidadoAt,
    verificacionVia: usuario.usuarioVerificacionVia,
    verificacionDisponibilidad: usuario.usuarioVerificacionDisponibilidad,
    verificacionNota: usuario.usuarioVerificacionNota,
    admiteVideollamada: admiteVideollamada(usuario.usuarioRol),
    // Cada grupo con el documento que lo cubre, si lo hay.
    grupos: grupos.map((g) => ({
      ...g,
      documento: g.tipoCubierto ? (porTipo.get(g.tipoCubierto) ?? null) : null,
    })),
    faltantes,
    // Solo cuando no falta ningun grupo el equipo puede revisar la cuenta.
    listaParaRevision: completo,
  };
}

/**
 * Pide acreditarse por videollamada, sin subir documentos.
 *
 * No valida la cuenta: la deja lista para que el equipo la revise, con la
 * disponibilidad horaria que la persona indique. Quien aprueba sigue siendo
 * un administrador, despues de hablar con ella.
 */
export async function pedirVideollamada(usuarioId: number, disponibilidad: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId },
    select: { usuarioRol: true, usuarioEstadoValidacion: true },
  });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");
  if (!admiteVideollamada(usuario.usuarioRol)) {
    throw AppError.badRequest("Tu tipo de cuenta necesita acreditarse con documentos");
  }

  await prisma.usuario.update({
    where: { usuarioId },
    data: {
      usuarioVerificacionVia: "videollamada",
      usuarioVerificacionDisponibilidad: disponibilidad,
      // Pedir la videollamada reabre la revision si la cuenta venia rechazada.
      ...(usuario.usuarioEstadoValidacion !== "aprobado"
        ? { usuarioEstadoValidacion: "pendiente", usuarioMotivoRechazo: null }
        : {}),
    },
  });

  return estadoValidacion(usuarioId);
}

interface ArchivoSubido {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Guarda el documento. Si ya había uno vigente del mismo tipo, el anterior se
 * marca eliminado (nunca se borra el registro) y su binario se descarta.
 *
 * Subir un documento nuevo devuelve la cuenta a 'pendiente': si venía
 * rechazada, vuelve sola a la cola del panel de administración.
 */
export async function subir(usuarioId: number, tipo: string, archivo: ArchivoSubido) {
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId },
    select: { usuarioRol: true, usuarioEstadoValidacion: true },
  });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");

  if (!tipoPermitidoParaRol(usuario.usuarioRol, tipo)) {
    eliminarArchivo(archivo.filename);
    throw AppError.badRequest("Ese documento no corresponde a tu tipo de cuenta");
  }

  const anteriores = await prisma.usuarioDocumento.findMany({
    where: { documentoUsuarioId: usuarioId, documentoTipo: tipo, isDeleted: false },
    select: { documentoId: true, documentoArchivo: true },
  });

  const creado = await prisma.$transaction(async (tx) => {
    if (anteriores.length) {
      await tx.usuarioDocumento.updateMany({
        where: { documentoId: { in: anteriores.map((a) => a.documentoId) } },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: usuarioId, modifiedBy: usuarioId },
      });
    }

    const nuevo = await tx.usuarioDocumento.create({
      data: {
        documentoUsuarioId: usuarioId,
        documentoTipo: tipo,
        documentoNombreOriginal: archivo.originalname.slice(0, 255),
        documentoArchivo: archivo.filename,
        documentoMime: archivo.mimetype,
        documentoTamano: archivo.size,
        createdBy: usuarioId,
      },
      select: SELECT_PUBLICO,
    });

    // Un documento nuevo reabre la revisión y fija la vía en "documento":
    // quien sube un papel ya no necesita la videollamada.
    if (usuario.usuarioEstadoValidacion !== "aprobado") {
      await tx.usuario.update({
        where: { usuarioId },
        data: {
          usuarioEstadoValidacion: "pendiente",
          usuarioMotivoRechazo: null,
          usuarioVerificacionVia: "documento",
        },
      });
    }

    return nuevo;
  });

  anteriores.forEach((a) => eliminarArchivo(a.documentoArchivo));
  return creado;
}

/**
 * Devuelve el binario para descargarlo. Solo el dueño y los administradores:
 * son documentos personales sensibles.
 */
export async function archivoDe(documentoId: number, actor: { usuarioId: number; rol: string }) {
  const doc = await prisma.usuarioDocumento.findUnique({
    where: { documentoId },
    select: {
      documentoUsuarioId: true,
      documentoArchivo: true,
      documentoMime: true,
      documentoNombreOriginal: true,
      isDeleted: true,
    },
  });
  if (!doc || doc.isDeleted) throw AppError.notFound("Documento no encontrado");
  if (actor.rol !== "admin" && doc.documentoUsuarioId !== actor.usuarioId) {
    throw AppError.forbidden("No puedes ver este documento");
  }
  return {
    ruta: rutaDe(doc.documentoArchivo),
    mime: doc.documentoMime,
    nombre: doc.documentoNombreOriginal,
  };
}

/** Eliminación lógica de un documento propio que todavía no fue aprobado. */
export async function eliminar(documentoId: number, usuarioId: number) {
  const doc = await prisma.usuarioDocumento.findUnique({ where: { documentoId } });
  if (!doc || doc.isDeleted) throw AppError.notFound("Documento no encontrado");
  if (doc.documentoUsuarioId !== usuarioId) throw AppError.forbidden();
  if (doc.documentoEstado === "aprobado") {
    throw AppError.conflict("Un documento ya aprobado no se puede quitar");
  }

  await prisma.usuarioDocumento.update({
    where: { documentoId },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy: usuarioId, modifiedBy: usuarioId },
  });
  eliminarArchivo(doc.documentoArchivo);
  return { ok: true };
}
