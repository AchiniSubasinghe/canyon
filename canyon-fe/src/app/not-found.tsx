import Link from "next/link";
import { CanyonMark } from "@/components/brand/canyon-mark";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppShell>
      <main
        id="main-content"
        className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center"
      >
        <CanyonMark size="lg" />
        <p className="page-kicker mt-8">404</p>
        <h1 className="page-title">Page not found</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          That route does not exist. Head back to your dashboard or sign in.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </main>
    </AppShell>
  );
}
