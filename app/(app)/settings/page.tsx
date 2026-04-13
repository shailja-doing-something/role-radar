import { Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <div className="p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white mb-8">
        <Settings size={22} className="text-blue-400" />
        Settings
      </h1>

      <div className="max-w-xl">
        <SettingsForm
          initialFrequency={settings?.scrapeFrequency ?? ""}
          initialEmailDigest={settings?.emailDigest ?? false}
          initialEmailRecipients={settings?.emailRecipients ?? ""}
        />
      </div>
    </div>
  );
}
