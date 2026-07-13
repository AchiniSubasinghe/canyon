import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AppShell>
        <div className="flex min-h-dvh">
          <AppSidebar />
          <main
            id="main-content"
            className="flex-1 overflow-auto px-6 pb-10 pt-6 md:px-8 md:pb-12 md:pt-8"
          >
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
