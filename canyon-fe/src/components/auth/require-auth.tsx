"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import type { RoleName } from "@/lib/types";

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: RoleName[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && user && roles?.length) {
      const allowed = roles.some((role) => user.roles.includes(role));
      if (!allowed) {
        router.replace("/dashboard");
      }
    }
  }, [loading, user, roles, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="w-full max-w-md space-y-3 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (roles?.length && !roles.some((role) => user.roles.includes(role))) return null;

  return children;
}