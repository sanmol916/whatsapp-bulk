import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { getPlan, PLAN_IDS, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

async function requireAdminApi() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.role !== "ADMIN")
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session };
}

interface PatchBody {
  plan?: string;
  active?: boolean;
  password?: string;
  messageLimit?: number;
  contactLimit?: number;
}

// PATCH /api/admin/users/:id — change plan, suspend/activate, reset password
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAdminApi();
  if (error) return error;

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Update org-level fields (plan / limits / active).
  const orgData: Record<string, unknown> = {};
  if (body.plan && PLAN_IDS.includes(body.plan as PlanId)) {
    const plan = getPlan(body.plan as PlanId);
    orgData.plan = plan.id;
    orgData.messageLimit = plan.messageLimit;
    orgData.contactLimit = plan.contactLimit;
  }
  if (typeof body.messageLimit === "number") orgData.messageLimit = body.messageLimit;
  if (typeof body.contactLimit === "number") orgData.contactLimit = body.contactLimit;
  if (typeof body.active === "boolean") orgData.active = body.active;

  if (Object.keys(orgData).length > 0) {
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: orgData,
    });
  }

  // Optional password reset.
  if (body.password && body.password.length >= 6) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.password) },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users/:id — remove an account (and its org data)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAdminApi();
  if (error) return error;

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.id === session!.userId) {
    return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
  }
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot delete an admin account" }, { status: 400 });
  }

  // Deleting the org cascades to its users, contacts, templates, campaigns.
  await prisma.organization.delete({ where: { id: user.organizationId } });
  return NextResponse.json({ ok: true });
}
