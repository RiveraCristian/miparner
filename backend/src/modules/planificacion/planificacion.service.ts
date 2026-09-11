/**
 * Planificación mensual de entrenamientos del deportista.
 *
 * Es una agenda personal: el deportista anota cuándo entrena y va marcando lo
 * cumplido. No genera acompañamientos por sí sola —eso se pide aparte—, pero
 * deja el mes a la vista para organizarse.
 *
 * Un plan por persona y mes, con sus bloques dentro. El avance no se guarda:
 * se calcula sumando los bloques cumplidos, así nunca queda desincronizado con
 * lo que realmente hay en la agenda.
 */
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import type { ActualizarBloqueDto, CrearBloqueDto, GuardarPlanDto } from "./planificacion.schemas";

const SELECT_BLOQUE = {
  bloqueId: true,
  bloqueFecha: true,
  bloqueHoraInicio: true,
  bloqueDuracionMin: true,
  bloqueDisciplina: true,
  bloqueLugar: true,
  bloqueEstado: true,
  bloqueNotas: true,
} as const;

/** "HH:MM" a la marca temporal que Postgres guarda en una columna TIME. */
function aHora(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

function deHora(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function aFecha(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** La fecha del bloque tiene que caer dentro del mes del plan. */
function assertDentroDelMes(iso: string, anio: number, mes: number) {
  const [a, m] = iso.split("-").map(Number);
  if (a !== anio || m !== mes) {
    throw AppError.badRequest(
      `Esa fecha no pertenece al plan de ${String(mes).padStart(2, "0")}/${anio}`,
    );
  }
}

function mapBloque(b: {
  bloqueId: number;
  bloqueFecha: Date;
  bloqueHoraInicio: Date;
  bloqueDuracionMin: number;
  bloqueDisciplina: string | null;
  bloqueLugar: string | null;
  bloqueEstado: string;
  bloqueNotas: string | null;
}) {
  return {
    bloqueId: b.bloqueId,
    fecha: b.bloqueFecha.toISOString().slice(0, 10),
    horaInicio: deHora(b.bloqueHoraInicio),
    duracionMin: b.bloqueDuracionMin,
    disciplina: b.bloqueDisciplina,
    lugar: b.bloqueLugar,
    estado: b.bloqueEstado,
    notas: b.bloqueNotas,
  };
}

async function buscarPlan(deportistaId: number, anio: number, mes: number) {
  return prisma.planEntrenamiento.findFirst({
    where: { planDeportistaId: deportistaId, planAnio: anio, planMes: mes, isDeleted: false },
  });
}

/** Plan del mes con sus bloques y el avance calculado. Devuelve vacío si no hay. */
export async function obtener(deportistaId: number, anio: number, mes: number) {
  const plan = await buscarPlan(deportistaId, anio, mes);

  const bloques = plan
    ? await prisma.planBloque.findMany({
        where: { bloquePlanId: plan.planId },
        orderBy: [{ bloqueFecha: "asc" }, { bloqueHoraInicio: "asc" }],
        select: SELECT_BLOQUE,
      })
    : [];

  const minutos = (estado: string) =>
    bloques.filter((b) => b.bloqueEstado === estado).reduce((a, b) => a + b.bloqueDuracionMin, 0);

  const minutosCumplidos = minutos("cumplido");
  const minutosPlanificados = minutos("planificado");
  const horasObjetivo = plan?.planHorasObjetivo ?? 0;

  return {
    anio,
    mes,
    existe: !!plan,
    planId: plan?.planId ?? null,
    objetivo: plan?.planObjetivo ?? null,
    horasObjetivo,
    bloques: bloques.map(mapBloque),
    avance: {
      horasCumplidas: Math.round((minutosCumplidos / 60) * 10) / 10,
      horasPlanificadas: Math.round((minutosPlanificados / 60) * 10) / 10,
      // Sin meta declarada no hay porcentaje que mostrar.
      porcentaje:
        horasObjetivo > 0
          ? Math.min(100, Math.round((minutosCumplidos / (horasObjetivo * 60)) * 100))
          : null,
      sesionesCumplidas: bloques.filter((b) => b.bloqueEstado === "cumplido").length,
      sesionesTotales: bloques.length,
    },
  };
}

/** Crea el plan del mes o actualiza su objetivo. */
export async function guardar(
  deportistaId: number,
  anio: number,
  mes: number,
  dto: GuardarPlanDto,
) {
  const existente = await buscarPlan(deportistaId, anio, mes);

  if (existente) {
    await prisma.planEntrenamiento.update({
      where: { planId: existente.planId },
      data: {
        planObjetivo: dto.objetivo ?? null,
        planHorasObjetivo: dto.horasObjetivo,
        modifiedBy: deportistaId,
      },
    });
  } else {
    await prisma.planEntrenamiento.create({
      data: {
        planDeportistaId: deportistaId,
        planAnio: anio,
        planMes: mes,
        planObjetivo: dto.objetivo ?? null,
        planHorasObjetivo: dto.horasObjetivo,
        createdBy: deportistaId,
      },
    });
  }

  return obtener(deportistaId, anio, mes);
}

/** Agrega un entrenamiento. Crea el plan del mes si todavía no existía. */
export async function agregarBloque(
  deportistaId: number,
  anio: number,
  mes: number,
  dto: CrearBloqueDto,
) {
  assertDentroDelMes(dto.fecha, anio, mes);

  let plan = await buscarPlan(deportistaId, anio, mes);
  if (!plan) {
    plan = await prisma.planEntrenamiento.create({
      data: { planDeportistaId: deportistaId, planAnio: anio, planMes: mes, createdBy: deportistaId },
    });
  }

  await prisma.planBloque.create({
    data: {
      bloquePlanId: plan.planId,
      bloqueFecha: aFecha(dto.fecha),
      bloqueHoraInicio: aHora(dto.horaInicio),
      bloqueDuracionMin: dto.duracionMin,
      bloqueDisciplina: dto.disciplina ?? null,
      bloqueLugar: dto.lugar ?? null,
      bloqueNotas: dto.notas ?? null,
      createdBy: deportistaId,
    },
  });

  return obtener(deportistaId, anio, mes);
}

/** Comprueba que el bloque sea de quien dice, antes de tocarlo. */
async function bloquePropio(bloqueId: number, deportistaId: number) {
  const bloque = await prisma.planBloque.findUnique({
    where: { bloqueId },
    include: { plan: true },
  });
  if (!bloque || bloque.plan.isDeleted) throw AppError.notFound("Entrenamiento no encontrado");
  if (bloque.plan.planDeportistaId !== deportistaId) throw AppError.forbidden();
  return bloque;
}

export async function actualizarBloque(
  bloqueId: number,
  deportistaId: number,
  dto: ActualizarBloqueDto,
) {
  const bloque = await bloquePropio(bloqueId, deportistaId);
  if (dto.fecha) assertDentroDelMes(dto.fecha, bloque.plan.planAnio, bloque.plan.planMes);

  await prisma.planBloque.update({
    where: { bloqueId },
    data: {
      ...(dto.fecha !== undefined ? { bloqueFecha: aFecha(dto.fecha) } : {}),
      ...(dto.horaInicio !== undefined ? { bloqueHoraInicio: aHora(dto.horaInicio) } : {}),
      ...(dto.duracionMin !== undefined ? { bloqueDuracionMin: dto.duracionMin } : {}),
      ...(dto.disciplina !== undefined ? { bloqueDisciplina: dto.disciplina } : {}),
      ...(dto.lugar !== undefined ? { bloqueLugar: dto.lugar } : {}),
      ...(dto.notas !== undefined ? { bloqueNotas: dto.notas } : {}),
      ...(dto.estado !== undefined ? { bloqueEstado: dto.estado } : {}),
      modifiedBy: deportistaId,
    },
  });

  return obtener(deportistaId, bloque.plan.planAnio, bloque.plan.planMes);
}

/**
 * Quita un entrenamiento de la agenda. Aquí sí es borrado físico: un bloque
 * planificado que se elimina no es un registro de negocio que haya que
 * conservar, es una casilla de agenda que la persona ya no quiere.
 */
export async function eliminarBloque(bloqueId: number, deportistaId: number) {
  const bloque = await bloquePropio(bloqueId, deportistaId);
  await prisma.planBloque.delete({ where: { bloqueId } });
  return obtener(deportistaId, bloque.plan.planAnio, bloque.plan.planMes);
}

/** Resumen de los últimos meses, para la pantalla de logros. */
export async function resumenAnual(deportistaId: number, anio: number) {
  const planes = await prisma.planEntrenamiento.findMany({
    where: { planDeportistaId: deportistaId, planAnio: anio, isDeleted: false },
    orderBy: { planMes: "asc" },
    include: { bloques: { select: { bloqueDuracionMin: true, bloqueEstado: true } } },
  });

  return planes.map((p) => {
    const cumplidos = p.bloques.filter((b) => b.bloqueEstado === "cumplido");
    return {
      mes: p.planMes,
      horasObjetivo: p.planHorasObjetivo,
      horasCumplidas:
        Math.round((cumplidos.reduce((a, b) => a + b.bloqueDuracionMin, 0) / 60) * 10) / 10,
      sesiones: cumplidos.length,
    };
  });
}
