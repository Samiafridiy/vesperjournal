import { createHmac, timingSafeEqual } from "crypto";

export function eaToken(uid: string): string {
  const secret = process.env.EA_WEBHOOK_SECRET;
  if (!secret) throw new Error("EA_WEBHOOK_SECRET missing");
  return createHmac("sha256", secret).update(uid).digest("hex").slice(0, 40);
}

export function verifyEaToken(uid: string | null, token: string | null): boolean {
  if (!uid || !token) return false;
  const a = Buffer.from(eaToken(uid));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
