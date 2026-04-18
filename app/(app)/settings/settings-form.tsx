"use client";

import { useState } from "react";
import { Clock, Mail, Check } from "lucide-react";

interface Props {
  initialFrequency:       string;
  initialEmailDigest:     boolean;
  initialEmailRecipients: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  "6h":    "every 6 hours",
  "12h":   "every 12 hours",
  "daily": "daily",
  "weekly": "weekly",
};

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon:     React.ElementType;
  title:    string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-edge rounded-xl p-6">
      <h2 className="flex items-center gap-2 text-white font-semibold text-sm mb-5">
        <Icon size={14} className="text-indigo-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingsForm({
  initialFrequency,
  initialEmailDigest,
  initialEmailRecipients,
}: Props) {
  const [frequency,       setFrequency]       = useState(initialFrequency);
  const [emailDigest,     setEmailDigest]     = useState(initialEmailDigest);
  const [emailRecipients, setEmailRecipients] = useState(initialEmailRecipients);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrapeFrequency: frequency || null,
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
    <>
      {/* ── Scrape Schedule ──────────────────────────────────────────────────── */}
      <SectionCard icon={Clock} title="Scrape Schedule">
        <div>
          <label className="block text-fg2 text-xs mb-1.5">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full bg-surface-raised border border-edge text-fg2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value=""       className="bg-surface-raised">Manual only (no auto-scrape)</option>
            <option value="6h"    className="bg-surface-raised">Every 6 hours</option>
            <option value="12h"   className="bg-surface-raised">Every 12 hours</option>
            <option value="daily" className="bg-surface-raised">Daily</option>
            <option value="weekly" className="bg-surface-raised">Weekly</option>
          </select>
          <p className="text-fg3 text-xs mt-2 leading-relaxed">
            {frequency
              ? `Scheduler runs automatically ${FREQUENCY_LABELS[frequency] ?? frequency}. Pattern analysis runs after each scrape.`
              : "No automatic scraping. Trigger manually from the Dashboard."}
          </p>
        </div>
      </SectionCard>

      {/* ── Email Notifications ──────────────────────────────────────────────── */}
      <SectionCard icon={Mail} title="Email Notifications">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Email digest</p>
              <p className="text-fg3 text-xs mt-0.5">Send a summary after each scrape completes</p>
            </div>
            <button
              type="button"
              onClick={() => setEmailDigest((v) => !v)}
              aria-pressed={emailDigest}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                emailDigest ? "bg-indigo-500" : "bg-surface-raised border border-edge"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  emailDigest ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {emailDigest && (
            <div>
              <label className="block text-fg2 text-xs mb-1.5">Recipients</label>
              <input
                type="text"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="alice@example.com, bob@example.com"
                className="w-full bg-surface-raised border border-edge text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder-fg3"
              />
              <p className="text-fg3 text-xs mt-1.5">Comma-separated email addresses</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Save ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-green-400 text-sm">
            <Check size={14} /> Saved
          </span>
        )}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </>
  );
}
