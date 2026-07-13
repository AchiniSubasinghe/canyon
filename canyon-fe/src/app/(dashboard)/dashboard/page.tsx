"use client";

import { CheckCircle2, FolderKanban, ListTodo } from "lucide-react";
import { useCallback } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TaskTable } from "@/components/tasks/task-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { apiFetchPaginated } from "@/lib/api";
import { useFetch } from "@/lib/hooks/use-fetch";
import type { Project, Task } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    const [projectsRes, tasksRes] = await Promise.all([
      apiFetchPaginated<Project>("/projects", { limit: 100 }),
      apiFetchPaginated<Task>("/tasks", { limit: 8 }),
    ]);
    return { projects: projectsRes.data, tasks: tasksRes.data };
  }, []);

  const { data, loading } = useFetch(fetchData, [], { toastOnError: true });

  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];
  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-8 animate-panel-in">
      <div>
        <p className="page-kicker">Overview</p>
        <h1 className="page-title">Welcome back, {user?.name.split(" ")[0]}</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Your projects and open work at a glance.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2">
          <Skeleton className="h-48 md:row-span-2" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2">
          <MetricCard
            title="Open tasks"
            value={openTasks}
            hint="Needs attention"
            featured
            icon={<ListTodo className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
          />
          <MetricCard
            title="Projects"
            value={projects.length}
            hint="Active portfolio"
            icon={<FolderKanban className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
          />
          <MetricCard
            title="Completed"
            value={completedTasks}
            hint="Delivered work"
            icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : <TaskTable tasks={tasks} />}
        </CardContent>
      </Card>
    </div>
  );
}
