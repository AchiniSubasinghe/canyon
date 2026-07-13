"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { TaskDeleteButton } from "@/components/tasks/task-delete-button";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatPriority, formatStatus, priorityVariant, statusVariant } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { useFetch } from "@/lib/hooks/use-fetch";
import type { AssignableUser, Task } from "@/lib/types";

interface TaskPageData {
  task: Task;
  assignees: AssignableUser[];
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = Number(params.id);
  const { isAdmin, isProjectManager } = useAuth();
  const canManage = isAdmin || isProjectManager;

  const fetchPage = useCallback(async (): Promise<TaskPageData> => {
    const task = await apiFetch<Task>(`/tasks/${taskId}`);
    const assignees = await apiFetch<AssignableUser[]>(
      `/projects/${task.projectId}/assignable-users`
    );
    return { task, assignees };
  }, [taskId]);

  const { data, loading, error, setData } = useFetch(fetchPage, [taskId], {
    toastOnError: true,
  });

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) {
    return <p className="text-muted-foreground">{error ?? "Task not found."}</p>;
  }

  const { task, assignees } = data;

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
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Details</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <TaskEditDialog
              task={task}
              assignees={assignees}
              onUpdated={(updated) =>
                setData((prev) => (prev ? { ...prev, task: updated } : prev))
              }
            />
            {canManage ? (
              <TaskDeleteButton taskId={task.id} projectId={task.projectId} />
            ) : null}
            <TaskStatusSelect
              task={task}
              onUpdated={(updated) =>
                setData((prev) => (prev ? { ...prev, task: updated } : prev))
              }
            />
          </div>
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