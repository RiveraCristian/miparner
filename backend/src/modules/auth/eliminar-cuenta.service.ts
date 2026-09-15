/**
 * Borrado de la propia cuenta.
 *
 * Apple lo exige a toda app que permita registrarse (directriz 5.1.1), y la Ley
 * 21.719 reconoce el derecho de supresión. Hasta ahora solo existía la
 * revocación del consentimiento, que desactiva la cuenta pero no borra nada.
 *
 * Cómo se resuelve la tensión con la regla del proyecto de no eliminar usuarios
 * físicamente: la FILA de `usuarios` se conserva —la referencian viajes, alertas
 * de pánico y la bitácora, y borrarla rompería el historial de OTRAS personas—
 * pero se le quitan todos los datos personales. Lo que queda es una lápida sin
 * identidad: un identificador al que apuntan los registros, sin nombre, correo,
 * teléfono ni forma de volver a entrar.
 *
 * Qué se borra de verdad:
 *  · Documentos de acreditación, incluido el archivo en disco.
 *  · Caracterización: discapacidad, apoyos, dirección, contacto de emergencia.
 *  · Planes de entrenamiento.
 *  · Texto de los mensajes que escribió.
 *  · Sesiones abiertas y códigos OTP.
 *
 * Qué se conserva y por qué:
 *  · Los acompañamientos, anonimizados: son también el historial de la otra
 *    persona y el respaldo de una eventual alerta de seguridad.
 *  · Los mensajes que RECIBIÓ: son palabras de la otra persona, no suyas.
 *  · El registro de consentimientos: es la prueba de que el tratamiento fue
 *    lícito mientras duró, y se necesita justamente para demostrarlo después.
 */
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { verifyPassword } from "../../lib/password";
import { eliminarArchivo } from "../../lib/uploads";

/** Texto que sustituye a lo que escribió la persona eliminada. */
const LAPIDA_MENSAJE = "[mensaje eliminado con la cuenta]";

export interface ResultadoEliminacion {
  ok: true;
  usuarioId: number;
  documentosEliminados: number;
  mensajesAnonimizados: number;
  planesEliminados: number;
}

/**
 * Borra la cuenta de quien la pide.
 *
 * Exige la contraseña actual: es una acción irreversible y un token robado no
 * debería bastar para destruir la cuenta de alguien.
 */
export async function eliminarMiCuenta(
  usuarioId: number,
  password: string,
): Promise<ResultadoEliminacion> {
  const usuario = await prisma.usuario.findUnique({ where: { usuarioId } });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");

  if (usuario.usuarioRol === "admin") {
    throw AppError.forbidden(
      "Las cuentas de administración no se borran desde la app. Pídeselo a otro administrador.",
    );
  }

  if (!usuario.usuarioPassword) {
    throw AppError.badRequest("Esta cuenta no tiene contraseña con la que confirmar el borrado");
  }
  const correcta = await verifyPassword(password, usuario.usuarioPassword);
  if (!correcta) throw AppError.unauthorized("La contraseña no es correcta");

  // Los archivos se borran fuera de la transacción: el disco no participa en
  // ella y dejarlos huérfanos sería peor que borrarlos de más.
  const documentos = await prisma.usuarioDocumento.findMany({
    where: { documentoUsuarioId: usuarioId },
    select: { documentoArchivo: true },
  });

  const resultado = await prisma.$transaction(async (tx) => {
    // --- Documentos de acreditación ---
    const docs = await tx.usuarioDocumento.deleteMany({ where: { documentoUsuarioId: usuarioId } });

    // --- Planes de entrenamiento ---
    const planes = await tx.planEntrenamiento.findMany({
      where: { planDeportistaId: usuarioId },
      select: { planId: true },
    });
    if (planes.length) {
      await tx.planBloque.deleteMany({
        where: { bloquePlanId: { in: planes.map((p) => p.planId) } },
      });
      await tx.planEntrenamiento.deleteMany({ where: { planDeportistaId: usuarioId } });
    }

    // --- Mensajes: solo los que escribió ---
    const mensajes = await tx.mensaje.updateMany({
      where: { mensajeEmisorId: usuarioId },
      data: { mensajeTexto: LAPIDA_MENSAJE },
    });

    // --- Sesiones y códigos ---
    await tx.refreshToken.deleteMany({ where: { refreshTokenUsuarioId: usuarioId } });
    await tx.otpCodigo.deleteMany({ where: { otpUsuarioId: usuarioId } });

    // --- Caracterización del deportista ---
    await tx.deportistaPerfil.updateMany({
      where: { deportistaUsuarioId: usuarioId },
      data: {
        deportistaDisciplina: null,
        deportistaNecesidades: [],
        deportistaTiposDiscapacidad: [],
        deportistaFechaNacimiento: null,
        deportistaGenero: null,
        deportistaRegion: null,
        deportistaComuna: null,
        deportistaDireccion: null,
        deportistaNivelAutonomia: null,
        deportistaComunicacion: null,
        deportistaObservaciones: null,
        deportistaEmergenciaNombre: null,
        deportistaEmergenciaTelefono: null,
        deportistaEmergenciaRelacion: null,
      },
    });

    // --- Datos del voluntario ---
    await tx.voluntarioPerfil.updateMany({
      where: { voluntarioUsuarioId: usuarioId },
      data: {
        voluntarioVehiculo: null,
        voluntarioPatente: null,
        voluntarioEnLinea: false,
        voluntarioValidado: false,
      },
    });

    // --- La cuenta: lápida sin identidad ---
    // El correo tiene que seguir siendo único, así que lleva el identificador.
    // El dominio `.invalid` está reservado por norma para no existir nunca, de
    // modo que nadie puede recibir correo ahí ni reclamar esa dirección.
    await tx.usuario.update({
      where: { usuarioId },
      data: {
        usuarioCorreo: `eliminada-${usuarioId}@miparner.invalid`,
        usuarioNombre: "Cuenta eliminada",
        usuarioTelefono: null,
        usuarioPassword: null,
        usuarioProveedorId: null,
        usuarioActivo: false,
        usuarioFechaDesactivacion: new Date(),
        usuarioEstadoValidacion: "rechazado",
        usuarioMotivoRechazo: null,
        usuarioVerificacionVia: null,
        usuarioVerificacionDisponibilidad: null,
        usuarioVerificacionNota: null,
      },
    });

    return {
      documentosEliminados: docs.count,
      mensajesAnonimizados: mensajes.count,
      planesEliminados: planes.length,
    };
  });

  documentos.forEach((d) => eliminarArchivo(d.documentoArchivo));

  return { ok: true, usuarioId, ...resultado };
}
