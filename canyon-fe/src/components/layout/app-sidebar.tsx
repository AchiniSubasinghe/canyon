"use client";

import {
  Bot,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Sun,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CanyonMark } from "@/components/brand/canyon-mark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
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
  // Desktop-only sidebar. Hidden on mobile via parent or classes.
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const { toggleTheme, resolvedTheme } = useTheme();

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
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar p-4 md:flex">
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" className="flex-1 justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </Button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={resolvedTheme === "dark" ? "Light" : "Dark"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

// MobileNav renders the fixed top log header (mobile only) + slide-in panel with trail line signature.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const { toggleTheme, resolvedTheme } = useTheme();

  // ESC to close + basic scroll lock
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

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
    setOpen(false);
    await logout();
    router.push("/login");
  }

  function closePanel() {
    setOpen(false);
  }

  return (
    <>
      {/* Fixed mobile log header — only on < md. Paper aesthetic, hairline, minimal. */}
      <header className="fixed inset-x-0 top-0 z-[var(--z-sticky)] flex h-12 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <CanyonMark size="sm" />
          <div className="leading-none">
            <p className="text-sm font-semibold tracking-tight">Canyon</p>
            <p className="font-mono text-[10px] text-muted-foreground -mt-px">Task platform</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </header>

      {/* Slide-in panel + backdrop (the signature mobile nav) */}
      {open && (
        <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[1px]"
            onClick={closePanel}
          />

          {/* Panel — re-uses exact sidebar language + the canyon trail line */}
          <div
            className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-sidebar p-4 shadow-[var(--shadow-elevated)] animate-panel-in"
            style={{ transform: "translateX(0)" }}
          >
            <div className="mb-6 flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <CanyonMark size="md" />
                <div>
                  <p className="text-sm font-semibold tracking-tight">Canyon</p>
                  <p className="font-mono text-[11px] text-muted-foreground">Task platform</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close navigation"
                className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Nav list with the distinctive trail line (mobile-only aesthetic risk) */}
            <div className="relative flex-1">
              {/* The trail — thin vertical line evoking paths through canyon / survey maps.
                  Only here on mobile. Stepped opacity echoes status markers. */}
              <div
                aria-hidden
                className="absolute left-[17px] top-1 bottom-1 w-px bg-primary/25"
              />
              <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closePanel}
                      className={cn(
                        "relative flex items-center gap-3 rounded-sm pl-9 pr-3 py-2.5 text-sm transition-[color,background-color,transform] duration-200",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {/* Small notch on the trail for the active item */}
                      {active && (
                        <div
                          aria-hidden
                          className="absolute left-[13px] top-1/2 -mt-[3px] h-1.5 w-1.5 rounded-full bg-primary-foreground"
                        />
                      )}
                      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User + logout block — identical language to desktop */}
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
              <div className="flex items-center gap-1">
                <Button variant="ghost" className="flex-1 justify-start" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Sign out
                </Button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  title={resolvedTheme === "dark" ? "Light" : "Dark"}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Moon className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
