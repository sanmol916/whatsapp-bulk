import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

// GET /api/contacts — list contacts (newest first)
export async function GET() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ contacts });
}

interface IncomingContact {
  phone?: string;
  name?: string;
  [key: string]: unknown;
}

// POST /api/contacts — bulk upsert contacts.
// Body: { contacts: [{ phone, name, ...customFields }] }
// Reserved keys (phone, name) become columns; everything else goes to attributes.
export async function POST(req: NextRequest) {
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

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const phone = normalizePhone(row.phone);
    if (!phone) {
      skipped++;
      if (errors.length < 10) errors.push(`Invalid phone: ${row.phone ?? "(empty)"}`);
      continue;
    }

    const { phone: _p, name, ...rest } = row;
    const attributes: Record<string, Prisma.InputJsonValue> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null && v !== "") {
        attributes[k] = v as Prisma.InputJsonValue;
      }
    }

    await prisma.contact.upsert({
      where: { phone },
      create: { phone, name: name ?? null, attributes },
      update: { name: name ?? undefined, attributes },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped, errors });
}
