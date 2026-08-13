import twilio from "twilio";
import { env } from "../config/env";

const configurado = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);

const client = configurado
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

// Envía el OTP por SMS o voz. Si Twilio no está configurado, cae a log (dev).
export async function enviarOtp(canal: "sms" | "voz", destino: string, codigo: string): Promise<void> {
  const mensaje = `Miparner: tu código de verificación es ${codigo}. Vence en 5 minutos.`;

  if (!client) {
    console.log(`[OTP:${canal}] (Twilio no configurado) → ${destino}: ${codigo}`);
    return;
  }

  if (canal === "voz") {
    await client.calls.create({
      to: destino,
      from: env.TWILIO_FROM_NUMBER,
      twiml: `<Response><Say language="es-MX">${mensaje}</Say></Response>`,
    });
    return;
  }

  await client.messages.create({ to: destino, from: env.TWILIO_FROM_NUMBER, body: mensaje });
}

// Notifica una alerta de pánico por SMS a un contacto/monitoreo (si hay Twilio).
export async function enviarAlertaPanico(destino: string, texto: string): Promise<void> {
  if (!client) {
    console.log(`[PANICO] (Twilio no configurado) → ${destino}: ${texto}`);
    return;
  }
  await client.messages.create({ to: destino, from: env.TWILIO_FROM_NUMBER, body: texto });
}
