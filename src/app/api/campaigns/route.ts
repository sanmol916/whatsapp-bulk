import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSendQueue, type SendJobData } from "@/lib/queue";
import { resolveField } from "@/lib/phone";

export const dynamic = "force-dynamic";

// GET /api/campaigns — list campaigns (newest first)
export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ campaigns });
}

interface CreateCampaignBody {
  name?: string;
  templateName?: string;
  templateLang?: string;
  variableMapping?: string[];
  audience?: "all" | "optedIn";
}

// POST /api/campaigns — create a campaign and enqueue one job per contact.
export async function POST(req: NextRequest) {
  let body: CreateCampaignBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const templateName = body.templateName?.trim();
  const templateLang = body.templateLang?.trim() || "en_US";
  const variableMapping = Array.isArray(body.variableMapping)
    ? body.variableMapping
    : [];
  const audience = body.audience === "all" ? "all" : "optedIn";

  if (!name || !templateName) {
    return NextResponse.json(
      { error: "name and templateName are required" },
      { status: 400 }
    );
  }

  // Validate the template exists locally and is approved.
  const template = await prisma.template.findUnique({
    where: { name_language: { name: templateName, language: templateLang } },
  });
  if (!template) {
    return NextResponse.json(
      { error: "Template not found. Sync templates first." },
      { status: 400 }
    );
  }
  if (template.status !== "APPROVED") {
    return NextResponse.json(
      { error: `Template is ${template.status}, not APPROVED.` },
      { status: 400 }
    );
  }
  if (variableMapping.length !== template.variableCount) {
    return NextResponse.json(
      {
        error: `Template expects ${template.variableCount} variable(s); received ${variableMapping.length} mapping(s).`,
      },
      { status: 400 }
    );
  }

  // Resolve audience.
  const contacts = await prisma.contact.findMany({
    where: audience === "optedIn" ? { optedIn: true } : {},
    select: { id: true, phone: true, name: true, attributes: true },
  });
  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "No contacts match the selected audience." },
      { status: 400 }
    );
  }

  // Create the campaign.
  const campaign = await prisma.campaign.create({
    data: {
      name,
      templateName,
      templateLang,
      variableMapping,
      status: "QUEUED",
      totalCount: contacts.length,
    },
  });

  // Create one Message row per contact.
  await prisma.message.createMany({
    data: contacts.map((c) => ({
      campaignId: campaign.id,
      contactId: c.id,
      phone: c.phone,
      status: "QUEUED" as const,
    })),
  });

  // Fetch the created messages to get their IDs, then enqueue jobs.
  const messages = await prisma.message.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, contactId: true, phone: true },
  });
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const jobs = messages.map((m) => {
    const contact = contactById.get(m.contactId)!;
    const bodyParams = variableMapping.map((path) =>
      resolveField(contact, path)
    );
    const data: SendJobData = {
      messageId: m.id,
      campaignId: campaign.id,
      to: m.phone,
      templateName,
      languageCode: templateLang,
      bodyParams,
    };
    return { name: "send", data };
  });

  await getSendQueue().addBulk(jobs);

  return NextResponse.json({ campaign, enqueued: jobs.length }, { status: 201 });
}
