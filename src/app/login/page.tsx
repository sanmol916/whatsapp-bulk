"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-darker via-brand-dark to-brand p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3 0 .2 0 .7-.3 1.2Z" />
            </svg>
          </div>
          <h1 className="mt-3 text-2xl font-bold">WA Sender</h1>
          <p className="text-sm text-white/80">WhatsApp Business Platform</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>

          <div>
            <label className="label">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="yourname"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-xs text-gray-400">
            Accounts are created by the administrator.
          </p>
        </form>
      </div>
    </div>
  );
}
