import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { name: true, plan: true },
  });

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        businessName={org?.name ?? "Business"}
        username={session.username}
        planLabel={getPlan(org?.plan).label}
        isAdmin={session.role === "ADMIN"}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
