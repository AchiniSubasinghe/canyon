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

  return (
    <div className="space-y-8 animate-panel-in">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Work</p>
        <h1 className="mt-2 text-3xl font-semibold">Tasks</h1>
        <p className="mt-1 text-muted-foreground">
          All tasks visible to your role, with status and priority filters.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-40">
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
          <CardTitle>
            {loading ? "Loading..." : `${data?.total ?? tasks.length} tasks`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : <TaskTable tasks={tasks} />}
        </CardContent>
      </Card>
    </div>
  );
}