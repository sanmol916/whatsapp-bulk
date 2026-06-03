import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/campaigns/:id — campaign details + live status breakdown
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const grouped = await prisma.message.groupBy({
    by: ["status"],
    where: { campaignId: campaign.id },
    _count: { _all: true },
  });

  const stats: Record<string, number> = {
    QUEUED: 0,
    SENT: 0,
    DELIVERED: 0,
    READ: 0,
    FAILED: 0,
  };
  for (const g of grouped) stats[g.status] = g._count._all;

  return NextResponse.json({ campaign, stats });
}
