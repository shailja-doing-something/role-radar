import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-app-bg">
        <Nav />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
