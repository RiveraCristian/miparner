/**
 * Lista de espera — gente que deja su contacto en la web.
 *
 * No crea cuentas. Son personas interesadas a las que el equipo escribirá
 * cuando el servicio llegue a su comuna o se abran cupos de voluntariado.
 *
 * Dejar nombre, correo y comuna es entregar datos personales, así que la
 * finalidad se declara en el formulario y se exige marcar la casilla: el
 * único uso es contactarles sobre Miparner.
 */
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";

const SELECT_PUBLICO = {
  esperaId: true,
  esperaNombre: true,
  esperaCorreo: true,
  esperaTelefono: true,
  esperaComuna: true,
  esperaInteres: true,
  esperaMensaje: true,
  esperaEstado: true,
  esperaNota: true,
  esperaContactadoAt: true,
  createdAt: true,
} as const;

export interface AltaEspera {
  nombre: string;
  correo: string;
  telefono?: string;
  comuna?: string;
  interes: string;
  mensaje?: string;
  aceptaContacto: boolean;
  ip?: string;
}

/** Alta desde la web. Endpoint público: no hay sesión. */
export async function apuntarse(dto: AltaEspera) {
  if (!dto.aceptaContacto) {
    throw AppError.badRequest(
      "Necesitamos tu autorización para escribirte: es la única razón por la que guardamos tus datos.",
    );
  }

  const correo = dto.correo.trim().toLowerCase();

  // Apuntarse dos veces no es un error de la persona: se le responde que ya
  // está, sin revelar cuándo ni con qué datos se apuntó (podría no ser ella).
  const existe = await prisma.listaEspera.findFirst({
    where: { esperaCorreo: { equals: correo, mode: "insensitive" } },
    select: { esperaId: true },
  });
  if (existe) {
    return { ok: true as const, yaEstaba: true, mensaje: "Ya estabas en la lista. Te escribiremos." };
  }

  await prisma.listaEspera.create({
    data: {
      esperaNombre: dto.nombre.trim(),
      esperaCorreo: correo,
      esperaTelefono: dto.telefono?.trim() || null,
      esperaComuna: dto.comuna?.trim() || null,
      esperaInteres: dto.interes,
      esperaMensaje: dto.mensaje?.trim() || null,
      esperaAceptaContacto: true,
      esperaIp: dto.ip ?? null,
    },
  });

  return { ok: true as const, yaEstaba: false, mensaje: "Listo. Te escribiremos pronto." };
}

/* ------------------------------------------------------------ Panel */

export async function listar(estado?: string) {
  return prisma.listaEspera.findMany({
    where: estado ? { esperaEstado: estado } : undefined,
    orderBy: { esperaId: "desc" },
    take: 300,
    select: SELECT_PUBLICO,
  });
}

export async function resumen() {
  const [porEstado, porInteres, porComuna] = await Promise.all([
    prisma.listaEspera.groupBy({ by: ["esperaEstado"], _count: { _all: true } }),
    prisma.listaEspera.groupBy({ by: ["esperaInteres"], _count: { _all: true } }),
    prisma.listaEspera.groupBy({
      by: ["esperaComuna"],
      _count: { _all: true },
      orderBy: { _count: { esperaComuna: "desc" } },
      take: 10,
    }),
  ]);
  return {
    total: porEstado.reduce((a, e) => a + e._count._all, 0),
    porEstado: Object.fromEntries(porEstado.map((e) => [e.esperaEstado, e._count._all])),
    porInteres: Object.fromEntries(porInteres.map((e) => [e.esperaInteres, e._count._all])),
    // Dónde hay demanda: sirve para decidir a qué comuna llevar el servicio.
    porComuna: porComuna
      .filter((c) => c.esperaComuna)
      .map((c) => ({ comuna: c.esperaComuna, n: c._count._all })),
  };
}

export async function marcar(
  adminId: number,
  id: number,
  estado: "nuevo" | "contactado" | "convertido" | "descartado",
  nota?: string,
) {
  const fila = await prisma.listaEspera.findUnique({ where: { esperaId: id } });
  if (!fila) throw AppError.notFound("No está en la lista");

  return prisma.listaEspera.update({
    where: { esperaId: id },
    data: {
      esperaEstado: estado,
      esperaNota: nota ?? fila.esperaNota,
      modifiedBy: adminId,
      ...(estado === "contactado" && !fila.esperaContactadoAt
        ? { esperaContactadoPor: adminId, esperaContactadoAt: new Date() }
        : {}),
    },
    select: SELECT_PUBLICO,
  });
}
