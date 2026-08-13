import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../lib/http-error";
import { enviarOtp } from "../../lib/twilio";
import { emitToAdmins, emitToRide, RIDE_EVENTS } from "../../realtime/socket";

const MAX_INTENTOS = 5;

interface PanicoInput {
  usuarioId: number;
  rideId?: number;
  lat?: number;
  lng?: number;
}

// --- Botón de pánico (endpoint asíncrono, crítico) ---
export async function registrarPanico(input: PanicoInput) {
  const { usuarioId, rideId, lat, lng } = input;

  const conUbicacion = lat !== undefined && lng !== undefined;
  const filas = conUbicacion
    ? await prisma.$queryRaw<{ panico_id: number }[]>`
        INSERT INTO panico_alertas (panico_usuario_id, panico_viaje_id, panico_ubicacion, created_by)
        VALUES (${usuarioId}, ${rideId ?? null}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), ${usuarioId})
        RETURNING panico_id`
    : await prisma.$queryRaw<{ panico_id: number }[]>`
        INSERT INTO panico_alertas (panico_usuario_id, panico_viaje_id, created_by)
        VALUES (${usuarioId}, ${rideId ?? null}, ${usuarioId})
        RETURNING panico_id`;

  const panicoId = filas[0].panico_id;
  const evento = {
    panicoId,
    usuarioId,
    rideId: rideId ?? null,
    lat: lat ?? null,
    lng: lng ?? null,
    at: new Date().toISOString(),
  };

  // Difusión inmediata: administradores + sala del viaje.
  emitToAdmins(RIDE_EVENTS.PANIC_ALERT, evento);
  if (rideId) emitToRide(rideId, RIDE_EVENTS.PANIC_ALERT, evento);

  return { panicoId, estado: "activa" as const };
}

// --- OTP: generar y enviar ---
export async function enviarCodigoOtp(usuarioId: number, canal: "sms" | "voz") {
  const usuario = await prisma.usuario.findUnique({ where: { usuarioId } });
  if (!usuario) throw AppError.notFound("Usuario no encontrado");
  if (!usuario.usuarioTelefono) throw AppError.badRequest("El usuario no tiene teléfono registrado");

  const codigo = String(randomInt(0, 10 ** env.OTP_LENGTH)).padStart(env.OTP_LENGTH, "0");
  const expiraAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCodigo.create({
    data: {
      otpUsuarioId: usuarioId,
      otpCodigo: codigo,
      otpCanal: canal,
      otpExpiraAt: expiraAt,
      createdBy: usuarioId,
    },
  });

  await enviarOtp(canal, usuario.usuarioTelefono, codigo);

  return {
    enviado: true,
    canal,
    expiraAt,
    // Solo en desarrollo se devuelve el código para facilitar pruebas.
    ...(env.isProd ? {} : { codigoDev: codigo }),
  };
}

// --- OTP: validar ---
export async function validarCodigoOtp(usuarioId: number, codigo: string) {
  const otp = await prisma.otpCodigo.findFirst({
    where: { otpUsuarioId: usuarioId, otpUsado: false },
    orderBy: { otpId: "desc" },
  });
  if (!otp) throw AppError.badRequest("No hay un código vigente");
  if (otp.otpExpiraAt < new Date()) throw AppError.badRequest("El código expiró");
  if (otp.otpIntentos >= MAX_INTENTOS) throw AppError.badRequest("Demasiados intentos");

  if (otp.otpCodigo !== codigo) {
    await prisma.otpCodigo.update({
      where: { otpId: otp.otpId },
      data: { otpIntentos: { increment: 1 }, modifiedBy: usuarioId },
    });
    throw AppError.badRequest("Código incorrecto");
  }

  await prisma.otpCodigo.update({
    where: { otpId: otp.otpId },
    data: { otpUsado: true, modifiedBy: usuarioId },
  });
  return { validado: true };
}
