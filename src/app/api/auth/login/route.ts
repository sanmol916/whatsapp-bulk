import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  signSession,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = body.username?.trim();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { organization: { select: { active: true } } },
  });

  // Constant-ish failure message to avoid leaking which usernames exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  if (!user.organization.active && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Your account is suspended. Contact the administrator." },
      { status: 403 }
    );
  }

  const token = await signSession({
    userId: user.id,
    organizationId: user.organizationId,
    username: user.username,
    role: user.role === "ADMIN" ? "ADMIN" : "USER",
  });

  const res = NextResponse.json({
    ok: true,
    user: { username: user.username, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
