"use client";

import { useState } from "react";
import { Settings, User, Lock, Clock } from "lucide-react";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword]   = useState("");
  const [newPassword, setNewPassword]           = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [pwStatus, setPwStatus]                 = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwMessage, setPwMessage]               = useState("");

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwStatus("error"); setPwMessage("New passwords do not match."); return;
    }
    if (newPassword.length < 8) {
      setPwStatus("error"); setPwMessage("Password must be at least 8 characters."); return;
    }
    setPwStatus("loading");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPwStatus("success"); setPwMessage("Password updated successfully.");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        setPwStatus("error"); setPwMessage(data.error ?? "Failed to update password.");
      }
    } catch {
      setPwStatus("error"); setPwMessage("Something went wrong.");
    }
  }

  return (
    <div className="p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white mb-8">
        <Settings size={22} className="text-blue-400" />
        Settings
      </h1>

      <div className="max-w-xl space-y-6">
        {/* Account info */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="flex items-center gap-2 text-white font-semibold mb-4">
            <User size={16} className="text-gray-400" /> Account
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-500 text-sm">Email</span>
              <span className="text-gray-300 text-sm">admin@roleradar.local</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-500 text-sm">Role</span>
              <span className="text-blue-400 text-xs bg-blue-900/30 px-2 py-0.5 rounded-full">Admin</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500 text-sm">Plan</span>
              <span className="text-gray-300 text-sm">Self-hosted</span>
            </div>
          </div>
        </section>

        {/* Scrape schedule info */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="flex items-center gap-2 text-white font-semibold mb-4">
            <Clock size={16} className="text-gray-400" /> Scrape Schedule
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-500">Frequency</span>
              <span className="text-gray-300">Every 6 hours</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-500">First run after deploy</span>
              <span className="text-gray-300">5 seconds</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-500">Pattern analysis</span>
              <span className="text-gray-300">Auto — after every scrape</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500">Manual trigger</span>
              <span className="text-gray-300">Sources page → Scrape Now</span>
            </div>
          </div>
        </section>

        {/* Change password */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="flex items-center gap-2 text-white font-semibold mb-4">
            <Lock size={16} className="text-gray-400" /> Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { label: "Current Password", value: currentPassword, set: setCurrentPassword, auto: "current-password" },
              { label: "New Password",     value: newPassword,     set: setNewPassword,     auto: "new-password", hint: "Min 8 characters" },
              { label: "Confirm New",      value: confirmPassword, set: setConfirmPassword, auto: "new-password" },
            ].map(({ label, value, set, auto, hint }) => (
              <div key={label}>
                <label className="block text-gray-400 text-sm mb-1.5">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder={hint ?? "••••••••"}
                  required
                  autoComplete={auto}
                />
              </div>
            ))}

            {pwStatus !== "idle" && (
              <p className={`text-sm ${pwStatus === "success" ? "text-green-400" : pwStatus === "error" ? "text-red-400" : "text-gray-400"}`}>
                {pwMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={pwStatus === "loading"}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              {pwStatus === "loading" ? "Updating…" : "Update Password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
