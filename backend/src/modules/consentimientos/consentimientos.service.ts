import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import {
  VERSION_POLITICA,
  buscarFinalidad,
  finalidadesDeRol,
  hashTexto,
  obligatoriasDeRol,
} from "./consentimientos.catalogo";

export interface Decision {
  finalidad: string;
  otorgado: boolean;
}

interface Contexto {
  canal?: string;
  ip?: string;
}

/**
 * Registra decisiones de consentimiento.
 *
 * Nunca actualiza una fila existente: cada decisión es un asiento nuevo. Así el
 * historial completo queda como prueba de qué autorizó la persona, sobre qué
 * texto y cuándo, que es justo lo que hay que poder demostrar si alguien lo
 * pregunta.
 */
export async function registrar(
  usuarioId: number,
  decisiones: Decision[],
  ctx: Contexto = {},
) {
  const datos = decisiones.map((d) => {
    const finalidad = buscarFinalidad(d.finalidad);
    if (!finalidad) throw AppError.badRequest(`Finalidad desconocida: ${d.finalidad}`);
    return {
      consentimientoUsuarioId: usuarioId,
      consentimientoFinalidad: d.finalidad,
      consentimientoOtorgado: d.otorgado,
      consentimientoVersion: VERSION_POLITICA,
      consentimientoTextoHash: hashTexto(finalidad.texto),
      consentimientoCanal: ctx.canal ?? null,
      consentimientoIp: ctx.ip ?? null,
      createdBy: usuarioId,
    };
  });

  if (datos.length) await prisma.usuarioConsentimiento.createMany({ data: datos });
  return vigentes(usuarioId);
}

/**
 * Comprueba que estén todas las obligatorias del rol. Se llama en el registro:
 * sin ellas no hay base para tratar los datos, así que no se crea la cuenta.
 */
export function faltanObligatorias(rol: string, decisiones: Decision[]): string[] {
  const otorgadas = new Set(decisiones.filter((d) => d.otorgado).map((d) => d.finalidad));
  return obligatoriasDeRol(rol).filter((f) => !otorgadas.has(f));
}

/** Estado vigente de cada finalidad: la última decisión de cada una. */
export async function vigentes(usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId },
    select: { usuarioRol: true },
  });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");

  const filas = await prisma.usuarioConsentimiento.findMany({
    where: { consentimientoUsuarioId: usuarioId },
    orderBy: { consentimientoId: "desc" },
    select: {
      consentimientoFinalidad: true,
      consentimientoOtorgado: true,
      consentimientoVersion: true,
      createdAt: true,
    },
  });

  // La primera aparición de cada finalidad es la más reciente.
  const ultima = new Map<string, (typeof filas)[number]>();
  for (const f of filas) {
    if (!ultima.has(f.consentimientoFinalidad)) ultima.set(f.consentimientoFinalidad, f);
  }

  const finalidades = finalidadesDeRol(usuario.usuarioRol).map((f) => {
    const decision = ultima.get(f.clave);
    return {
      clave: f.clave,
      titulo: f.titulo,
      texto: f.texto,
      obligatorio: f.obligatorio,
      sensible: f.sensible,
      otorgado: decision?.consentimientoOtorgado ?? false,
      decididoAt: decision?.createdAt ?? null,
      // Si la persona aceptó una versión anterior, hay que volver a preguntarle.
      versionAceptada: decision?.consentimientoVersion ?? null,
      requiereRenovar: !!decision && decision.consentimientoVersion !== VERSION_POLITICA,
    };
  });

  return { version: VERSION_POLITICA, finalidades };
}

/**
 * Revoca una finalidad.
 *
 * Revocar una obligatoria deja la cuenta sin base legal para operar, así que
 * además la desactiva. Es la consecuencia honesta: si retiras el permiso para
 * tratar tus datos, no podemos seguir prestándote el servicio. La cuenta no se
 * borra — se puede volver a otorgar y reactivar.
 */
