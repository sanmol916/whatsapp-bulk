import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/contacts — list this org's contacts (newest first)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return NextResponse.json({ contacts });
}

interface IncomingContact {
  phone?: string;
  name?: string;
  [key: string]: unknown;
}

// POST /api/contacts — bulk upsert contacts for the current org.
// Body: { contacts: [{ phone, name, ...customFields }] }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { contacts?: IncomingContact[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rows = Array.isArray(body.contacts) ? body.contacts : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { contactLimit: true },
  });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 400 });

  const currentCount = await prisma.contact.count({
    where: { organizationId: session.organizationId },
  });

  let imported = 0;
  let skipped = 0;
  let limitReached = false;
  const errors: string[] = [];

  for (const row of rows) {
    const phone = normalizePhone(row.phone);
    if (!phone) {
      skipped++;
      if (errors.length < 10) errors.push(`Invalid phone: ${row.phone ?? "(empty)"}`);
      continue;
    }

    // Enforce the plan's contact limit (counting only new contacts).
    if (org.contactLimit >= 0 && currentCount + imported >= org.contactLimit) {
      const exists = await prisma.contact.findUnique({
        where: { organizationId_phone: { organizationId: session.organizationId, phone } },
        select: { id: true },
      });
      if (!exists) {
        limitReached = true;
        break;
      }
    }

    const { phone: _p, name, ...rest } = row;
    const attributes: Record<string, Prisma.InputJsonValue> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null && v !== "") {
        attributes[k] = v as Prisma.InputJsonValue;
      }
    }

    await prisma.contact.upsert({
      where: { organizationId_phone: { organizationId: session.organizationId, phone } },
      create: { organizationId: session.organizationId, phone, name: name ?? null, attributes },
      update: { name: name ?? undefined, attributes },
    });
    imported++;
  }

  if (limitReached) {
    errors.push(
      `Contact limit (${org.contactLimit}) reached for your plan. Upgrade to add more.`
    );
  }

  return NextResponse.json({ imported, skipped, errors });
}
