import { prisma } from "@/lib/prisma";
import { Trophy } from "lucide-react";
import Link from "next/link";

export default async function Top100Page() {
  const companies = await prisma.jobPosting.groupBy({
    by: ["company"],
    _count: { company: true },
    orderBy: { _count: { company: "desc" } },
    take: 100,
  });

  return (
    <div className="p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white mb-6">
        <Trophy size={22} className="text-blue-400" />
        Top 100 Teams
      </h1>

      {companies.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Trophy size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            No data yet. Run a scrape from Sources to populate job postings.
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-6 py-3 w-16">
                  Rank
                </th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">
                  Company
                </th>
                <th className="text-right text-gray-500 font-medium px-6 py-3">
                  Open Roles
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr
                  key={c.company}
                  className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-6 py-3">
                    {i < 3 ? (
                      <span
                        className={`font-bold text-base ${
                          i === 0
                            ? "text-yellow-400"
                            : i === 1
                            ? "text-gray-400"
                            : "text-amber-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                    ) : (
                      <span className="text-gray-600">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/company/${encodeURIComponent(c.company)}`}
                      className="text-gray-200 font-medium hover:text-blue-400 transition-colors"
                    >
                      {c.company}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-blue-400 font-semibold">
                      {c._count.company}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
