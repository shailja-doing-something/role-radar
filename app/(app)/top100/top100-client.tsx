"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2, Plus, X, MapPin, Building2, Briefcase } from "lucide-react";

interface Team {
  id: number;
  name: string;
  brokerage: string | null;
  location: string | null;
  website: string | null;
}

export function Top100Client({ teams: initial }: { teams: Team[] }) {
  const [teams, setTeams] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", brokerage: "", location: "", website: "" });
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setAddError("Team name is required."); return; }
    setSaving(true); setAddError("");
    try {
      const res = await fetch("/api/top100/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setAddError(d.error ?? "Failed to add team.");
      } else {
        const team = await res.json();
        setTeams((t) => [...t, team]);
        setForm({ name: "", brokerage: "", location: "", website: "" });
        setShowAdd(false);
        router.refresh();
      }
    } catch {
      setAddError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Remove "${name}" from the list?`)) return;
    setDeletingId(id);
    try {
      await fetch(`/api/top100/${id}`, { method: "DELETE" });
      setTeams((t) => t.filter((team) => team.id !== id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Add Team Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">Add Team</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              {[
                { label: "Team Name *", key: "name", placeholder: "e.g. The Smith Group", required: true },
                { label: "Brokerage", key: "brokerage", placeholder: "e.g. Keller Williams" },
                { label: "Location", key: "location", placeholder: "e.g. Austin, TX" },
                { label: "Website", key: "website", placeholder: "https://example.com" },
              ].map(({ label, key, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-gray-400 text-xs mb-1">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required={required}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              ))}
              {addError && <p className="text-red-400 text-sm">{addError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? "Adding…" : "Add Team"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{teams.length} teams</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} /> Add Team
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium px-6 py-3 w-14">#</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Team</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Brokerage</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Location</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Website</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Jobs</th>
              <th className="px-6 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr key={team.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-3">
                  <span className={`font-bold text-base ${
                    i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-600"
                  }`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-200 font-medium">{team.name}</span>
                </td>
                <td className="px-4 py-3">
                  {team.brokerage ? (
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <Building2 size={11} className="shrink-0" />
                      {team.brokerage}
                    </span>
                  ) : (
                    <span className="text-gray-700 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {team.location ? (
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <MapPin size={11} className="shrink-0" />
                      {team.location}
                    </span>
                  ) : (
                    <span className="text-gray-700 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {team.website ? (
                    <a
                      href={team.website.startsWith("http") ? team.website : `https://${team.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
                    >
                      <ExternalLink size={11} className="shrink-0" />
                      Visit
                    </a>
                  ) : (
                    <span className="text-gray-700 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/postings?company=${encodeURIComponent(team.name)}&top100Only=true`}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
                    title="View open roles"
                  >
                    <Briefcase size={11} className="shrink-0" />
                    View roles
                  </a>
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => handleDelete(team.id, team.name)}
                    disabled={deletingId === team.id}
                    className="text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                    title="Remove team"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
