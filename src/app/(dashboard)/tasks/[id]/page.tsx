"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPriority, formatStatus, priorityVariant, statusVariant } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import type { Task } from "@/lib/types";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = Number(params.id);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Task>(`/tasks/${taskId}`)
      .then(setTask)
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!task) return <p className="text-muted-foreground">Task not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-panel-in">
      <div>
        <Link
          href={`/projects/${task.projectId}`}
          className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Back to project
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">{task.title}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">Task #{task.id}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          <TaskStatusSelect task={task} onUpdated={setTask} />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {task.description || "No description provided."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant={statusVariant(task.status)}>{formatStatus(task.status)}</Badge>
            <Badge variant={priorityVariant(task.priority)}>
              {formatPriority(task.priority)}
            </Badge>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-xs uppercase text-muted-foreground">Assignee</dt>
              <dd className="mt-1">{task.assigneeName ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase text-muted-foreground">Due date</dt>
              <dd className="mt-1 font-mono">{task.dueDate ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase text-muted-foreground">Updated</dt>
              <dd className="mt-1 font-mono text-sm">
                {new Date(task.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}