import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN ?? "";

// GET — Meta webhook verification handshake.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Minimal shape of the parts of the webhook payload we use.
interface StatusEntry {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp?: string;
  errors?: { title?: string; message?: string }[];
}
interface InboundMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
}
interface WebhookBody {
  entry?: {
    changes?: {
      value?: {
        statuses?: StatusEntry[];
        messages?: InboundMessage[];
      };
    }[];
  }[];
}

const STATUS_MAP = {
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
} as const;

// POST — incoming status updates and inbound messages.
export async function POST(req: NextRequest) {
  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      // Delivery / read / failure receipts.
      for (const s of value.statuses ?? []) {
        await applyStatusUpdate(s);
      }

      // Inbound messages (replies) — log for the future two-way inbox.
      for (const m of value.messages ?? []) {
        if (m.type === "text") {
          console.log(`[inbound] ${m.from}: ${m.text?.body ?? ""}`);
        }
      }
    }
  }

  // Always 200 quickly so Meta does not retry.
  return NextResponse.json({ ok: true });
}

async function applyStatusUpdate(s: StatusEntry) {
  const mapped = STATUS_MAP[s.status];
  if (!mapped) return;

  const message = await prisma.message.findUnique({
    where: { waMessageId: s.id },
    select: { id: true, campaignId: true, status: true },
  });
  if (!message) return;

  const now = s.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date();
  const data: Record<string, unknown> = { status: mapped };
  if (mapped === "DELIVERED") data.deliveredAt = now;
  if (mapped === "READ") data.readAt = now;
  if (mapped === "FAILED") {
    data.error = s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? "Delivery failed";
  }

  await prisma.message.update({ where: { id: message.id }, data });

  // Keep the campaign's failed counter in sync.
  if (mapped === "FAILED" && message.status !== "FAILED") {
    await prisma.campaign.update({
      where: { id: message.campaignId },
      data: { failedCount: { increment: 1 } },
    });
  }
}
