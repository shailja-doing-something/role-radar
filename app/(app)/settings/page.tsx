import { Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import { ClearDataButton } from "./clear-data-button";

export default async function SettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <div className="px-10 pt-10 pb-16 max-w-[860px] mx-auto">

      {/* Page header */}
      <div className="flex items-center gap-2.5 mb-8">
        <Settings size={20} className="text-indigo-400" />
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>

      <div className="space-y-6">
        <SettingsForm
          initialFrequency={settings?.scrapeFrequency ?? ""}
          initialEmailDigest={settings?.emailDigest ?? false}
          initialEmailRecipients={settings?.emailRecipients ?? ""}
        />

        {/* Danger zone */}
        <section className="bg-surface border border-red-500/20 rounded-xl p-6">
          <h2 className="text-white font-semibold text-sm mb-1">Danger Zone</h2>
          <p className="text-fg3 text-xs mb-4 leading-relaxed">
            Permanently delete all scraped postings and analysis. Sources and settings are preserved.
          </p>
          <ClearDataButton />
        </section>
      </div>
    </div>
  );
}
