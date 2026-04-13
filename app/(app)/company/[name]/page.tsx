import { prisma } from "@/lib/prisma";
import { ArrowLeft, MapPin, DollarSign, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const company = decodeURIComponent(name);

  const postings = await prisma.jobPosting.findMany({
    where: { company: { equals: company, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, location: true, remote: true,
      salary: true, source: true, url: true, postedAt: true, createdAt: true,
    },
  });

  if (postings.length === 0) notFound();

  const remoteCount = postings.filter((p) => p.remote).length;

  return (
    <div className="p-8">
      <Link
        href="/top100"
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-6 transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Back to Top 100
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">{company}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{postings.length} open role{postings.length !== 1 ? "s" : ""}</span>
          {remoteCount > 0 && (
            <span className="text-blue-400">{remoteCount} remote</span>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium px-6 py-3">Role</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Location</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Salary</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Source</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Posted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {postings.map((p) => (
              <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200 font-medium">{p.title}</span>
                    {p.remote && (
                      <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded shrink-0">
                        Remote
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.location ? (
                    <span className="flex items-center gap-1 text-gray-400">
                      <MapPin size={11} />{p.location}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.salary ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <DollarSign size={11} />{p.salary.slice(0, 22)}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                    {p.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {p.postedAt
                    ? new Date(p.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                     className="text-gray-600 hover:text-blue-400 transition-colors">
                    <ExternalLink size={14} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
