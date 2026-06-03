"use client";

import { useEffect, useMemo, useState } from "react";

interface Template {
  id: string;
  name: string;
  language: string;
  status: string;
  variableCount: number;
}
interface Campaign {
  id: string;
  name: string;
  templateName: string;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}
interface Contact {
  name: string | null;
  attributes: Record<string, unknown>;
}

export default function CampaignsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [fieldOptions, setFieldOptions] = useState<string[]>(["name"]);

  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [audience, setAudience] = useState<"optedIn" | "all">("optedIn");
  const [mapping, setMapping] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => `${t.name}|${t.language}` === templateKey),
    [templates, templateKey]
  );

  async function loadAll() {
    const [tRes, cRes, ctRes] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/campaigns"),
      fetch("/api/contacts"),
    ]);
    const tData = await tRes.json();
    const cData = await cRes.json();
    const ctData = await ctRes.json();

    setTemplates((tData.templates ?? []).filter((t: Template) => t.status === "APPROVED"));
    setCampaigns(cData.campaigns ?? []);

    const keys = new Set<string>();
    (ctData.contacts ?? []).forEach((c: Contact) => {
      Object.keys(c.attributes ?? {}).forEach((k) => keys.add(`attributes.${k}`));
    });
    setFieldOptions(["name", ...Array.from(keys)]);
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Resize the mapping array when the selected template changes.
  useEffect(() => {
    const count = selectedTemplate?.variableCount ?? 0;
    setMapping((prev) => {
      const next = [...prev];
      next.length = count;
      return Array.from(next, (v) => v ?? "name");
    });
  }, [selectedTemplate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          templateName: selectedTemplate.name,
          templateLang: selectedTemplate.language,
          variableMapping: mapping,
          audience,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to create campaign");
      } else {
        setMessage(`Campaign created — ${data.enqueued} message(s) queued.`);
        setName("");
        await loadAll();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Campaigns</h1>

      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-5">
        <h2 className="font-semibold">New campaign</h2>

        <div>
          <label className="block text-sm font-medium">Campaign name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="May promo blast"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Template (approved)</label>
            <select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              required
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={`${t.name}|${t.language}`}>
                  {t.name} ({t.language})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "optedIn" | "all")}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              <option value="optedIn">Opted-in contacts only</option>
              <option value="all">All contacts</option>
            </select>
          </div>
        </div>

        {selectedTemplate && selectedTemplate.variableCount > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Map template variables to contact fields
            </label>
            {mapping.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-12 font-mono text-sm text-gray-500">{`{{${i + 1}}}`}</span>
                <select
                  value={val}
                  onChange={(e) => {
                    const next = [...mapping];
                    next[i] = e.target.value;
                    setMapping(next);
                  }}
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  {fieldOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {message && <p className="text-sm text-brand-dark">{message}</p>}

        <button
          type="submit"
          disabled={submitting || !selectedTemplate || templates.length === 0}
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Create & send"}
        </button>
        {templates.length === 0 && (
          <p className="text-sm text-amber-700">
            No approved templates available. Sync templates first.
          </p>
        )}
      </form>

      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <span className="font-semibold">History</span>
          <button onClick={loadAll} className="text-sm text-brand-dark underline">
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-2">Name</th>
                <th className="px-5 py-2">Template</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Sent</th>
                <th className="px-5 py-2">Failed</th>
                <th className="px-5 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-5 py-2">{c.name}</td>
                  <td className="px-5 py-2 font-mono text-xs">{c.templateName}</td>
                  <td className="px-5 py-2">{c.status}</td>
                  <td className="px-5 py-2">{c.sentCount}</td>
                  <td className="px-5 py-2">{c.failedCount}</td>
                  <td className="px-5 py-2">{c.totalCount}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-gray-400">
                    No campaigns yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
