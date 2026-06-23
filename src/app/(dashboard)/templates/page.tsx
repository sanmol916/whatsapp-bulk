"use client";

import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string | null;
  status: string;
  bodyText: string | null;
  variableCount: number;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "APPROVED"
      ? "bg-brand-50 text-brand-dark"
      : status === "REJECTED"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return <span className={`badge ${color}`}>{status}</span>;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function sync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/templates", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Sync failed");
      } else {
        setMessage(`Synced ${data.synced} template(s).`);
        await load();
      }
    } catch {
      setMessage("Network error during sync");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        <button onClick={sync} disabled={syncing} className="btn-primary">
          {syncing ? "Syncing…" : "Sync from Meta"}
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Templates are created and approved in the{" "}
        <a
          className="text-brand-dark underline"
          href="https://business.facebook.com/wa/manage/message-templates/"
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp Manager
        </a>
        . Click <em>Sync</em> to pull the latest list and approval status.
      </p>

      {message && <p className="text-sm text-brand-dark">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t.name}</div>
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {t.language} · {t.category ?? "—"} · {t.variableCount} variable
              {t.variableCount === 1 ? "" : "s"}
            </div>
            {t.bodyText && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-brand-light/40 p-3 text-sm text-gray-700">
                {t.bodyText}
              </p>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <div className="card p-8 text-center text-gray-400">
            No templates yet. Click <em>Sync from Meta</em>.
          </div>
        )}
      </div>
    </div>
  );
}
