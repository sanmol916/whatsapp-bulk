"use client";

import { useEffect, useState } from "react";

interface Account {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    plan: string;
    messageLimit: number;
    contactLimit: number;
    messagesUsed: number;
    active: boolean;
    waPhoneNumberId: string | null;
  };
}

const PLANS = ["FREE", "STARTER", "PRO", "BUSINESS", "UNLIMITED"];

function fmt(n: number) {
  return n < 0 ? "∞" : n.toLocaleString("en-IN");
}

export default function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // create form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState("FREE");
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setAccounts(data.users ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, businessName, plan }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data.error ?? "Failed to create");
      else {
        setMessage(`Account '${username}' created.`);
        setUsername("");
        setPassword("");
        setBusinessName("");
        setPlan("FREE");
        await load();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await load();
    else {
      const d = await res.json();
      setMessage(d.error ?? "Update failed");
    }
  }

  async function resetPassword(id: string, username: string) {
    const pwd = prompt(`New password for ${username} (min 6 chars):`);
    if (!pwd) return;
    if (pwd.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    await patch(id, { password: pwd });
    setMessage(`Password updated for ${username}.`);
  }

  async function remove(id: string, username: string) {
    if (!confirm(`Delete account '${username}' and ALL its data? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) await load();
    else {
      const d = await res.json();
      setMessage(d.error ?? "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin — Accounts</h1>

      {message && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-dark">{message}</p>
      )}

      {/* Create account */}
      <form onSubmit={create} className="card space-y-4 p-5">
        <h2 className="font-semibold">Create a new business account</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="acmecorp" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="min 6 chars" />
          </div>
          <div>
            <label className="label">Business name</label>
            <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={creating} className="btn-primary">
          {creating ? "Creating…" : "Create account"}
        </button>
      </form>

      {/* Accounts table */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 font-semibold">
          {accounts.length} account{accounts.length === 1 ? "" : "s"}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Business</th>
                <th className="px-4 py-2.5">Plan</th>
                <th className="px-4 py-2.5">Usage</th>
                <th className="px-4 py-2.5">WA</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 align-middle">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">@{a.username}</div>
                    {a.role === "ADMIN" && (
                      <span className="badge bg-brand-darker/10 text-brand-darker">Admin</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{a.organization.name}</td>
                  <td className="px-4 py-2.5">
                    <select
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      value={a.organization.plan}
                      onChange={(e) => patch(a.id, { plan: e.target.value })}
                      disabled={a.role === "ADMIN"}
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {a.organization.messagesUsed.toLocaleString("en-IN")} /{" "}
                    {fmt(a.organization.messageLimit)}
                  </td>
                  <td className="px-4 py-2.5">
                    {a.organization.waPhoneNumberId ? (
                      <span className="badge bg-brand-50 text-brand-dark">Set</span>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`badge ${
                        a.organization.active
                          ? "bg-brand-50 text-brand-dark"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {a.organization.active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {a.role !== "ADMIN" && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          onClick={() => patch(a.id, { active: !a.organization.active })}
                          className="text-brand-dark underline"
                        >
                          {a.organization.active ? "Suspend" : "Activate"}
                        </button>
                        <button
                          onClick={() => resetPassword(a.id, a.username)}
                          className="text-gray-600 underline"
                        >
                          Reset pwd
                        </button>
                        <button
                          onClick={() => remove(a.id, a.username)}
                          className="text-red-600 underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                    No accounts yet.
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
