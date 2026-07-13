import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { AppSidebar, MobileNav } from "@/components/layout/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AppShell>
        {/* Mobile-only fixed header + slide panel. Fixed so it overlays; main gets top padding on mobile. */}
        <MobileNav />

        <div className="flex min-h-dvh">
          <AppSidebar />
          <main
            id="main-content"
            className="flex-1 overflow-auto px-4 pb-10 pt-14 md:px-8 md:pb-12 md:pt-8"
          >
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
