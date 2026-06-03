import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/templates", label: "Templates" },
  { href: "/campaigns", label: "Campaigns" },
];

export default function Nav() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-dark">
          <span className="inline-block h-3 w-3 rounded-full bg-brand" />
          WA Bulk Sender
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-gray-600 hover:text-brand-dark"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
