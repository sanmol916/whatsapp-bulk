"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  businessName: string;
  username: string;
  planLabel: string;
  isAdmin: boolean;
}

const ICONS: Record<string, string> = {
  Dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  Contacts: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z",
  Templates: "M4 6h16M4 10h16M4 14h10M4 18h6",
  Campaigns: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  Settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  Admin: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
};

export default function Sidebar({ businessName, username, planLabel, isAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/contacts", label: "Contacts" },
    { href: "/templates", label: "Templates" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/settings", label: "Settings" },
  ];
  if (isAdmin) links.push({ href: "/admin", label: "Admin" });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-brand-darker px-4 py-3 text-white md:hidden">
        <span className="font-bold">WA Sender</span>
        <button onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 bg-brand-darker text-white md:block md:w-64`}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-2 px-5 py-5 md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Z" />
              </svg>
            </span>
            <div>
              <div className="font-bold leading-tight">WA Sender</div>
              <div className="text-[11px] text-white/60">Business Platform</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(l.href)
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={ICONS[l.label]} />
                </svg>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-white/10 p-3">
            <div className="rounded-lg bg-white/10 px-3 py-2">
              <div className="truncate text-sm font-semibold">{businessName}</div>
              <div className="flex items-center justify-between">
                <span className="truncate text-xs text-white/60">@{username}</span>
                <span className="badge bg-brand/20 text-brand-light">{planLabel}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
