"use client";

import {
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

type NavRole = "all" | "admin";

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: NavRole;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: "all" },
  { href: "/projects", label: "Projects", icon: FolderKanban, roles: "all" },
  { href: "/admin/users", label: "Users", icon: Users, roles: "admin" },
];

export function GlassSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (item.roles === "all") return true;
    if (item.roles === "admin") return isAdmin;
    return false;
  });

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className="glass-panel flex h-screen w-64 shrink-0 flex-col rounded-none border-y-0 border-l-0 p-4">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-sm font-semibold">Canyon</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Task Platform
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-border pt-4">
        <div className="px-2">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}