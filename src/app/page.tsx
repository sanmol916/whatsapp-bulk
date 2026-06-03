import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [contacts, templates, campaigns, sent] = await Promise.all([
      prisma.contact.count(),
      prisma.template.count(),
      prisma.campaign.count(),
      prisma.message.count({ where: { status: { in: ["SENT", "DELIVERED", "READ"] } } }),
    ]);
    return { contacts, templates, campaigns, sent, ok: true as const };
  } catch {
    return { contacts: 0, templates: 0, campaigns: 0, sent: 0, ok: false as const };
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="text-3xl font-semibold text-brand-dark">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const stats = await getStats();
  const configured = isWhatsAppConfigured();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {!configured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          WhatsApp Cloud API is not configured. Set <code>WHATSAPP_PHONE_NUMBER_ID</code> and{" "}
          <code>WHATSAPP_ACCESS_TOKEN</code> in your <code>.env</code> file to enable sending.
        </div>
      )}

      {!stats.ok && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Could not reach the database. Start Postgres (<code>docker compose up -d</code>) and run{" "}
          <code>npm run prisma:migrate</code>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Contacts" value={stats.contacts} />
        <StatCard label="Templates" value={stats.templates} />
        <StatCard label="Campaigns" value={stats.campaigns} />
        <StatCard label="Messages sent" value={stats.sent} />
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 font-semibold">Quick start</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
          <li><Link href="/contacts" className="text-brand-dark underline">Import contacts</Link> from a CSV.</li>
          <li><Link href="/templates" className="text-brand-dark underline">Sync templates</Link> from your WhatsApp Business Account.</li>
          <li><Link href="/campaigns" className="text-brand-dark underline">Create a campaign</Link> and send in bulk.</li>
        </ol>
      </div>
    </div>
  );
}
