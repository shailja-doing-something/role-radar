"use client";

import { useState, useEffect } from "react";
import { Plus, X, Link } from "lucide-react";
import { useRouter } from "next/navigation";

export function AddSourceForm() {
  const [open,    setOpen]    = useState(false);
  const [name,    setName]    = useState("");
  const [slug,    setSlug]    = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") reset();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function handleNameChange(val: string) {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  function reset() {
    setName(""); setSlug(""); setBaseUrl(""); setError(""); setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !baseUrl.trim()) {
      setError("All fields are required."); return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), baseUrl: baseUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Failed to add source.");
      } else {
        reset();
        router.refresh();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus size={14} /> Add Source
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={reset}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[400px] bg-surface border-l border-edge shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-edge">
          <h2 className="text-ink font-semibold">Add Source</h2>
          <button
            type="button"
            onClick={reset}
            className="text-fg3 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-6 py-5 gap-4 overflow-y-auto">
          <div>
            <label className="block text-fg2 text-xs mb-1.5">Board Name</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Stack Overflow Jobs"
              className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-ink text-sm placeholder-fg3 focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-fg2 text-xs mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. stackoverflow"
              className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-ink text-sm placeholder-fg3 font-mono focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-fg2 text-xs mb-1.5">
              <span className="flex items-center gap-1.5">
                <Link size={11} /> Base URL
              </span>
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://jobs.example.com/api/jobs"
              type="url"
              className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-ink text-sm placeholder-fg3 focus:outline-none focus:border-primary transition-colors"
              required
            />
            <p className="text-fg3 text-xs mt-1.5 leading-relaxed">
              JSON API endpoints are scraped directly. HTML pages are parsed by Gemini.
            </p>
          </div>

          {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

          <div className="mt-auto flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {saving ? "Adding…" : "Add Source"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 text-sm text-fg2 hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
