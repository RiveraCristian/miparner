import bcrypt from "bcryptjs";

const COST = 12; // factor mínimo 10 por convención; 12 por seguridad

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
