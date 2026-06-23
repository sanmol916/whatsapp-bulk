"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  attributes: Record<string, unknown>;
  optedIn: boolean;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data.contacts ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contacts: results.data }),
          });
          const data = await res.json();
          if (!res.ok) {
            setMessage(data.error ?? "Import failed");
          } else {
            setMessage(
              `Imported ${data.imported}, skipped ${data.skipped}.` +
                (data.errors?.length ? ` ${data.errors.join("; ")}` : "")
            );
            await load();
          }
        } catch {
          setMessage("Network error during import");
        } finally {
          setLoading(false);
          e.target.value = "";
        }
      },
      error: () => {
        setMessage("Could not parse CSV file");
        setLoading(false);
      },
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contacts</h1>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Import from CSV</h2>
        <p className="mb-3 text-sm text-gray-600">
          CSV must include a <code>phone</code> column (international format, e.g.{" "}
          <code>919812345678</code>, no <code>+</code>). A <code>name</code> column is
          optional. Any other columns (e.g. <code>city</code>, <code>orderId</code>) are
          stored as custom fields for template variables.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={loading}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-darker"
        />
        {loading && <p className="mt-2 text-sm text-gray-500">Importing…</p>}
        {message && <p className="mt-2 text-sm text-brand-dark">{message}</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 font-semibold">
          {contacts.length} contact{contacts.length === 1 ? "" : "s"}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-2.5">Phone</th>
                <th className="px-5 py-2.5">Name</th>
                <th className="px-5 py-2.5">Custom fields</th>
                <th className="px-5 py-2.5">Opted in</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-5 py-2.5 font-mono">{c.phone}</td>
                  <td className="px-5 py-2.5">{c.name ?? "—"}</td>
                  <td className="px-5 py-2.5 text-gray-500">
                    {Object.keys(c.attributes ?? {}).length
                      ? Object.entries(c.attributes)
                          .map(([k, v]) => `${k}=${String(v)}`)
                          .join(", ")
                      : "—"}
                  </td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`badge ${
                        c.optedIn ? "bg-brand-50 text-brand-dark" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.optedIn ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    No contacts yet. Import a CSV to get started.
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
