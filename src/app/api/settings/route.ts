import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";
import { getPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET /api/settings — current org profile, plan, usage and WA connection
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
  });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 400 });

  const plan = getPlan(org.plan);
  return NextResponse.json({
    organization: {
      name: org.name,
      plan: org.plan,
      planLabel: plan.label,
      messageLimit: org.messageLimit,
      contactLimit: org.contactLimit,
      messagesUsed: org.messagesUsed,
    },
    whatsapp: {
      apiVersion: org.waApiVersion,
      phoneNumberId: org.waPhoneNumberId ?? "",
      businessId: org.waBusinessId ?? "",
      tokenMask: maskSecret(decryptSecret(org.waAccessToken)),
      connected: Boolean(org.waPhoneNumberId && org.waAccessToken),
    },
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN ?? "",
  });
}

interface UpdateBody {
  apiVersion?: string;
  phoneNumberId?: string;
  businessId?: string;
  accessToken?: string; // optional: only update when a new one is provided
}

// POST /api/settings — update this org's WhatsApp credentials
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (typeof body.apiVersion === "string")
    data.waApiVersion = body.apiVersion.trim() || "v21.0";
  if (typeof body.phoneNumberId === "string")
    data.waPhoneNumberId = body.phoneNumberId.trim();
  if (typeof body.businessId === "string")
    data.waBusinessId = body.businessId.trim();
  // Only overwrite the token when a real new value is supplied.
  if (body.accessToken && body.accessToken.trim() && !body.accessToken.includes("•")) {
    data.waAccessToken = encryptSecret(body.accessToken.trim());
  }

  await prisma.organization.update({
    where: { id: session.organizationId },
    data,
  });

  return NextResponse.json({ ok: true });
}
