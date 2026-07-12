import { RequireAuth } from "@/components/auth/require-auth";
import { GlassShell } from "@/components/layout/glass-shell";
import { GlassSidebar } from "@/components/layout/glass-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <GlassShell>
        <div className="flex min-h-screen">
          <GlassSidebar />
          <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
        </div>
      </GlassShell>
    </RequireAuth>
  );
}