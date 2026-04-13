import { Settings, Clock } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white mb-8">
        <Settings size={22} className="text-blue-400" />
        Settings
      </h1>

      <div className="max-w-xl space-y-6">
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
      </div>
    </div>
  );
}
