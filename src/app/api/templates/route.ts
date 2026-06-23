import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  listTemplates,
  countTemplateVariables,
  WhatsAppApiError,
} from "@/lib/whatsapp";
import { configFromOrg } from "@/lib/wa-config";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/templates — list this org's templates
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.template.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ templates });
}

// POST /api/templates — pull latest templates from Meta and upsert locally
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: {
      waApiVersion: true,
      waPhoneNumberId: true,
      waBusinessId: true,
      waAccessToken: true,
    },
  });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 400 });

  try {
    const remote = await listTemplates(configFromOrg(org));
    let synced = 0;

    for (const t of remote) {
      const bodyComponent = t.components?.find((c) => c.type === "BODY");
      const bodyText = bodyComponent?.text ?? null;

      await prisma.template.upsert({
        where: {
          organizationId_name_language: {
            organizationId: session.organizationId,
            name: t.name,
            language: t.language,
          },
        },
        create: {
          organizationId: session.organizationId,
          name: t.name,
          language: t.language,
          category: t.category ?? null,
          status: t.status,
          bodyText,
          variableCount: countTemplateVariables(bodyText ?? undefined),
        },
        update: {
          category: t.category ?? null,
          status: t.status,
          bodyText,
          variableCount: countTemplateVariables(bodyText ?? undefined),
          syncedAt: new Date(),
        },
      });
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (err) {
    if (err instanceof WhatsAppApiError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    return NextResponse.json(
      { error: "Failed to sync templates" },
      { status: 500 }
    );
  }
}
