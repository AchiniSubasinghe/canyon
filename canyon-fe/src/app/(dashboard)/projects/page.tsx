"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiFetchPaginated, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/hooks/use-fetch";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { isAdmin, isProjectManager } = useAuth();
  const canCreate = isAdmin || isProjectManager;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = useCallback(
    () => apiFetchPaginated<Project>("/projects", { limit: 100 }),
    []
  );

  const { data, loading, reload } = useFetch(fetchProjects, [], { toastOnError: true });
  const projects = data?.data ?? [];

  async function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      toast.success("Project created");
      setOpen(false);
      setName("");
      setDescription("");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 animate-panel-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Portfolio</p>
          <h1 className="mt-2 text-3xl font-semibold">Projects</h1>
        </div>
        {canCreate ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Create project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Creating..." : "Create project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium">No projects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a project to assign members and add tasks.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const total = project.totalTasks ?? 0;
            const done = project.completedTasks ?? 0;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="mono-hover h-full transition-colors">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || "No description"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono uppercase">{project.status}</span>
                      <span className="font-mono">
                        {done}/{total} tasks
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-sm bg-secondary">
                      <div
                        className="h-full rounded-sm bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}