import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSendQueue, type SendJobData } from "@/lib/queue";
import { resolveField } from "@/lib/phone";
import { getSession } from "@/lib/auth";
import { orgWaConnected } from "@/lib/wa-config";

export const dynamic = "force-dynamic";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// GET /api/campaigns — list this org's campaigns (newest first)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: session.organizationId },
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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
  });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 400 });

  if (!org.active) {
    return NextResponse.json(
      { error: "Your account is suspended. Contact the administrator." },
      { status: 403 }
    );
  }

  if (!orgWaConnected(org)) {
    return NextResponse.json(
      { error: "WhatsApp is not connected. Add your credentials in Settings first." },
      { status: 400 }
    );
  }

  // Reset the monthly usage window if it has elapsed.
  let messagesUsed = org.messagesUsed;
  if (Date.now() - new Date(org.usageResetAt).getTime() > MONTH_MS) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { messagesUsed: 0, usageResetAt: new Date() },
    });
    messagesUsed = 0;
  }

  // Validate the template exists locally and is approved.
  const template = await prisma.template.findUnique({
    where: {
      organizationId_name_language: {
        organizationId: org.id,
        name: templateName,
        language: templateLang,
      },
    },
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

  // Resolve audience (scoped to this org).
  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: org.id,
      ...(audience === "optedIn" ? { optedIn: true } : {}),
    },
    select: { id: true, phone: true, name: true, attributes: true },
  });
  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "No contacts match the selected audience." },
      { status: 400 }
    );
  }

  // Enforce the plan's monthly message limit.
  if (org.messageLimit >= 0 && messagesUsed + contacts.length > org.messageLimit) {
    const remaining = Math.max(0, org.messageLimit - messagesUsed);
    return NextResponse.json(
      {
        error: `Monthly message limit reached. Your plan allows ${org.messageLimit} messages/month and you have ${remaining} left. This campaign needs ${contacts.length}. Upgrade your plan to send more.`,
      },
      { status: 403 }
    );
  }

  // Create the campaign.
  const campaign = await prisma.campaign.create({
    data: {
      organizationId: org.id,
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
      organizationId: org.id,
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
    const bodyParams = variableMapping.map((path) => resolveField(contact, path));
    const data: SendJobData = {
      organizationId: org.id,
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

  // Count usage immediately (we do not refund failures, keeping it simple).
  await prisma.organization.update({
    where: { id: org.id },
    data: { messagesUsed: { increment: contacts.length } },
  });

  return NextResponse.json({ campaign, enqueued: jobs.length }, { status: 201 });
}
