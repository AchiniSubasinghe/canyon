"use client";

import { useCallback, useState } from "react";
import { TaskTable } from "@/components/tasks/task-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPriority, formatStatus } from "@/lib/format";
import { apiFetchPaginated } from "@/lib/api";
import { useFetch } from "@/lib/hooks/use-fetch";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";

const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const fetchTasks = useCallback(
    () =>
      apiFetchPaginated<Task>("/tasks", {
        limit: 100,
        status: statusFilter === "all" ? undefined : (statusFilter as TaskStatus),
        priority: priorityFilter === "all" ? undefined : (priorityFilter as TaskPriority),
      }),
    [statusFilter, priorityFilter]
  );

  const { data, loading } = useFetch(fetchTasks, [statusFilter, priorityFilter], {
    toastOnError: true,
  });

  const tasks = data?.data ?? [];
  const hasFilters = statusFilter !== "all" || priorityFilter !== "all";

  return (
    <div className="space-y-8 animate-panel-in">
      <div>
        <p className="page-kicker">Work</p>
        <h1 className="page-title">Tasks</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          All tasks visible to your role, with status and priority filters.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-md border border-border bg-card px-4 py-4 shadow-[var(--shadow-panel)]">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {priorities.map((p) => (
                <SelectItem key={p} value={p}>
                  {formatPriority(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="tabular">
            {loading ? "Loading..." : `${data?.total ?? tasks.length} tasks`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <TaskTable
              tasks={tasks}
              emptyTitle={hasFilters ? "No matching tasks" : undefined}
              emptyDescription={
                hasFilters
                  ? "Try clearing filters to see more work."
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
