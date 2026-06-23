"use client";

import { useEffect, useMemo, useState, Fragment } from "react";

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    COMPLETED: "bg-brand-50 text-brand-dark",
    SENDING: "bg-blue-100 text-blue-700",
    QUEUED: "bg-amber-100 text-amber-700",
    FAILED: "bg-red-100 text-red-700",
    DRAFT: "bg-gray-100 text-gray-600",
  };
  return <span className={`badge ${map[status] ?? "bg-gray-100 text-gray-600"}`}>{status}</span>;
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
  const [error, setError] = useState<string | null>(null);

  const [failuresByCampaign, setFailuresByCampaign] = useState<
    Record<string, { phone: string; error: string | null }[]>
  >({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function toggleFailures(campaignId: string) {
    if (expandedId === campaignId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      const data = await res.json();
      setFailuresByCampaign((prev) => ({ ...prev, [campaignId]: data.failures ?? [] }));
    } catch {
      setFailuresByCampaign((prev) => ({ ...prev, [campaignId]: [] }));
    }
  }

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
    setError(null);
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
        setError(data.error ?? "Failed to create campaign");
      } else {
        setMessage(`Campaign created — ${data.enqueued} message(s) queued.`);
        setName("");
        await loadAll();
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Campaigns</h1>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <h2 className="font-semibold">New campaign</h2>

        <div>
          <label className="label">Campaign name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input"
            placeholder="May promo blast"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Template (approved)</label>
            <select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              required
              className="input"
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
            <label className="label">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "optedIn" | "all")}
              className="input"
            >
              <option value="optedIn">Opted-in contacts only</option>
              <option value="all">All contacts</option>
            </select>
          </div>
        </div>

        {selectedTemplate && selectedTemplate.variableCount > 0 && (
          <div className="space-y-2">
            <label className="label">Map template variables to contact fields</label>
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
                  className="input"
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

        {message && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-dark">{message}</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !selectedTemplate || templates.length === 0}
          className="btn-primary"
        >
          {submitting ? "Sending…" : "Create & send"}
        </button>
        {templates.length === 0 && (
          <p className="text-sm text-amber-700">
            No approved templates available. Sync templates first.
          </p>
        )}
      </form>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <span className="font-semibold">History</span>
          <button onClick={loadAll} className="text-sm text-brand-dark underline">
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-2.5">Name</th>
                <th className="px-5 py-2.5">Template</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5">Sent</th>
                <th className="px-5 py-2.5">Failed</th>
                <th className="px-5 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-t border-gray-100">
                    <td className="px-5 py-2.5">{c.name}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{c.templateName}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-2.5">{c.sentCount}</td>
                    <td className="px-5 py-2.5">
                      {c.failedCount > 0 ? (
                        <button
                          onClick={() => toggleFailures(c.id)}
                          className="font-medium text-red-600 underline"
                        >
                          {c.failedCount} {expandedId === c.id ? "▲" : "▼"}
                        </button>
                      ) : (
                        c.failedCount
                      )}
                    </td>
                    <td className="px-5 py-2.5">{c.totalCount}</td>
                  </tr>
                  {expandedId === c.id && (
                    <tr className="border-t border-gray-100 bg-red-50">
                      <td colSpan={6} className="px-5 py-3">
                        <p className="mb-2 text-xs font-semibold text-red-700">
                          Why these messages failed:
                        </p>
                        {failuresByCampaign[c.id] === undefined ? (
                          <p className="text-xs text-gray-500">Loading…</p>
                        ) : failuresByCampaign[c.id].length === 0 ? (
                          <p className="text-xs text-gray-500">No error details recorded.</p>
                        ) : (
                          <ul className="space-y-1">
                            {failuresByCampaign[c.id].map((f, i) => (
                              <li key={i} className="text-xs">
                                <span className="font-mono text-gray-600">{f.phone}</span> —{" "}
                                <span className="text-red-700">{f.error}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
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
