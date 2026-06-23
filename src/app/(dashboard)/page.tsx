import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { getPlan, formatLimit } from "@/lib/plans";

export const dynamic = "force-dynamic";

async function getData(organizationId: string) {
  try {
    const [contacts, templates, campaigns, sent, org] = await Promise.all([
      prisma.contact.count({ where: { organizationId } }),
      prisma.template.count({ where: { organizationId } }),
      prisma.campaign.count({ where: { organizationId } }),
      prisma.message.count({
        where: { organizationId, status: { in: ["SENT", "DELIVERED", "READ"] } },
      }),
      prisma.organization.findUnique({ where: { id: organizationId } }),
    ]);
    return { contacts, templates, campaigns, sent, org, ok: true as const };
  } catch {
    return { contacts: 0, templates: 0, campaigns: 0, sent: 0, org: null, ok: false as const };
  }
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card p-5">
      <div className={`text-3xl font-bold ${accent ? "text-brand-dark" : "text-gray-900"}`}>
        {value.toLocaleString("en-IN")}
      </div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getData(session.organizationId);
  const org = data.org;
  const plan = getPlan(org?.plan);
  const connected = Boolean(org?.waPhoneNumberId && org?.waAccessToken);
  const usagePct =
    org && org.messageLimit > 0
      ? Math.min(100, Math.round((org.messagesUsed / org.messageLimit) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {session.username}.</p>
        </div>
        <span className="badge bg-brand-50 text-brand-dark">{plan.label} plan</span>
      </div>

      {!connected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your WhatsApp number is not connected yet.{" "}
          <Link href="/settings" className="font-semibold underline">
            Connect it in Settings
          </Link>{" "}
          to start sending.
        </div>
      )}

      {!data.ok && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not reach the database.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Contacts" value={data.contacts} accent />
        <StatCard label="Templates" value={data.templates} accent />
        <StatCard label="Campaigns" value={data.campaigns} accent />
        <StatCard label="Messages sent" value={data.sent} accent />
      </div>

      {/* Usage meter */}
      {org && (
        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">Monthly message usage</span>
            <span className="text-gray-500">
              {org.messagesUsed.toLocaleString("en-IN")} / {formatLimit(org.messageLimit)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${org.messageLimit < 0 ? 4 : usagePct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Contact limit: {formatLimit(org.contactLimit)} · resets monthly
          </p>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Quick start</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
          <li>
            <Link href="/settings" className="text-brand-dark underline">
              Connect your WhatsApp number
            </Link>{" "}
            in Settings.
          </li>
          <li>
            <Link href="/contacts" className="text-brand-dark underline">
              Import contacts
            </Link>{" "}
            from a CSV.
          </li>
          <li>
            <Link href="/templates" className="text-brand-dark underline">
              Sync templates
            </Link>{" "}
            from your WhatsApp Business Account.
          </li>
          <li>
            <Link href="/campaigns" className="text-brand-dark underline">
              Create a campaign
            </Link>{" "}
            and send in bulk.
          </li>
        </ol>
      </div>
    </div>
  );
}
