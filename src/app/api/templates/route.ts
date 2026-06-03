import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  listTemplates,
  countTemplateVariables,
  WhatsAppApiError,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// GET /api/templates — list templates stored locally
export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ templates });
}

// POST /api/templates — pull latest templates from Meta and upsert locally
export async function POST() {
  try {
    const remote = await listTemplates();
    let synced = 0;

    for (const t of remote) {
      const bodyComponent = t.components?.find((c) => c.type === "BODY");
      const bodyText = bodyComponent?.text ?? null;

      await prisma.template.upsert({
        where: { name_language: { name: t.name, language: t.language } },
        create: {
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
