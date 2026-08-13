import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";

const PUNTOS_POR_NIVEL = 500;
const PUNTOS_VIAJE_DEPORTISTA = 50;
const PUNTOS_VIAJE_VOLUNTARIO = 30;

const nivelPara = (puntos: number) => Math.floor(puntos / PUNTOS_POR_NIVEL) + 1;

async function otorgarInsignia(usuarioId: number, codigo: string) {
  const insignia = await prisma.insignia.findUnique({ where: { insigniaCodigo: codigo } });
  if (!insignia) return;
  await prisma.usuarioInsignia
    .create({
      data: {
        usuarioInsigniaUsuarioId: usuarioId,
        usuarioInsigniaInsigniaId: insignia.insigniaId,
        createdBy: usuarioId,
      },
    })
    .catch(() => undefined); // ignora duplicado (ya la tenía)
}

// Llamado por el módulo de viajes al finalizar un viaje.
export async function otorgarPuntosPorViaje(deportistaId: number, voluntarioId: number | null) {
  const dep = await prisma.deportistaPerfil.findUnique({ where: { deportistaUsuarioId: deportistaId } });
  if (dep) {
    const puntos = dep.deportistaPuntos + PUNTOS_VIAJE_DEPORTISTA;
    await prisma.deportistaPerfil.update({
      where: { deportistaUsuarioId: deportistaId },
      data: { deportistaPuntos: puntos, deportistaNivel: nivelPara(puntos), modifiedBy: deportistaId },
    });
    await otorgarInsignia(deportistaId, "primer_viaje");
  }

  if (voluntarioId) {
    const vol = await prisma.voluntarioPerfil.findUnique({ where: { voluntarioUsuarioId: voluntarioId } });
    if (vol) {
      const puntos = vol.voluntarioPuntos + PUNTOS_VIAJE_VOLUNTARIO;
      await prisma.voluntarioPerfil.update({
        where: { voluntarioUsuarioId: voluntarioId },
        data: { voluntarioPuntos: puntos, voluntarioNivel: nivelPara(puntos), modifiedBy: voluntarioId },
      });
      await otorgarInsignia(voluntarioId, "primer_viaje");
    }
  }
}

export async function getPerfil(usuarioId: number) {
  const dep = await prisma.deportistaPerfil.findUnique({ where: { deportistaUsuarioId: usuarioId } });
  const vol = dep ? null : await prisma.voluntarioPerfil.findUnique({ where: { voluntarioUsuarioId: usuarioId } });

  const insignias = await prisma.usuarioInsignia.findMany({
    where: { usuarioInsigniaUsuarioId: usuarioId },
    include: { insignia: true },
    orderBy: { usuarioInsigniaObtenidaAt: "desc" },
  });

  const base = dep
    ? { tipo: "deportista", puntos: dep.deportistaPuntos, nivel: dep.deportistaNivel }
    : vol
      ? { tipo: "voluntario", puntos: vol.voluntarioPuntos, nivel: vol.voluntarioNivel }
      : { tipo: "sin_perfil", puntos: 0, nivel: 1 };

  return {
    ...base,
    proximoNivelEn: PUNTOS_POR_NIVEL - (base.puntos % PUNTOS_POR_NIVEL),
    insignias: insignias.map((ui) => ({
      codigo: ui.insignia.insigniaCodigo,
      nombre: ui.insignia.insigniaNombre,
      icono: ui.insignia.insigniaIcono,
      obtenidaAt: ui.usuarioInsigniaObtenidaAt,
    })),
  };
}

export async function ranking(rol: "deportista" | "voluntario") {
  if (rol === "voluntario") {
    const filas = await prisma.voluntarioPerfil.findMany({
      orderBy: { voluntarioPuntos: "desc" },
      take: 20,
      select: {
        voluntarioUsuarioId: true,
        voluntarioPuntos: true,
        voluntarioNivel: true,
        usuario: { select: { usuarioNombre: true } },
      },
    });
    return filas.map((f, i) => ({
      pos: i + 1,
      posicion: i + 1,
      usuarioId: f.voluntarioUsuarioId,
      nombre: f.usuario.usuarioNombre,
      puntos: f.voluntarioPuntos,
      nivel: f.voluntarioNivel,
    }));
  }

  const filas = await prisma.deportistaPerfil.findMany({
    orderBy: { deportistaPuntos: "desc" },
    take: 20,
    select: {
      deportistaUsuarioId: true,
      deportistaPuntos: true,
      deportistaNivel: true,
      usuario: { select: { usuarioNombre: true } },
    },
  });
  return filas.map((f, i) => ({
    pos: i + 1,
    posicion: i + 1,
    usuarioId: f.deportistaUsuarioId,
    nombre: f.usuario.usuarioNombre,
    puntos: f.deportistaPuntos,
    nivel: f.deportistaNivel,
  }));
}

// Progreso del usuario en el formato que consumen las apps móviles.
export async function miProgreso(usuarioId: number) {
  const p = await getPerfil(usuarioId);
  return {
    puntos: p.puntos,
    nivel: p.nivel,
    progresoNivel: p.puntos % PUNTOS_POR_NIVEL,
    puntosPorNivel: PUNTOS_POR_NIVEL,
    insignias: p.insignias,
  };
}

export async function listarPremios() {
  return prisma.premio.findMany({
    where: { isDeleted: false, premioActivo: true },
    orderBy: { premioCostoPuntos: "asc" },
    select: {
      premioId: true,
      premioNombre: true,
      premioDescripcion: true,
      premioCostoPuntos: true,
      premioStock: true,
    },
  });
}

export async function canjear(usuarioId: number, premioId: number) {
  return prisma.$transaction(async (tx) => {
    const premio = await tx.premio.findFirst({
      where: { premioId, isDeleted: false, premioActivo: true },
    });
    if (!premio) throw AppError.notFound("Premio no disponible");
    if (premio.premioStock <= 0) throw AppError.conflict("Premio sin stock");

    const dep = await tx.deportistaPerfil.findUnique({ where: { deportistaUsuarioId: usuarioId } });
    const vol = dep ? null : await tx.voluntarioPerfil.findUnique({ where: { voluntarioUsuarioId: usuarioId } });
    const puntos = dep?.deportistaPuntos ?? vol?.voluntarioPuntos;
    if (puntos === undefined) throw AppError.notFound("Perfil no encontrado");
    if (puntos < premio.premioCostoPuntos) throw AppError.badRequest("Puntos insuficientes");

    if (dep) {
      await tx.deportistaPerfil.update({
        where: { deportistaUsuarioId: usuarioId },
        data: { deportistaPuntos: { decrement: premio.premioCostoPuntos }, modifiedBy: usuarioId },
      });
    } else {
      await tx.voluntarioPerfil.update({
        where: { voluntarioUsuarioId: usuarioId },
        data: { voluntarioPuntos: { decrement: premio.premioCostoPuntos }, modifiedBy: usuarioId },
      });
    }

    await tx.premio.update({
      where: { premioId },
      data: { premioStock: { decrement: 1 }, modifiedBy: usuarioId },
    });

    return tx.canje.create({
      data: {
        canjeUsuarioId: usuarioId,
        canjePremioId: premioId,
        canjePuntosGastados: premio.premioCostoPuntos,
        createdBy: usuarioId,
      },
    });
  });
}