export async function revocar(usuarioId: number, finalidadClave: string, ctx: Contexto = {}) {
  const finalidad = buscarFinalidad(finalidadClave);
  if (!finalidad) throw AppError.badRequest("Finalidad desconocida");

  await prisma.$transaction(async (tx) => {
    await tx.usuarioConsentimiento.create({
      data: {
        consentimientoUsuarioId: usuarioId,
        consentimientoFinalidad: finalidadClave,
        consentimientoOtorgado: false,
        consentimientoVersion: VERSION_POLITICA,
        consentimientoTextoHash: hashTexto(finalidad.texto),
        consentimientoCanal: ctx.canal ?? null,
        consentimientoIp: ctx.ip ?? null,
        createdBy: usuarioId,
      },
    });

    if (finalidad.obligatorio) {
      await tx.usuario.update({
        where: { usuarioId },
        data: { usuarioActivo: false, usuarioFechaDesactivacion: new Date() },
      });
    }
  });

  return {
    ...(await vigentes(usuarioId)),
    cuentaDesactivada: finalidad.obligatorio,
  };
}

/**
 * Derecho de acceso y portabilidad: todo lo que la plataforma guarda de una
 * persona, en un JSON que puede llevarse.
 *
 * Los documentos van como metadato, no como binario: el archivo se descarga
 * por su propio endpoint.
 */
export async function exportarDatos(usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId },
    include: {
      deportistaPerfil: true,
      voluntarioPerfil: true,
      documentos: { where: { isDeleted: false } },
      consentimientos: true,
      planes: { where: { isDeleted: false }, include: { bloques: true } },
    },
  });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");

  const [viajes, mensajes] = await Promise.all([
    prisma.viaje.findMany({
      where: { OR: [{ viajeDeportistaId: usuarioId }, { viajeVoluntarioId: usuarioId }] },
      select: {
        viajeId: true,
        viajeEstado: true,
        viajeOrigenTexto: true,
        viajeDestinoTexto: true,
        viajeComentario: true,
        viajeSolicitadoAt: true,
        viajeFinAt: true,
      },
    }),
    prisma.mensaje.findMany({
      where: { OR: [{ mensajeEmisorId: usuarioId }, { mensajeReceptorId: usuarioId }] },
      select: {
        mensajeId: true,
        mensajeViajeId: true,
        mensajeTexto: true,
        mensajeEmisorId: true,
        createdAt: true,
      },
    }),
  ]);

  // La ubicación es una columna geography que el cliente no serializa.
  const { voluntarioUbicacion: _omit, ...voluntarioPerfil } = (usuario.voluntarioPerfil ??
    {}) as Record<string, unknown>;

  return {
    generadoAt: new Date().toISOString(),
    aviso:
      "Copia de los datos personales que Miparner tiene sobre ti, entregada en " +
      "ejercicio de tu derecho de acceso y portabilidad.",
    cuenta: {
      usuarioId: usuario.usuarioId,
      correo: usuario.usuarioCorreo,
      nombre: usuario.usuarioNombre,
      telefono: usuario.usuarioTelefono,
      rol: usuario.usuarioRol,
      activo: usuario.usuarioActivo,
      estadoValidacion: usuario.usuarioEstadoValidacion,
      fechaCreacion: usuario.usuarioFechaCreacion,
    },
    perfilDeportista: usuario.deportistaPerfil,
    perfilVoluntario: usuario.voluntarioPerfil ? voluntarioPerfil : null,
    documentos: usuario.documentos.map((d) => ({
      tipo: d.documentoTipo,
      nombreOriginal: d.documentoNombreOriginal,
      tamano: d.documentoTamano,
      estado: d.documentoEstado,
      subidoAt: d.createdAt,
    })),
    consentimientos: usuario.consentimientos,
    planesEntrenamiento: usuario.planes,
    acompanamientos: viajes,
    mensajes,
  };
}
