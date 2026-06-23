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

// GET /api/admin/users — list all accounts with plan + usage
export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          plan: true,
          messageLimit: true,
          contactLimit: true,
          messagesUsed: true,
          active: true,
          waPhoneNumberId: true,
        },
      },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      organization: u.organization,
    })),
  });
}

interface CreateBody {
  username?: string;
  password?: string;
  businessName?: string;
  plan?: string;
}

// POST /api/admin/users — create a new business account (org + user)
export async function POST(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = body.username?.trim();
  const password = body.password ?? "";
  const businessName = body.businessName?.trim() || username || "Business";
  const planId = (PLAN_IDS.includes(body.plan as PlanId) ? body.plan : "FREE") as PlanId;

  if (!username || password.length < 6) {
    return NextResponse.json(
      { error: "Username and a password (min 6 chars) are required" },
      { status: 400 }
    );
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const plan = getPlan(planId);
  const passwordHash = await hashPassword(password);

  const org = await prisma.organization.create({
    data: {
      name: businessName,
      plan: plan.id,
      messageLimit: plan.messageLimit,
      contactLimit: plan.contactLimit,
    },
  });
  const user = await prisma.user.create({
    data: { username, passwordHash, role: "USER", organizationId: org.id },
  });

  return NextResponse.json(
    { ok: true, user: { id: user.id, username: user.username } },
    { status: 201 }
  );
}
