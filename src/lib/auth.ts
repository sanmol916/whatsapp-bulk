/**
 * Server-side auth helpers. Node runtime only (imports bcryptjs).
 * Do NOT import this file from middleware — use lib/jwt.ts there instead.
 */
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  type SessionPayload,
} from "./jwt";

export { SESSION_COOKIE, signSession, verifySession };
export type { SessionPayload };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Read and verify the current session from the request cookies. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** For server components: redirect to /login if not authenticated. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** For server components: redirect home if not an admin. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/");
  return session;
}
