"use client";

import { useState } from "react";
import { Clock, Mail } from "lucide-react";

interface Props {
  initialFrequency: string;
  initialEmailDigest: boolean;
  initialEmailRecipients: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  "6h":    "every 6 hours",
  "12h":   "every 12 hours",
  "daily": "daily",
  "weekly": "weekly",
};

export function SettingsForm({
  initialFrequency,
  initialEmailDigest,
  initialEmailRecipients,
}: Props) {
  const [frequency,        setFrequency]        = useState(initialFrequency);
  const [emailDigest,      setEmailDigest]      = useState(initialEmailDigest);
  const [emailRecipients,  setEmailRecipients]  = useState(initialEmailRecipients);
  const [saving,           setSaving]           = useState(false);
  const [saved,            setSaved]            = useState(false);
  const [error,            setError]            = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrapeFrequency: frequency  || null,
          emailDigest,
          emailRecipients: emailRecipients.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Scrape Schedule ──────────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-white font-semibold mb-5">
          <Clock size={16} className="text-gray-400" />
          Scrape Schedule
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Manual only (no auto-scrape)</option>
              <option value="6h">Every 6 hours</option>
              <option value="12h">Every 12 hours</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <p className="text-gray-600 text-xs mt-2">
              {frequency
                ? `Scheduler will run automatically ${FREQUENCY_LABELS[frequency] ?? frequency}. Pattern analysis runs after each scrape.`
                : "No automatic scraping. Use the Run Scrape Now button on the Dashboard to trigger manually."}
            </p>
          </div>
        </div>
      </section>

      {/* ── Email Notifications ──────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-white font-semibold mb-5">
          <Mail size={16} className="text-gray-400" />
          Email Notifications
        </h2>

        <div className="space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Email digest</p>
              <p className="text-gray-600 text-xs mt-0.5">
                Send a summary after each scrape completes
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEmailDigest((v) => !v)}
              aria-pressed={emailDigest}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                emailDigest ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  emailDigest ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Recipients — only shown when digest is on */}
          {emailDigest && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">Recipients</label>
              <input
                type="text"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="alice@example.com, bob@example.com"
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
              />
              <p className="text-gray-600 text-xs mt-2">Comma-separated email addresses</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Save ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved  && <span className="text-green-400 text-sm">Saved</span>}
        {error  && <span className="text-red-400  text-sm">{error}</span>}
      </div>
    </div>
  );
}
