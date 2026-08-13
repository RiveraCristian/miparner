import { z } from "zod";

export const panicoSchema = z.object({
  rideId: z.number().int().positive().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const otpEnviarSchema = z.object({
  canal: z.enum(["sms", "voz"]).default("sms"),
});

export const otpValidarSchema = z.object({
  codigo: z.string().min(4).max(10),
});
