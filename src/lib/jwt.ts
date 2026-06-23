/**
 * Edge-safe session token helpers using `jose` only (no Node-only deps),
 * so this module can be imported from middleware as well as server code.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "wa_session";

export interface SessionPayload {
  userId: string;
  organizationId: string;
  username: string;
  role: "ADMIN" | "USER";
}

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ??
    process.env.WEBHOOK_VERIFY_TOKEN ??
    "dev-insecure-secret-change-me"
);

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySession(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.userId || !payload.organizationId) return null;
    return {
      userId: String(payload.userId),
      organizationId: String(payload.organizationId),
      username: String(payload.username ?? ""),
      role: (payload.role === "ADMIN" ? "ADMIN" : "USER") as "ADMIN" | "USER",
    };
  } catch {
    return null;
  }
}
