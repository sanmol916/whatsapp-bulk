"use client";

import { useEffect, useState } from "react";

interface SettingsData {
  organization: {
    name: string;
    plan: string;
    planLabel: string;
    messageLimit: number;
    contactLimit: number;
    messagesUsed: number;
  };
  whatsapp: {
    apiVersion: string;
    phoneNumberId: string;
    businessId: string;
    tokenMask: string;
    connected: boolean;
  };
  verifyToken: string;
}

function fmt(n: number) {
  return n < 0 ? "Unlimited" : n.toLocaleString("en-IN");
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [apiVersion, setApiVersion] = useState("v21.0");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  async function load() {
    const res = await fetch("/api/settings");
    const d: SettingsData = await res.json();
    setData(d);
    setApiVersion(d.whatsapp.apiVersion || "v21.0");
    setPhoneNumberId(d.whatsapp.phoneNumberId || "");
    setBusinessId(d.whatsapp.businessId || "");
  }

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiVersion, phoneNumberId, businessId, accessToken }),
      });
      const d = await res.json();
      if (!res.ok) setMessage(d.error ?? "Save failed");
      else {
        setMessage("Saved. WhatsApp settings updated.");
        setAccessToken("");
        await load();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  const callbackUrl = origin ? `${origin}/api/webhook` : "/api/webhook";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Plan summary */}
      {data && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm text-gray-500">Business</div>
              <div className="text-lg font-semibold">{data.organization.name}</div>
            </div>
            <span className="badge bg-brand-50 text-brand-dark">
              {data.organization.planLabel} plan
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Messages / month</div>
              <div className="font-semibold">{fmt(data.organization.messageLimit)}</div>
            </div>
            <div>
              <div className="text-gray-500">Used this month</div>
              <div className="font-semibold">
                {data.organization.messagesUsed.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Contact limit</div>
              <div className="font-semibold">{fmt(data.organization.contactLimit)}</div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp connection */}
      <form onSubmit={save} className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Connect WhatsApp</h2>
          {data && (
            <span
              className={`badge ${
                data.whatsapp.connected
                  ? "bg-brand-50 text-brand-dark"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {data.whatsapp.connected ? "Connected" : "Not connected"}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Enter the credentials from your Meta app (WhatsApp → API Setup).
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Phone Number ID</label>
            <input
              className="input"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="1234567890"
            />
          </div>
          <div>
            <label className="label">WhatsApp Business Account ID</label>
            <input
              className="input"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="1234567890"
            />
          </div>
        </div>

        <div>
          <label className="label">
            Permanent Access Token{" "}
            {data?.whatsapp.tokenMask && (
              <span className="font-normal text-gray-400">
                (saved: {data.whatsapp.tokenMask} — leave blank to keep)
              </span>
            )}
          </label>
          <input
            className="input"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAB… (paste a new token to update)"
          />
        </div>

        <div>
          <label className="label">API Version</label>
          <input
            className="input md:w-40"
            value={apiVersion}
            onChange={(e) => setApiVersion(e.target.value)}
            placeholder="v21.0"
          />
        </div>

        {message && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-dark">{message}</p>
        )}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save WhatsApp settings"}
        </button>
      </form>

      {/* Webhook helper */}
      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Webhook configuration</h2>
        <p className="mb-3 text-sm text-gray-600">
          In Meta → WhatsApp → Configuration → Webhook, use these values. Then subscribe to
          the <code>messages</code> field.
        </p>
        <div className="space-y-2 text-sm">
          <div>
            <div className="text-gray-500">Callback URL</div>
            <code className="block break-all rounded-lg bg-gray-50 px-3 py-2">{callbackUrl}</code>
          </div>
          <div>
            <div className="text-gray-500">Verify token</div>
            <code className="block break-all rounded-lg bg-gray-50 px-3 py-2">
              {data?.verifyToken || "(set WEBHOOK_VERIFY_TOKEN on the server)"}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
