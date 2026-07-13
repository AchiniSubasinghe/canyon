"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CanyonMark } from "@/components/brand/canyon-mark";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success("Signed in");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Sign in failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-dvh items-center justify-center px-4">
          <div className="w-full max-w-md space-y-4">
            <Skeleton className="mx-auto h-12 w-12 rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main
        id="main-content"
        className="flex min-h-dvh flex-col items-center justify-center px-4 py-12"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <CanyonMark size="lg" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Canyon</h1>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Project and task management for your team.
          </p>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your work email to access projects and tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
                {form.formState.errors.email ? (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
