import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

/**
 * Gatekeeper for the whole app.
 * - Public: /login, /api/auth/*, /api/webhook (Meta calls this), static assets.
 * - Everything else requires a valid session cookie.
 * - /admin and /api/admin additionally require an ADMIN role.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always-public paths.
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhook");

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  // Logged-in users visiting /login go to the dashboard.
  if (pathname.startsWith("/login") && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPublic) return NextResponse.next();

  // Unauthenticated.
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only areas.
  const isAdminArea =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminArea && session.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
