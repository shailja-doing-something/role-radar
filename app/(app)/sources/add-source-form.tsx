"use client";

import { useState } from "react";
import { Plus, X, Link } from "lucide-react";
import { useRouter } from "next/navigation";

export function AddSourceForm() {
  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState("");
  const [slug, setSlug]       = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);
  const router = useRouter();

  // Auto-generate slug from name
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
        const data = await res.json().catch(() => ({}));
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus size={15} /> Add Source
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-blue-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">Add New Source</h3>
        <button onClick={reset} className="text-gray-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Board Name</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Stack Overflow Jobs"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. stackoverflow"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 font-mono focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-1.5">
            <span className="flex items-center gap-1.5">
              <Link size={11} /> Base URL
            </span>
          </label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://jobs.example.com/api/jobs"
            type="url"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
          <p className="text-gray-600 text-xs mt-1.5">
            If a JSON API, it will be scraped directly. Otherwise Gemini will extract postings from the HTML.
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Adding…" : "Add Source"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
