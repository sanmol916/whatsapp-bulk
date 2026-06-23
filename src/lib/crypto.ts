/**
 * Small AES-256-GCM helper to encrypt per-tenant secrets (WhatsApp access
 * tokens) before storing them in the database. The key is derived from
 * AUTH_SECRET so we never store secrets in plaintext at rest.
 *
 * Node runtime only (used in API routes and the worker, never in middleware).
 */
import crypto from "crypto";

const RAW_SECRET =
  process.env.AUTH_SECRET ??
  process.env.WEBHOOK_VERIFY_TOKEN ??
  "dev-insecure-secret-change-me";

// 32-byte key derived from the secret.
const KEY = crypto.createHash("sha256").update(RAW_SECRET).digest();
const PREFIX = "enc:v1:";

export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored; // legacy/plaintext fallback
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return "";
  }
}

/** Mask a secret for display, e.g. "EAAB...xyz". */
export function maskSecret(plain: string | null | undefined): string {
  if (!plain) return "";
  if (plain.length <= 8) return "••••";
  return `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
}
