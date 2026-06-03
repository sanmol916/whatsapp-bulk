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
      ? "bg-green-100 text-green-700"
      : status === "REJECTED"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return <span className={`rounded px-2 py-0.5 text-xs ${color}`}>{status}</span>;
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
        <button
          onClick={sync}
          disabled={syncing}
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
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
        . Click <em>Sync</em> to pull the latest list and approval status here.
      </p>

      {message && <p className="text-sm text-brand-dark">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{t.name}</div>
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {t.language} · {t.category ?? "—"} · {t.variableCount} variable
              {t.variableCount === 1 ? "" : "s"}
            </div>
            {t.bodyText && (
              <p className="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-700">
                {t.bodyText}
              </p>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <div className="rounded-lg border bg-white p-6 text-center text-gray-400">
            No templates yet. Click <em>Sync from Meta</em>.
          </div>
        )}
      </div>
    </div>
  );
}
