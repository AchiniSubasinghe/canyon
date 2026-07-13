"use client";

import {
  Bot,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CanyonMark } from "@/components/brand/canyon-mark";
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
  { href: "/tasks", label: "Tasks", icon: ListTodo, roles: "all" },
  { href: "/agent", label: "Agent", icon: Bot, roles: "all" },
  { href: "/admin/users", label: "Users", icon: Users, roles: "admin" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (item.roles === "all") return true;
    if (item.roles === "admin") return isAdmin;
    return false;
  });

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar p-4">
      <div className="mb-8 flex items-center gap-3 px-2">
        <CanyonMark />
        <div>
          <p className="text-sm font-semibold tracking-tight">Canyon</p>
          <p className="font-mono text-[11px] text-muted-foreground">Task platform</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5" aria-label="Main">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-[color,background-color,transform] duration-200",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-border pt-4">
        <div className="flex items-center gap-3 px-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] font-medium text-foreground"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
