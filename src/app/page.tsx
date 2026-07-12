import { ArrowRight, BarChart3, Shield, Users } from "lucide-react";
import Link from "next/link";
import { GlassShell } from "@/components/layout/glass-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <GlassShell>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">Canyon</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/login">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <section className="animate-panel-in text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Business &amp; Tech Operations
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight md:text-6xl">
            <span className="text-gradient">Project clarity</span>
            <br />
            for modern teams
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Canyon gives administrators, project managers, and team members a single
            place to manage access, assign work, and track progress.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/login">Open dashboard</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/login">View demo accounts</Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Administrator",
              copy: "Manage users, roles, projects, and system access from one control surface.",
            },
            {
              icon: BarChart3,
              title: "Project Manager",
              copy: "Create projects, assign members, and manage tasks across your portfolio.",
            },
            {
              icon: Users,
              title: "Team Member",
              copy: "View assigned projects and tasks, then update progress as work moves forward.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="p-6">
                <item.icon className="h-5 w-5 text-accent" />
                <h2 className="mt-4 font-display text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </GlassShell>
  );
}