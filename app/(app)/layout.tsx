import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Nav />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
