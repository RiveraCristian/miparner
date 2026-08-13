import { createHash, randomUUID } from "node:crypto";
import type { Usuario } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/http-error";
import { hashPassword, verifyPassword } from "../../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { env } from "../../config/env";
import type { LoginDto, RefreshDto, RegisterDto } from "./auth.schemas";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function ttlToDate(ttl: string): Date {
  // Convierte "30d" / "15m" / "24h" a una fecha futura.
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  const now = Date.now();
  if (!match) return new Date(now + 30 * 24 * 60 * 60 * 1000);
  const value = Number(match[1]);
  const unit = match[2];
  const mult = unit === "s" ? 1e3 : unit === "m" ? 6e4 : unit === "h" ? 36e5 : 864e5;
  return new Date(now + value * mult);
}

export function toPublicUser(u: Usuario) {
  return {
    usuarioId: u.usuarioId,
    correo: u.usuarioCorreo,
    nombre: u.usuarioNombre,
    telefono: u.usuarioTelefono,
    rol: u.usuarioRol,
    activo: u.usuarioActivo,
  };
}

async function issueTokens(usuario: Usuario) {
  const accessToken = signAccessToken({ sub: usuario.usuarioId, rol: usuario.usuarioRol });
  const jti = randomUUID();
  const refreshToken = signRefreshToken({ sub: usuario.usuarioId, jti });

  await prisma.refreshToken.create({
    data: {
      refreshTokenUsuarioId: usuario.usuarioId,
      refreshTokenHash: hashToken(refreshToken),
      refreshTokenExpiraAt: ttlToDate(env.JWT_REFRESH_TTL),
      createdBy: usuario.usuarioId,
    },
  });

  return { accessToken, refreshToken };
}

export async function register(dto: RegisterDto) {
  const existe = await prisma.usuario.findUnique({ where: { usuarioCorreo: dto.correo } });
  if (existe) throw AppError.conflict("El correo ya está registrado");

  const passwordHash = await hashPassword(dto.password);

  const usuario = await prisma.$transaction(async (tx) => {
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
        data: {
          deportistaUsuarioId: nuevo.usuarioId,
          deportistaDisciplina: dto.disciplina ?? null,
          deportistaNecesidades: dto.necesidades ?? [],
          createdBy: nuevo.usuarioId,
        },
      });
    } else {
      await tx.voluntarioPerfil.create({
        data: {
          voluntarioUsuarioId: nuevo.usuarioId,
          voluntarioVehiculo: dto.vehiculo ?? null,
          voluntarioPatente: dto.patente ?? null,
          createdBy: nuevo.usuarioId,
        },
      });
    }

    return nuevo;
  });

  const tokens = await issueTokens(usuario);
  return { usuario: toPublicUser(usuario), ...tokens };
}

export async function login(dto: LoginDto) {
  const usuario = await prisma.usuario.findUnique({ where: { usuarioCorreo: dto.correo } });
  if (!usuario || !usuario.usuarioActivo || !usuario.usuarioPassword) {
    throw AppError.unauthorized("Credenciales inválidas");
  }

  const ok = await verifyPassword(dto.password, usuario.usuarioPassword);
  if (!ok) throw AppError.unauthorized("Credenciales inválidas");

  const tokens = await issueTokens(usuario);
  return { usuario: toPublicUser(usuario), ...tokens };
}

export async function refresh(dto: RefreshDto) {
  let payload: { sub: number };
  try {
    payload = verifyRefreshToken(dto.refreshToken);
  } catch {
    throw AppError.unauthorized("Refresh token inválido o expirado");
  }

  const hash = hashToken(dto.refreshToken);
  const registro = await prisma.refreshToken.findFirst({
    where: {
      refreshTokenHash: hash,
      refreshTokenUsuarioId: payload.sub,
      refreshTokenRevocado: false,
      refreshTokenExpiraAt: { gt: new Date() },
    },
  });
  if (!registro) throw AppError.unauthorized("Sesión no válida");

  const usuario = await prisma.usuario.findUnique({ where: { usuarioId: payload.sub } });
  if (!usuario || !usuario.usuarioActivo) throw AppError.unauthorized();

  // Rotación: revoca el token usado y emite uno nuevo.
  await prisma.refreshToken.update({
    where: { refreshTokenId: registro.refreshTokenId },
    data: { refreshTokenRevocado: true, modifiedBy: usuario.usuarioId },
  });

  const tokens = await issueTokens(usuario);
  return { usuario: toPublicUser(usuario), ...tokens };
}

export async function me(usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId },
    include: { deportistaPerfil: true, voluntarioPerfil: true },
  });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");
  return {
    ...toPublicUser(usuario),
    deportistaPerfil: usuario.deportistaPerfil,
    voluntarioPerfil: usuario.voluntarioPerfil,
  };
}
